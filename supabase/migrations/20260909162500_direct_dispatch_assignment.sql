-- FIELDOPS DIRECT DISPATCH ASSIGNMENT V1
-- Dispatcher/Admin assignment is final immediately. There is no technician
-- Accept/Reject step in the normal FieldOps workflow.

begin;
-- Existing pending assignments were created under the earlier acceptance model.
-- Under the new workflow they become final assignments immediately.
update public.work_order_assignments
set
  assignment_status = 'accepted',
  accepted_at = coalesce(accepted_at, assigned_at, updated_at),
  pending_activity_type = null,
  updated_at = pg_catalog.now()
where assignment_status = 'assigned'
  and assignment_role = 'primary'
  and released_at is null;
create or replace function public.fieldops_reassign_work_order(
  p_work_order_id uuid,
  p_from_assignment_id uuid,
  p_to_technician_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_assignment public.work_order_assignments%rowtype;
  target_assignment public.work_order_assignments%rowtype;
  previous_activity text;
  old_status text;
  conflict_id uuid;
  current_open_work uuid;
  target_is_technician boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    select private.has_any_role(
      array['admin','manager','dispatcher']::text[]
    )
  ) then
    raise exception 'Only operations staff can assign or transfer work.';
  end if;

  if p_scheduled_start is null or p_scheduled_end is null then
    raise exception 'Scheduled start and end are required.';
  end if;

  if p_scheduled_end <= p_scheduled_start then
    raise exception 'Scheduled end must be later than scheduled start.';
  end if;

  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p
      on p.id = ur.user_id
    where ur.user_id = p_to_technician_id
      and ur.role = 'technician'
      and p.active = true
  ) into target_is_technician;

  if not target_is_technician then
    raise exception 'Target user is not an active technician.';
  end if;

  select wo.status
  into old_status
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'Work order not found.';
  end if;

  if old_status in ('finished','billing_ready','closed','cancelled') then
    raise exception 'A finished, billing-ready, closed, or cancelled work order cannot receive a normal dispatch assignment.';
  end if;

  if p_from_assignment_id is not null then
    select *
    into old_assignment
    from public.work_order_assignments
    where id = p_from_assignment_id
      and work_order_id = p_work_order_id
      and assignment_status not in ('removed','declined','completed')
    for update;

    if not found then
      raise exception 'The source assignment is no longer active.';
    end if;
  end if;

  -- Same technician = schedule change only.
  if p_from_assignment_id is not null
     and old_assignment.technician_id = p_to_technician_id then
    update public.work_order_assignments
    set
      assignment_status = 'accepted',
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      accepted_at = coalesce(accepted_at, assigned_at, p_at),
      released_at = null,
      pending_activity_type = null,
      updated_at = pg_catalog.now()
    where id = old_assignment.id
    returning * into target_assignment;

    update public.work_orders
    set
      status = 'assigned',
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      updated_at = pg_catalog.now()
    where id = p_work_order_id;

    insert into public.work_order_events (
      work_order_id,
      event_type,
      old_status,
      new_status,
      details
    ) values (
      p_work_order_id,
      'assignment_rescheduled',
      old_status,
      'assigned',
      jsonb_build_object(
        'assignment_id', target_assignment.id,
        'technician_id', p_to_technician_id,
        'scheduled_start', p_scheduled_start,
        'scheduled_end', p_scheduled_end,
        'acceptance_required', false
      )
    );

    return jsonb_build_object(
      'assignment_id', target_assignment.id,
      'mode', 'rescheduled',
      'assignment_final', true,
      'acceptance_required', false
    );
  end if;

  -- Scheduled conflict protection.
  select a.id
  into conflict_id
  from public.work_order_assignments a
  where a.technician_id = p_to_technician_id
    and a.work_order_id <> p_work_order_id
    and a.assignment_status not in ('declined','removed','completed')
    and a.scheduled_start < p_scheduled_end
    and a.scheduled_end > p_scheduled_start
  limit 1;

  if conflict_id is not null then
    raise exception 'Target technician already has another assignment during this time.';
  end if;

  select e.id
  into conflict_id
  from public.technician_schedule_events e
  where e.technician_id = p_to_technician_id
    and e.starts_at < p_scheduled_end
    and e.ends_at > p_scheduled_start
  limit 1;

  if conflict_id is not null then
    raise exception 'Target technician has another schedule event during this time.';
  end if;

  -- If assigning into the present, do not silently overlap an active clock.
  if p_scheduled_start <= p_at then
    select te.work_order_id
    into current_open_work
    from public.time_entries te
    where te.technician_id = p_to_technician_id
      and te.ended_at is null
      and te.work_order_id <> p_work_order_id
    limit 1;

    if current_open_work is not null then
      raise exception 'Target technician is currently active on another work order and is unavailable.';
    end if;
  end if;

  -- Reassignment preserves the old technician's history and closes any
  -- active actual-time segment at the transfer moment.
  if p_from_assignment_id is not null then
    previous_activity := private.fieldops_close_open_time(
      p_work_order_id,
      old_assignment.technician_id,
      p_at,
      'reassigned'
    );

    update public.work_order_assignments
    set
      assignment_status = 'removed',
      released_at = p_at,
      pending_activity_type = null,
      updated_at = pg_catalog.now()
    where id = old_assignment.id;
  end if;

  -- New dispatcher assignment is FINAL immediately.
  insert into public.work_order_assignments (
    work_order_id,
    technician_id,
    assignment_role,
    assignment_status,
    scheduled_start,
    scheduled_end,
    assigned_by,
    assigned_at,
    accepted_at,
    released_at,
    pending_activity_type
  ) values (
    p_work_order_id,
    p_to_technician_id,
    'primary',
    'accepted',
    p_scheduled_start,
    p_scheduled_end,
    (select auth.uid()),
    p_at,
    p_at,
    null,
    null
  )
  on conflict (work_order_id, technician_id)
  do update set
    assignment_role = 'primary',
    assignment_status = 'accepted',
    scheduled_start = excluded.scheduled_start,
    scheduled_end = excluded.scheduled_end,
    assigned_by = excluded.assigned_by,
    assigned_at = excluded.assigned_at,
    accepted_at = excluded.accepted_at,
    released_at = null,
    pending_activity_type = null,
    updated_at = pg_catalog.now()
  returning * into target_assignment;

  update public.work_orders
  set
    status = 'assigned',
    scheduled_start = p_scheduled_start,
    scheduled_end = p_scheduled_end,
    updated_at = pg_catalog.now()
  where id = p_work_order_id;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    case
      when p_from_assignment_id is null
        then 'technician_assigned'
      else 'technician_reassigned'
    end,
    old_status,
    'assigned',
    jsonb_build_object(
      'from_assignment_id', p_from_assignment_id,
      'from_technician_id', case
        when p_from_assignment_id is null then null
        else old_assignment.technician_id
      end,
      'to_assignment_id', target_assignment.id,
      'to_technician_id', p_to_technician_id,
      'scheduled_start', p_scheduled_start,
      'scheduled_end', p_scheduled_end,
      'previous_actual_activity', previous_activity,
      'assignment_final', true,
      'acceptance_required', false
    )
  );

  return jsonb_build_object(
    'assignment_id', target_assignment.id,
    'mode', case
      when p_from_assignment_id is null then 'assigned'
      else 'transferred'
    end,
    'assignment_final', true,
    'acceptance_required', false,
    'previous_actual_activity', previous_activity
  );
end;
$$;
-- Legacy RPC remains harmless/idempotent for older clients, but the current
-- FieldOps UI no longer calls it. New assignments are already accepted/final.

commit;
