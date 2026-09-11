-- FIELDOPS AUTOMATIC FIELD FLOW V1
-- Approved workflow:
-- Dispatch/Claim -> Travelling <-> Waiting -> Working <-> Waiting -> Finished -> Billing Ready (automatic)
-- GPS arrival is intentionally NOT implemented here; Travelling -> Working remains a technician/operations action
-- until vehicle/location telemetry is available.

begin;

-- Future assignments can be armed to start Travel automatically at their planned start.
-- Existing assignments are deliberately left NULL so deployment never invents travel time
-- for older/overdue jobs.
alter table public.work_order_assignments
  add column if not exists auto_start_travel_at timestamptz;

create index if not exists idx_work_order_assignments_auto_start_travel
  on public.work_order_assignments(auto_start_travel_at)
  where auto_start_travel_at is not null
    and assignment_status = 'accepted'
    and released_at is null;

-- Technicians need read access to genuinely unassigned work so they can self-claim it.
-- The helper is SECURITY DEFINER so RLS on assignments cannot make another technician's
-- assignment look invisible/claimable.
create or replace function private.fieldops_has_active_primary_assignment(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.work_order_assignments a
    where a.work_order_id=target_work_order_id
      and a.assignment_role='primary'
      and a.assignment_status not in ('removed','declined','completed')
      and a.released_at is null
  );
$$;

revoke all on function private.fieldops_has_active_primary_assignment(uuid) from public;
grant execute on function private.fieldops_has_active_primary_assignment(uuid) to authenticated;

drop policy if exists fieldops_work_orders_technician_claimable_select on public.work_orders;
create policy fieldops_work_orders_technician_claimable_select
on public.work_orders for select
to authenticated
using (
  (select private.has_any_role(array['technician']::text[]))
  and status in ('requested','planned','assigned')
  and not (select private.fieldops_has_active_primary_assignment(id))
);

-- ============================================================
-- NORMAL LIFECYCLE
-- On Site remains supported only for older records. New normal work skips it.
-- ============================================================

create or replace function private.fieldops_normal_transition_allowed(p_old text,p_new text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_old
    when 'requested' then p_new in ('planned','cancelled')
    when 'planned' then p_new in ('cancelled') -- assignment RPC moves Planned -> Assigned/Travelling
    when 'assigned' then p_new in ('travelling','cancelled')
    when 'travelling' then p_new in ('waiting','working','cancelled')
    -- Backward-compatible only. New workflow no longer requires On Site.
    when 'on_site' then p_new in ('working','waiting','finished','cancelled')
    when 'working' then p_new in ('waiting','finished','cancelled')
    when 'waiting' then p_new in ('travelling','working','finished','cancelled')
    when 'finished' then p_new in ('billing_ready','closed')
    when 'billing_ready' then p_new in ('closed')
    else false
  end;
$$;

-- ============================================================
-- DISPATCH / TRANSFER
-- New immediate assignments start Travel automatically.
-- Future assignments are armed for their scheduled start.
-- Active transfers preserve the current operational activity.
-- ============================================================

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
  resume_activity text;
  waiting_resume_activity text;
  old_status text;
  next_status text;
  conflict_id uuid;
  current_open_work uuid;
  target_is_technician boolean;
  should_start_travel boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','dispatcher']::text[])) then
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
    join public.profiles p on p.id = ur.user_id
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

  -- Same technician means schedule change, not a transfer.
  if p_from_assignment_id is not null
     and old_assignment.technician_id = p_to_technician_id then

    next_status := old_status;

    if old_status = 'assigned' and p_scheduled_start <= p_at then
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

      if not exists (
        select 1 from public.time_entries te
        where te.work_order_id = p_work_order_id
          and te.technician_id = p_to_technician_id
          and te.ended_at is null
      ) then
        insert into public.time_entries(
          work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes
        ) values (
          p_work_order_id,p_to_technician_id,old_assignment.id,p_at,'travel',true,
          'auto_dispatch_start','Travel started automatically when the assignment became active.'
        );
      end if;

      next_status := 'travelling';
    end if;

    update public.work_order_assignments
    set assignment_status = 'accepted',
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        accepted_at = coalesce(accepted_at, assigned_at, p_at),
        released_at = null,
        auto_start_travel_at = case
          when next_status = 'assigned' and p_scheduled_start > p_at then p_scheduled_start
          else null
        end,
        updated_at = pg_catalog.now()
    where id = old_assignment.id
    returning * into target_assignment;

    update public.work_orders
    set status = next_status,
        scheduled_start = p_scheduled_start,
        scheduled_end = p_scheduled_end,
        updated_at = pg_catalog.now()
    where id = p_work_order_id;

    insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
    values (
      p_work_order_id,
      'assignment_rescheduled',
      old_status,
      next_status,
      jsonb_build_object(
        'assignment_id',target_assignment.id,
        'technician_id',p_to_technician_id,
        'scheduled_start',p_scheduled_start,
        'scheduled_end',p_scheduled_end,
        'travel_started_automatically',next_status='travelling',
        'auto_start_travel_at',target_assignment.auto_start_travel_at,
        'acceptance_required',false
      )
    );

    return jsonb_build_object(
      'assignment_id',target_assignment.id,
      'mode','rescheduled',
      'assignment_final',true,
      'acceptance_required',false,
      'status',next_status,
      'travel_started_automatically',next_status='travelling',
      'auto_start_travel_at',target_assignment.auto_start_travel_at
    );
  end if;

  -- If the new technician must start/resume now, never overlap another open clock.
  if p_scheduled_start <= p_at or (p_from_assignment_id is not null and old_status <> 'assigned') then
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

  -- Preserve the previous technician's history and carry the active stage forward.
  if p_from_assignment_id is not null then
    previous_activity := private.fieldops_close_open_time(
      p_work_order_id,
      old_assignment.technician_id,
      p_at,
      'reassigned'
    );

    if previous_activity in ('travel','on_site','work','waiting') then
      resume_activity := previous_activity;
    else
      resume_activity := null;
    end if;

    if previous_activity = 'waiting' then
      waiting_resume_activity := old_assignment.pending_activity_type;
    end if;

    update public.work_order_assignments
    set assignment_status = 'removed',
        released_at = p_at,
        auto_start_travel_at = null,
        updated_at = pg_catalog.now()
    where id = old_assignment.id;
  end if;

  should_start_travel :=
    resume_activity is null
    and (
      p_scheduled_start <= p_at
      or (p_from_assignment_id is not null and old_status <> 'assigned')
    );

  next_status := case
    when resume_activity is not null then private.fieldops_status_for_activity(resume_activity)
    when should_start_travel then 'travelling'
    else 'assigned'
  end;

  insert into public.work_order_assignments(
    work_order_id,technician_id,assignment_role,assignment_status,
    scheduled_start,scheduled_end,assigned_by,assigned_at,accepted_at,
    released_at,pending_activity_type,auto_start_travel_at
  ) values (
    p_work_order_id,p_to_technician_id,'primary','accepted',
    p_scheduled_start,p_scheduled_end,auth.uid(),p_at,p_at,
    null,
    case when resume_activity='waiting' then waiting_resume_activity else null end,
    case when next_status='assigned' and p_scheduled_start>p_at then p_scheduled_start else null end
  )
  on conflict (work_order_id,technician_id)
  do update set
    assignment_role='primary',
    assignment_status='accepted',
    scheduled_start=excluded.scheduled_start,
    scheduled_end=excluded.scheduled_end,
    assigned_by=excluded.assigned_by,
    assigned_at=excluded.assigned_at,
    accepted_at=excluded.accepted_at,
    released_at=null,
    pending_activity_type=excluded.pending_activity_type,
    auto_start_travel_at=excluded.auto_start_travel_at,
    updated_at=pg_catalog.now()
  returning * into target_assignment;

  if resume_activity is not null then
    insert into public.time_entries(
      work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes
    ) values (
      p_work_order_id,p_to_technician_id,target_assignment.id,p_at,resume_activity,
      resume_activity not in ('waiting','break'),
      'direct_transfer_resume','Actual time resumed automatically when the job was transferred.'
    );
  elsif should_start_travel then
    insert into public.time_entries(
      work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes
    ) values (
      p_work_order_id,p_to_technician_id,target_assignment.id,p_at,'travel',true,
      'auto_dispatch_start','Travel started automatically when the assignment became active.'
    );
  end if;

  update public.work_orders
  set status = next_status,
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      updated_at = pg_catalog.now()
  where id = p_work_order_id;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values (
    p_work_order_id,
    case when p_from_assignment_id is null then 'technician_assigned' else 'technician_reassigned' end,
    old_status,
    next_status,
    jsonb_build_object(
      'from_assignment_id',p_from_assignment_id,
      'from_technician_id',case when p_from_assignment_id is null then null else old_assignment.technician_id end,
      'to_assignment_id',target_assignment.id,
      'to_technician_id',p_to_technician_id,
      'scheduled_start',p_scheduled_start,
      'scheduled_end',p_scheduled_end,
      'previous_actual_activity',previous_activity,
      'resumed_actual_activity',resume_activity,
      'travel_started_automatically',should_start_travel,
      'auto_start_travel_at',target_assignment.auto_start_travel_at,
      'assignment_final',true,
      'acceptance_required',false
    )
  );

  return jsonb_build_object(
    'assignment_id',target_assignment.id,
    'mode',case when p_from_assignment_id is null then 'assigned' else 'transferred' end,
    'assignment_final',true,
    'acceptance_required',false,
    'status',next_status,
    'previous_actual_activity',previous_activity,
    'resumed_actual_activity',resume_activity,
    'travel_started_automatically',should_start_travel,
    'auto_start_travel_at',target_assignment.auto_start_travel_at
  );
end;
$$;

-- ============================================================
-- TECHNICIAN SELF-CLAIM
-- Claiming a waiting job is an immediate operational action, so Travel starts now.
-- ============================================================

create or replace function public.fieldops_claim_work_order(
  p_work_order_id uuid,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  technician_id uuid := auth.uid();
  wo public.work_orders%rowtype;
  assignment public.work_order_assignments%rowtype;
  duration_minutes integer;
  planned_end timestamptz;
  conflict_id uuid;
begin
  if technician_id is null then raise exception 'Authentication required.'; end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id=ur.user_id
    where ur.user_id=technician_id and ur.role='technician' and p.active=true
  ) then
    raise exception 'Only an active technician can claim waiting work.';
  end if;

  select * into wo
  from public.work_orders
  where id=p_work_order_id
  for update;

  if not found then raise exception 'Work order not found.'; end if;
  if wo.status not in ('requested','planned','assigned') then
    raise exception 'Only waiting/unassigned work can be claimed.';
  end if;

  if exists (
    select 1 from public.work_order_assignments a
    where a.work_order_id=wo.id
      and a.assignment_role='primary'
      and a.assignment_status not in ('removed','declined','completed')
      and a.released_at is null
  ) then
    raise exception 'This work order has already been assigned.';
  end if;

  if exists (
    select 1 from public.time_entries te
    where te.technician_id=technician_id and te.ended_at is null
  ) then
    raise exception 'Finish, wait, or transfer your current active work before claiming another job.';
  end if;

  duration_minutes := greatest(coalesce(wo.estimated_duration_minutes,60),15);
  planned_end := p_at + make_interval(mins => duration_minutes);

  select a.id into conflict_id
  from public.work_order_assignments a
  where a.technician_id=technician_id
    and a.work_order_id<>wo.id
    and a.assignment_status not in ('removed','declined','completed')
    and a.scheduled_start < planned_end
    and a.scheduled_end > p_at
  limit 1;

  if conflict_id is not null then
    raise exception 'You already have another assignment during this time.';
  end if;

  select e.id into conflict_id
  from public.technician_schedule_events e
  where e.technician_id=technician_id
    and e.starts_at < planned_end
    and e.ends_at > p_at
  limit 1;

  if conflict_id is not null then
    raise exception 'Your schedule has another event during this time.';
  end if;

  insert into public.work_order_assignments(
    work_order_id,technician_id,assignment_role,assignment_status,
    scheduled_start,scheduled_end,assigned_by,assigned_at,accepted_at,
    released_at,pending_activity_type,auto_start_travel_at
  ) values (
    wo.id,technician_id,'primary','accepted',p_at,planned_end,
    technician_id,p_at,p_at,null,null,null
  )
  on conflict (work_order_id,technician_id)
  do update set
    assignment_role='primary',assignment_status='accepted',
    scheduled_start=excluded.scheduled_start,scheduled_end=excluded.scheduled_end,
    assigned_by=excluded.assigned_by,assigned_at=excluded.assigned_at,
    accepted_at=excluded.accepted_at,released_at=null,pending_activity_type=null,
    auto_start_travel_at=null,updated_at=pg_catalog.now()
  returning * into assignment;

  insert into public.time_entries(
    work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes
  ) values (
    wo.id,technician_id,assignment.id,p_at,'travel',true,
    'technician_self_claim','Travel started automatically when the technician claimed the work.'
  );

  update public.work_orders
  set status='travelling',
      scheduled_start=p_at,
      scheduled_end=planned_end,
      updated_at=pg_catalog.now()
  where id=wo.id;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values (
    wo.id,'technician_self_claimed',wo.status,'travelling',
    jsonb_build_object(
      'assignment_id',assignment.id,
      'technician_id',technician_id,
      'claimed_at',p_at,
      'travel_started_automatically',true,
      'acceptance_required',false
    )
  );

  return jsonb_build_object(
    'work_order_id',wo.id,
    'assignment_id',assignment.id,
    'status','travelling',
    'travel_started_automatically',true
  );
end;
$$;

-- ============================================================
-- FUTURE ASSIGNMENT AUTO-START
-- Safe to call repeatedly. It starts only armed, due, still-Assigned jobs.
-- ============================================================

create or replace function public.fieldops_start_due_assignments(
  p_at timestamptz default pg_catalog.now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due record;
  open_other uuid;
  open_activity text;
  started_count integer := 0;
begin
  -- Clear stale arms when the Work Order has already moved on by another action.
  update public.work_order_assignments a
  set auto_start_travel_at=null,updated_at=pg_catalog.now()
  where a.auto_start_travel_at is not null
    and exists (
      select 1 from public.work_orders wo
      where wo.id=a.work_order_id and wo.status<>'assigned'
    );

  for due in
    select a.id as assignment_id,a.work_order_id,a.technician_id,a.auto_start_travel_at
    from public.work_order_assignments a
    join public.work_orders wo on wo.id=a.work_order_id
    where a.assignment_role='primary'
      and a.assignment_status='accepted'
      and a.released_at is null
      and a.auto_start_travel_at is not null
      and a.auto_start_travel_at <= p_at
      and wo.status='assigned'
    order by a.auto_start_travel_at,a.assigned_at
    for update of a,wo skip locked
  loop
    select te.work_order_id into open_other
    from public.time_entries te
    where te.technician_id=due.technician_id
      and te.ended_at is null
      and te.work_order_id<>due.work_order_id
    limit 1;

    if open_other is not null then
      -- Do not fabricate overlapping actual time. Leave it armed and retry later.
      continue;
    end if;

    select te.activity_type into open_activity
    from public.time_entries te
    where te.technician_id=due.technician_id
      and te.work_order_id=due.work_order_id
      and te.ended_at is null
    order by te.started_at desc
    limit 1;

    if open_activity is not null then
      update public.work_order_assignments
      set auto_start_travel_at=null,updated_at=pg_catalog.now()
      where id=due.assignment_id;

      update public.work_orders
      set status=private.fieldops_status_for_activity(open_activity),updated_at=pg_catalog.now()
      where id=due.work_order_id and status='assigned';

      continue;
    end if;

    insert into public.time_entries(
      work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes
    ) values (
      due.work_order_id,due.technician_id,due.assignment_id,p_at,'travel',true,
      'auto_scheduled_start','Travel started automatically when the scheduled assignment became active.'
    );

    update public.work_order_assignments
    set auto_start_travel_at=null,updated_at=pg_catalog.now()
    where id=due.assignment_id;

    update public.work_orders
    set status='travelling',updated_at=pg_catalog.now()
    where id=due.work_order_id;

    insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
    values (
      due.work_order_id,'travel_auto_started','assigned','travelling',
      jsonb_build_object(
        'assignment_id',due.assignment_id,
        'technician_id',due.technician_id,
        'scheduled_start',due.auto_start_travel_at,
        'actual_start',p_at
      )
    );

    started_count := started_count + 1;
  end loop;

  return started_count;
end;
$$;

-- ============================================================
-- STATUS TRANSITIONS + AUTOMATIC BILLING HANDOFF
-- Finished is the field action; Billing Ready is the immediate system result.
-- ============================================================

create or replace function public.fieldops_transition_work_order_status(
  p_work_order_id uuid,
  p_new_status text,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  old_billing_status text;
  activity text;
  previous_activity text;
  effective_status text;
  a public.work_order_assignments%rowtype;
  open_other uuid;
  can_manage boolean;
  approved_count integer := 0;
  draft_invoice_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_new_status not in ('requested','planned','assigned','travelling','on_site','working','waiting','finished','billing_ready','closed','cancelled') then
    raise exception 'Unsupported work-order status: %',p_new_status;
  end if;

  select wo.status,wo.billing_status into old_status,old_billing_status
  from public.work_orders wo where wo.id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;

  can_manage := (select private.has_any_role(array['admin','manager','dispatcher']::text[]));
  if not can_manage and not (select private.is_assigned_to_work_order(p_work_order_id)) then
    raise exception 'You are not authorized to change this work order.';
  end if;
  if p_new_status=old_status then return jsonb_build_object('status',old_status,'changed',false); end if;

  if not private.fieldops_normal_transition_allowed(old_status,p_new_status) then
    raise exception 'Invalid Work Order transition: % -> %. Use the normal lifecycle or an Admin Override.',old_status,p_new_status;
  end if;

  if p_new_status='billing_ready' and old_status<>'finished' then
    raise exception 'Only a Finished Work Order can become Billing Ready.';
  end if;

  if p_new_status='closed' then
    if old_billing_status not in ('billed','waived') then
      raise exception 'Work Order cannot close until Billing is Billed or Waived / No Charge.';
    end if;
    if exists(select 1 from public.assets x where x.current_work_order_id=p_work_order_id) then
      raise exception 'Work Order still has one or more Assets assigned to it. Transfer or resolve those Assets before closing.';
    end if;
  end if;

  activity := private.fieldops_activity_for_status(p_new_status);

  if activity is not null then
    select * into a
    from public.work_order_assignments
    where work_order_id=p_work_order_id
      and assignment_status='accepted'
      and assignment_role='primary'
      and released_at is null
    order by accepted_at desc nulls last,assigned_at desc
    limit 1 for update;

    if not found then
      raise exception 'An active primary technician assignment is required before the job can enter %.',p_new_status;
    end if;
    if not can_manage and a.technician_id<>auth.uid() then
      raise exception 'Only the active primary technician can start this activity.';
    end if;

    select te.work_order_id into open_other
    from public.time_entries te
    where te.technician_id=a.technician_id and te.ended_at is null and te.work_order_id<>p_work_order_id
    limit 1;
    if open_other is not null then
      raise exception 'Technician is still active on another work order and is not available.';
    end if;

    previous_activity := private.fieldops_close_open_time(p_work_order_id,a.technician_id,p_at,'status_change');

    -- Waiting remembers whether it paused Travel or Work so a transfer/resume keeps context.
    if p_new_status='waiting' then
      update public.work_order_assignments
      set pending_activity_type = case
        when previous_activity in ('travel','work') then previous_activity
        when old_status='travelling' then 'travel'
        when old_status='working' then 'work'
        else pending_activity_type
      end,
      auto_start_travel_at=null,
      updated_at=pg_catalog.now()
      where id=a.id;
    else
      update public.work_order_assignments
      set pending_activity_type=null,auto_start_travel_at=null,updated_at=pg_catalog.now()
      where id=a.id;
    end if;

    insert into public.time_entries(work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes)
    values(
      p_work_order_id,a.technician_id,a.id,p_at,activity,
      activity not in ('waiting','break'),
      'status_transition','Actual time created by work-order status transition.'
    );
  else
    update public.time_entries te
    set ended_at=greatest(p_at,te.started_at),
        ended_reason=case
          when p_new_status='finished' then 'finished'
          when p_new_status='billing_ready' then 'billing_ready'
          when p_new_status='closed' then 'closed'
          when p_new_status='cancelled' then 'cancelled'
          else 'status_change'
        end
    where te.work_order_id=p_work_order_id and te.ended_at is null;
  end if;

  effective_status := case when p_new_status='finished' then 'billing_ready' else p_new_status end;

  -- Finished is the single operational handoff. Ensure older rows have rate snapshots,
  -- approve completed actual time, and make Billing Ready without a second dispatcher click.
  if p_new_status in ('finished','billing_ready') then
    update public.time_entries te
    set billing_rate=coalesce(te.billing_rate,tc.billing_rate),
        pay_rate=coalesce(te.pay_rate,tc.pay_rate)
    from public.technician_compensation tc
    where te.work_order_id=p_work_order_id
      and te.technician_id=tc.technician_id
      and te.ended_at is not null
      and (te.billing_rate is null or te.pay_rate is null);

    update public.time_entries
    set approval_status='approved',
        approved_by=coalesce(approved_by,auth.uid()),
        approved_at=coalesce(approved_at,p_at)
    where work_order_id=p_work_order_id
      and ended_at is not null
      and approval_status='pending';
    get diagnostics approved_count = row_count;
  end if;

  update public.work_orders
  set status=effective_status,
      completed_at=case when p_new_status in ('finished','billing_ready','closed') then coalesce(completed_at,p_at) else completed_at end,
      billing_status=case
        when p_new_status in ('finished','billing_ready') then
          case when old_billing_status in ('billed','waived','review_required') then old_billing_status else 'ready' end
        else billing_status
      end,
      billing_ready_at=case when p_new_status in ('finished','billing_ready') then coalesce(billing_ready_at,p_at) else billing_ready_at end,
      closed_at=case when p_new_status='closed' then coalesce(closed_at,p_at) else closed_at end,
      updated_at=pg_catalog.now()
  where id=p_work_order_id;

  if p_new_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set assignment_status='completed',
        pending_activity_type=null,
        auto_start_travel_at=null,
        updated_at=pg_catalog.now()
    where work_order_id=p_work_order_id and assignment_status='accepted';
  end if;

  if p_new_status='finished' then
    insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
    values(
      p_work_order_id,'status_change',old_status,'finished',
      jsonb_build_object(
        'actual_time_activity',activity,
        'transition_at',p_at,
        'approved_time_entries',approved_count,
        'automatic_billing_handoff',true
      )
    );

    insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
    values(
      p_work_order_id,'billing_ready_auto','finished','billing_ready',
      jsonb_build_object(
        'billing_status',case when old_billing_status in ('billed','waived','review_required') then old_billing_status else 'ready' end,
        'billing_ready_at',p_at,
        'triggered_by',auth.uid(),
        'source','finished'
      )
    );
  else
    insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
    values(
      p_work_order_id,'status_change',old_status,effective_status,
      jsonb_build_object(
        'actual_time_activity',activity,
        'transition_at',p_at,
        'approved_time_entries',approved_count,
        'billing_status',case when p_new_status='billing_ready' then case when old_billing_status in ('billed','waived','review_required') then old_billing_status else 'ready' end else old_billing_status end
      )
    );
  end if;

  -- If a Draft somehow already exists (including older demo data), refresh it now.
  if p_new_status in ('finished','billing_ready') then
    for draft_invoice_id in
      select i.id from public.invoices i
      where i.work_order_id=p_work_order_id and i.status='draft'
    loop
      perform private.fieldops_sync_invoice_source_lines(draft_invoice_id);
    end loop;
  end if;

  return jsonb_build_object(
    'status',effective_status,
    'requested_status',p_new_status,
    'changed',true,
    'activity_type',activity,
    'approved_time_entries',approved_count,
    'auto_billing_ready',p_new_status='finished'
  );
end;
$$;

-- Keep Admin Override exceptional, but preserve the invariant that Finished means Billing Ready.
create or replace function public.fieldops_admin_override_work_order_status(
  p_work_order_id uuid,
  p_new_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  billing_state text;
  effective_status text;
  approved_count integer := 0;
  draft_invoice_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin']::text[])) then raise exception 'Admin role required for status override.'; end if;
  if p_reason is null or length(btrim(p_reason))<5 then raise exception 'Override reason must be at least 5 characters.'; end if;
  if p_new_status not in ('requested','planned','assigned','travelling','on_site','working','waiting','finished','billing_ready','closed','cancelled') then raise exception 'Unsupported Work Order status.'; end if;

  select status,billing_status into old_status,billing_state from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if p_new_status='assigned' and not exists(
    select 1 from public.work_order_assignments a
    where a.work_order_id=p_work_order_id and a.assignment_role='primary'
      and a.assignment_status='accepted' and a.released_at is null
  ) then raise exception 'Assigned status requires an active primary technician. Use Assign Technician.'; end if;
  if p_new_status='billing_ready' and billing_state='billed' then raise exception 'A Billed Work Order cannot be moved back to Billing Ready. Void/reopen billing first if correction is required.'; end if;
  if p_new_status='closed' and billing_state not in ('billed','waived') then raise exception 'Even an Admin Override cannot close an unbilled Work Order. Bill it or Waive Billing first.'; end if;
  if p_new_status='closed' and exists(select 1 from public.assets x where x.current_work_order_id=p_work_order_id) then raise exception 'Resolve Assets assigned to this Work Order before closing.'; end if;

  if p_new_status in ('finished','billing_ready','closed','cancelled') then
    update public.time_entries
    set ended_at=greatest(pg_catalog.now(),started_at),ended_reason='admin_override'
    where work_order_id=p_work_order_id and ended_at is null;
  end if;

  if p_new_status in ('finished','billing_ready') then
    update public.time_entries te
    set billing_rate=coalesce(te.billing_rate,tc.billing_rate),
        pay_rate=coalesce(te.pay_rate,tc.pay_rate)
    from public.technician_compensation tc
    where te.work_order_id=p_work_order_id
      and te.technician_id=tc.technician_id
      and te.ended_at is not null
      and (te.billing_rate is null or te.pay_rate is null);

    update public.time_entries
    set approval_status='approved',approved_by=coalesce(approved_by,auth.uid()),approved_at=coalesce(approved_at,pg_catalog.now())
    where work_order_id=p_work_order_id and ended_at is not null and approval_status='pending';
    get diagnostics approved_count = row_count;
  end if;

  effective_status := case when p_new_status='finished' then 'billing_ready' else p_new_status end;

  update public.work_orders set
    status=effective_status,
    completed_at=case when p_new_status in ('finished','billing_ready','closed') then coalesce(completed_at,pg_catalog.now()) else null end,
    billing_status=case when p_new_status in ('finished','billing_ready') then case when billing_state in ('billed','waived','review_required') then billing_state else 'ready' end else billing_status end,
    billing_ready_at=case when p_new_status in ('finished','billing_ready') then coalesce(billing_ready_at,pg_catalog.now()) else billing_ready_at end,
    closed_at=case when p_new_status='closed' then coalesce(closed_at,pg_catalog.now()) else null end,
    updated_at=pg_catalog.now()
  where id=p_work_order_id;

  if p_new_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set assignment_status='completed',pending_activity_type=null,auto_start_travel_at=null,updated_at=pg_catalog.now()
    where work_order_id=p_work_order_id and assignment_status='accepted';
  end if;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(
    p_work_order_id,'admin_status_override',old_status,effective_status,
    jsonb_build_object(
      'requested_status',p_new_status,
      'reason',btrim(p_reason),
      'overridden_by',auth.uid(),
      'overridden_at',pg_catalog.now(),
      'approved_time_entries',approved_count,
      'automatic_billing_handoff',p_new_status='finished'
    )
  );

  if p_new_status in ('finished','billing_ready') then
    for draft_invoice_id in
      select i.id from public.invoices i where i.work_order_id=p_work_order_id and i.status='draft'
    loop
      perform private.fieldops_sync_invoice_source_lines(draft_invoice_id);
    end loop;
  end if;

  return jsonb_build_object(
    'status',effective_status,
    'requested_status',p_new_status,
    'changed',old_status is distinct from effective_status,
    'override',true,
    'auto_billing_ready',p_new_status='finished'
  );
end;
$$;

-- ============================================================
-- EXISTING DATA HANDOFF
-- Fix already-Finished/Billing-Ready jobs without touching old assignments' Travel clocks.
-- This also repairs existing Draft invoices that were $0 because time stayed Pending.
-- ============================================================

with pending_by_work_order as (
  select te.work_order_id,count(*)::integer as pending_count
  from public.time_entries te
  join public.work_orders wo on wo.id=te.work_order_id
  where wo.status in ('finished','billing_ready','closed')
    and te.ended_at is not null
    and te.approval_status='pending'
  group by te.work_order_id
)
insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
select p.work_order_id,'time_auto_approved_for_billing',wo.status,wo.status,
       jsonb_build_object('approved_time_entries',p.pending_count,'source','automatic_field_flow_migration')
from pending_by_work_order p
join public.work_orders wo on wo.id=p.work_order_id;

update public.time_entries te
set billing_rate=coalesce(te.billing_rate,tc.billing_rate),
    pay_rate=coalesce(te.pay_rate,tc.pay_rate)
from public.work_orders wo
join public.technician_compensation tc on true
where wo.id=te.work_order_id
  and tc.technician_id=te.technician_id
  and wo.status in ('finished','billing_ready','closed')
  and te.ended_at is not null
  and (te.billing_rate is null or te.pay_rate is null);

update public.time_entries te
set approval_status='approved',
    approved_at=coalesce(te.approved_at,wo.completed_at,wo.billing_ready_at,pg_catalog.now())
from public.work_orders wo
where wo.id=te.work_order_id
  and wo.status in ('finished','billing_ready','closed')
  and te.ended_at is not null
  and te.approval_status='pending';

-- Record and perform the new automatic handoff for Work Orders left at Finished.
insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
select wo.id,'billing_ready_auto','finished','billing_ready',
       jsonb_build_object('source','automatic_field_flow_migration','billing_ready_at',coalesce(wo.billing_ready_at,wo.completed_at,pg_catalog.now()))
from public.work_orders wo
where wo.status='finished';

update public.work_orders
set status='billing_ready',
    billing_status=case when billing_status in ('billed','waived','review_required') then billing_status else 'ready' end,
    billing_ready_at=coalesce(billing_ready_at,completed_at,pg_catalog.now()),
    completed_at=coalesce(completed_at,pg_catalog.now()),
    updated_at=pg_catalog.now()
where status='finished';

update public.work_orders
set billing_status=case when billing_status in ('billed','waived','review_required') then billing_status else 'ready' end,
    billing_ready_at=coalesce(billing_ready_at,completed_at,updated_at,pg_catalog.now()),
    updated_at=pg_catalog.now()
where status='billing_ready'
  and coalesce(billing_status,'not_billed') not in ('billed','waived','review_required','ready');

-- Refresh Draft source lines after the approval backfill.
do $$
declare
  inv_id uuid;
begin
  for inv_id in
    select i.id
    from public.invoices i
    join public.work_orders wo on wo.id=i.work_order_id
    where i.status='draft'
      and wo.status in ('billing_ready','closed')
  loop
    perform private.fieldops_sync_invoice_source_lines(inv_id);
  end loop;
end $$;

-- Permissions for new RPCs.
revoke all on function public.fieldops_claim_work_order(uuid,timestamptz) from public;
revoke all on function public.fieldops_start_due_assignments(timestamptz) from public;
grant execute on function public.fieldops_claim_work_order(uuid,timestamptz) to authenticated;
grant execute on function public.fieldops_start_due_assignments(timestamptz) to authenticated;

-- If Supabase pg_cron is already enabled, make future assignment activation server-side.
-- Deployment does not fail when pg_cron is unavailable; the web app also performs a safe fallback check.
do $$
begin
  if exists(select 1 from pg_catalog.pg_extension where extname='pg_cron') then
    begin
      execute $cron$
        select cron.schedule(
          'fieldops-auto-start-due-assignments',
          '* * * * *',
          'select public.fieldops_start_due_assignments(pg_catalog.now());'
        )
      $cron$;
    exception when others then
      raise notice 'FieldOps pg_cron schedule not installed: %',sqlerrm;
    end;
  end if;
end $$;

commit;
