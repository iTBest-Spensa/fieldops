-- FIELDOPS ACTUAL TIME + HANDOFF FOUNDATION V1
-- Migration: 20260909103000_actual_time_handoff.sql
--
-- Planned schedule remains in work_order_assignments/work_orders.
-- Actual technician labour is recorded in time_entries.
-- Reassignment preserves the previous technician's accrued time and requires
-- the new technician to accept before any carried-forward active clock resumes.

begin;
-- ============================================================
-- ASSIGNMENT OWNERSHIP / HANDOFF STATE
-- ============================================================

alter table public.work_order_assignments
  add column if not exists accepted_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists pending_activity_type text;
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'work_order_assignments_pending_activity_type_check'
      and conrelid = 'public.work_order_assignments'::regclass
  ) then
    alter table public.work_order_assignments
      add constraint work_order_assignments_pending_activity_type_check
      check (
        pending_activity_type is null
        or pending_activity_type in ('travel','on_site','work','waiting','break','other')
      );
  end if;
end
$$;
update public.work_order_assignments
set accepted_at = coalesce(accepted_at, assigned_at)
where assignment_status in ('accepted','completed')
  and accepted_at is null;
update public.work_order_assignments
set released_at = coalesce(released_at, updated_at)
where assignment_status in ('removed','declined')
  and released_at is null;
-- ============================================================
-- ACTUAL TIME ENTRY MODEL
-- ============================================================

alter table public.time_entries
  add column if not exists assignment_id uuid references public.work_order_assignments(id) on delete set null,
  add column if not exists activity_type text,
  add column if not exists billing_rate numeric(12,2),
  add column if not exists pay_rate numeric(12,2),
  add column if not exists approval_status text not null default 'pending',
  add column if not exists ended_reason text,
  add column if not exists source text not null default 'status_transition',
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;
update public.time_entries
set activity_type = 'work'
where activity_type is null;
alter table public.time_entries
  alter column activity_type set not null;
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'time_entries_activity_type_check'
      and conrelid = 'public.time_entries'::regclass
  ) then
    alter table public.time_entries
      add constraint time_entries_activity_type_check
      check (activity_type in ('travel','on_site','work','waiting','break','other'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'time_entries_billing_rate_check'
      and conrelid = 'public.time_entries'::regclass
  ) then
    alter table public.time_entries
      add constraint time_entries_billing_rate_check
      check (billing_rate is null or billing_rate >= 0);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'time_entries_pay_rate_check'
      and conrelid = 'public.time_entries'::regclass
  ) then
    alter table public.time_entries
      add constraint time_entries_pay_rate_check
      check (pay_rate is null or pay_rate >= 0);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'time_entries_approval_status_check'
      and conrelid = 'public.time_entries'::regclass
  ) then
    alter table public.time_entries
      add constraint time_entries_approval_status_check
      check (approval_status in ('pending','approved','rejected'));
  end if;
end
$$;
create index if not exists idx_time_entries_assignment
  on public.time_entries(assignment_id);
create index if not exists idx_time_entries_open_work_order
  on public.time_entries(work_order_id, technician_id)
  where ended_at is null;
-- If an old development database somehow contains more than one open clock
-- for a technician, close all but the newest before adding the invariant.
with ranked as (
  select
    id,
    row_number() over (
      partition by technician_id
      order by started_at desc, created_at desc, id desc
    ) as rn
  from public.time_entries
  where ended_at is null
)
update public.time_entries t
set
  ended_at = greatest(t.started_at, pg_catalog.now()),
  ended_reason = coalesce(t.ended_reason, 'migration_duplicate_open_clock_cleanup')
from ranked r
where t.id = r.id
  and r.rn > 1;
create unique index if not exists uq_time_entries_one_open_clock_per_technician
  on public.time_entries(technician_id)
  where ended_at is null;
-- ============================================================
-- DURATION AUTOMATION
-- ============================================================

create or replace function private.fieldops_finalize_time_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ended_at is not null then
    if new.ended_at < new.started_at then
      raise exception 'Time entry end cannot be earlier than start.';
    end if;

    new.duration_minutes := greatest(
      0,
      round(
        extract(epoch from (new.ended_at - new.started_at)) / 60.0
      )::integer
    );
  else
    new.duration_minutes := null;
  end if;

  return new;
end;
$$;
drop trigger if exists trg_time_entries_finalize_duration on public.time_entries;
create trigger trg_time_entries_finalize_duration
before insert or update of started_at, ended_at
on public.time_entries
for each row
execute function private.fieldops_finalize_time_entry();
-- Backfill durations for already-closed rows.
update public.time_entries
set ended_at = ended_at
where ended_at is not null;
-- ============================================================
-- INTERNAL HELPERS
-- ============================================================

create or replace function private.fieldops_activity_for_status(target_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case target_status
    when 'travelling' then 'travel'
    when 'on_site' then 'on_site'
    when 'working' then 'work'
    when 'waiting' then 'waiting'
    else null
  end;
$$;
create or replace function private.fieldops_status_for_activity(target_activity text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case target_activity
    when 'travel' then 'travelling'
    when 'on_site' then 'on_site'
    when 'work' then 'working'
    when 'waiting' then 'waiting'
    else 'assigned'
  end;
$$;
create or replace function private.fieldops_close_open_time(
  target_work_order_id uuid,
  target_technician_id uuid,
  stop_at timestamptz,
  stop_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_activity text;
begin
  select te.activity_type
  into previous_activity
  from public.time_entries te
  where te.work_order_id = target_work_order_id
    and te.technician_id = target_technician_id
    and te.ended_at is null
  order by te.started_at desc
  limit 1;

  update public.time_entries te
  set
    ended_at = greatest(stop_at, te.started_at),
    ended_reason = coalesce(stop_reason, 'closed')
  where te.work_order_id = target_work_order_id
    and te.technician_id = target_technician_id
    and te.ended_at is null;

  return previous_activity;
end;
$$;
revoke all on function private.fieldops_activity_for_status(text) from public;
revoke all on function private.fieldops_status_for_activity(text) from public;
revoke all on function private.fieldops_close_open_time(uuid,uuid,timestamptz,text) from public;
-- ============================================================
-- ACCEPT ASSIGNMENT
-- ============================================================

create or replace function public.fieldops_accept_assignment(
  p_work_order_id uuid,
  p_technician_id uuid,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.work_order_assignments%rowtype;
  resume_activity text;
  resume_status text;
  old_work_order_status text;
  open_other uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if (select auth.uid()) <> p_technician_id
     and not (select private.has_any_role(array['admin','manager','dispatcher']::text[])) then
    raise exception 'You are not authorized to accept this assignment.';
  end if;

  select *
  into a
  from public.work_order_assignments
  where work_order_id = p_work_order_id
    and technician_id = p_technician_id
    and assignment_status not in ('removed','declined','completed')
  order by
    case when assignment_role = 'primary' then 0 else 1 end,
    assigned_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No pending assignment was found for this technician.';
  end if;

  if a.assignment_status = 'accepted' then
    return jsonb_build_object(
      'assignment_id', a.id,
      'accepted', true,
      'already_accepted', true
    );
  end if;

  if a.assignment_status <> 'assigned' then
    raise exception 'Only an Assigned job can be accepted.';
  end if;

  select wo.status
  into old_work_order_status
  from public.work_orders wo
  where wo.id = p_work_order_id;

  resume_activity := a.pending_activity_type;

  if resume_activity is not null then
    select te.work_order_id
    into open_other
    from public.time_entries te
    where te.technician_id = p_technician_id
      and te.ended_at is null
      and te.work_order_id <> p_work_order_id
    limit 1;

    if open_other is not null then
      raise exception 'Technician is still active on another work order and is not available.';
    end if;
  end if;

  update public.work_order_assignments
  set
    assignment_status = 'accepted',
    accepted_at = coalesce(accepted_at, p_at),
    released_at = null,
    pending_activity_type = null
  where id = a.id;

  if resume_activity is not null then
    insert into public.time_entries (
      work_order_id,
      technician_id,
      assignment_id,
      started_at,
      activity_type,
      billable,
      source,
      notes
    ) values (
      p_work_order_id,
      p_technician_id,
      a.id,
      p_at,
      resume_activity,
      resume_activity not in ('waiting','break'),
      'handoff_acceptance',
      'Actual time resumed when transferred assignment was accepted.'
    );

    resume_status := private.fieldops_status_for_activity(resume_activity);

    update public.work_orders
    set status = resume_status
    where id = p_work_order_id;
  end if;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    'assignment_accepted',
    old_work_order_status,
    case
      when resume_activity is null then old_work_order_status
      else private.fieldops_status_for_activity(resume_activity)
    end,
    jsonb_build_object(
      'assignment_id', a.id,
      'technician_id', p_technician_id,
      'accepted_at', p_at,
      'resumed_activity_type', resume_activity
    )
  );

  return jsonb_build_object(
    'assignment_id', a.id,
    'accepted', true,
    'resumed_activity_type', resume_activity
  );
end;
$$;
-- ============================================================
-- STATUS -> ACTUAL CLOCK TRANSITION
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
  activity text;
  a public.work_order_assignments%rowtype;
  open_other uuid;
  can_manage boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if p_new_status not in (
    'requested','planned','assigned','travelling','on_site','working','waiting',
    'finished','billing_ready','closed','cancelled'
  ) then
    raise exception 'Unsupported work-order status: %', p_new_status;
  end if;

  select wo.status
  into old_status
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'Work order not found.';
  end if;

  can_manage := (select private.has_any_role(array['admin','manager','dispatcher']::text[]));

  if not can_manage and not (select private.is_assigned_to_work_order(p_work_order_id)) then
    raise exception 'You are not authorized to change this work order.';
  end if;

  if p_new_status = old_status then
    return jsonb_build_object('status', old_status, 'changed', false);
  end if;

  activity := private.fieldops_activity_for_status(p_new_status);

  if activity is not null then
    select *
    into a
    from public.work_order_assignments
    where work_order_id = p_work_order_id
      and assignment_status = 'accepted'
      and assignment_role = 'primary'
    order by accepted_at desc nulls last, assigned_at desc
    limit 1
    for update;

    if not found then
      raise exception 'The primary technician must accept the assignment before the job can enter %.', p_new_status;
    end if;

    if not can_manage and a.technician_id <> (select auth.uid()) then
      raise exception 'Only the accepted primary technician can start this activity.';
    end if;

    select te.work_order_id
    into open_other
    from public.time_entries te
    where te.technician_id = a.technician_id
      and te.ended_at is null
      and te.work_order_id <> p_work_order_id
    limit 1;

    if open_other is not null then
      raise exception 'Technician is still active on another work order and is not available.';
    end if;

    perform private.fieldops_close_open_time(
      p_work_order_id,
      a.technician_id,
      p_at,
      'status_change'
    );

    insert into public.time_entries (
      work_order_id,
      technician_id,
      assignment_id,
      started_at,
      activity_type,
      billable,
      source,
      notes
    ) values (
      p_work_order_id,
      a.technician_id,
      a.id,
      p_at,
      activity,
      activity not in ('waiting','break'),
      'status_transition',
      'Actual time created by work-order status transition.'
    );
  else
    update public.time_entries te
    set
      ended_at = greatest(p_at, te.started_at),
      ended_reason = case
        when p_new_status in ('finished','billing_ready','closed') then p_new_status
        when p_new_status = 'cancelled' then 'cancelled'
        else 'status_change'
      end
    where te.work_order_id = p_work_order_id
      and te.ended_at is null;
  end if;

  update public.work_orders
  set
    status = p_new_status,
    completed_at = case
      when p_new_status = 'finished' then coalesce(completed_at, p_at)
      else completed_at
    end,
    closed_at = case
      when p_new_status = 'closed' then coalesce(closed_at, p_at)
      else closed_at
    end
  where id = p_work_order_id;

  if p_new_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set assignment_status = 'completed'
    where work_order_id = p_work_order_id
      and assignment_status = 'accepted';
  end if;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    'status_change',
    old_status,
    p_new_status,
    jsonb_build_object(
      'actual_time_activity', activity,
      'transition_at', p_at
    )
  );

  return jsonb_build_object(
    'status', p_new_status,
    'changed', true,
    'activity_type', activity
  );
end;
$$;
-- ============================================================
-- ASSIGN / RESCHEDULE / TRANSFER WITH HISTORY PRESERVATION
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
  old_status text;
  conflict_id uuid;
  current_open_work uuid;
  target_is_technician boolean;
begin
  if (select auth.uid()) is null then
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

  -- Same technician = reschedule only. Do not break ownership or actual clock.
  if p_from_assignment_id is not null
     and old_assignment.technician_id = p_to_technician_id then
    update public.work_order_assignments
    set
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end
    where id = old_assignment.id;

    update public.work_orders
    set
      scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end
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
      old_status,
      jsonb_build_object(
        'assignment_id', old_assignment.id,
        'technician_id', p_to_technician_id,
        'scheduled_start', p_scheduled_start,
        'scheduled_end', p_scheduled_end
      )
    );

    return jsonb_build_object(
      'assignment_id', old_assignment.id,
      'mode', 'rescheduled'
    );
  end if;

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

  -- If assigning into the present, an open actual clock means unavailable.
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
      pending_activity_type = null
    where id = old_assignment.id;
  end if;

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
    'assigned',
    p_scheduled_start,
    p_scheduled_end,
    (select auth.uid()),
    p_at,
    null,
    null,
    previous_activity
  )
  on conflict (work_order_id, technician_id)
  do update set
    assignment_role = 'primary',
    assignment_status = 'assigned',
    scheduled_start = excluded.scheduled_start,
    scheduled_end = excluded.scheduled_end,
    assigned_by = excluded.assigned_by,
    assigned_at = excluded.assigned_at,
    accepted_at = null,
    released_at = null,
    pending_activity_type = excluded.pending_activity_type,
    updated_at = pg_catalog.now()
  returning * into target_assignment;

  update public.work_orders
  set
    status = 'assigned',
    scheduled_start = p_scheduled_start,
    scheduled_end = p_scheduled_end
  where id = p_work_order_id;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    case when p_from_assignment_id is null
      then 'assigned_pending_acceptance'
      else 'reassigned_pending_acceptance'
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
      'acceptance_required', true
    )
  );

  return jsonb_build_object(
    'assignment_id', target_assignment.id,
    'mode', case when p_from_assignment_id is null then 'assigned' else 'transferred' end,
    'acceptance_required', true,
    'pending_activity_type', previous_activity
  );
end;
$$;
revoke all on function public.fieldops_accept_assignment(uuid,uuid,timestamptz) from public;
revoke all on function public.fieldops_transition_work_order_status(uuid,text,timestamptz) from public;
revoke all on function public.fieldops_reassign_work_order(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz) from public;
grant execute on function public.fieldops_accept_assignment(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.fieldops_transition_work_order_status(uuid,text,timestamptz) to authenticated;
grant execute on function public.fieldops_reassign_work_order(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz) to authenticated;
-- ============================================================
-- DEMO-ONLY ACTUAL TIME BACKFILL
-- ============================================================
-- Existing demo jobs were seeded before actual-time tracking existed. Backfill
-- only completed historical DEMO schedule blocks so the UI can demonstrate
-- actual-line rendering without pretending real customer schedules were actual.

insert into public.time_entries (
  work_order_id,
  technician_id,
  assignment_id,
  started_at,
  ended_at,
  activity_type,
  billable,
  source,
  notes
)
select
  wo.id,
  a.technician_id,
  a.id,
  coalesce(a.scheduled_start, wo.scheduled_start),
  coalesce(a.scheduled_end, wo.scheduled_end),
  case wo.status
    when 'travelling' then 'travel'
    when 'on_site' then 'on_site'
    when 'waiting' then 'waiting'
    else 'work'
  end,
  wo.status <> 'waiting',
  'demo_backfill',
  'Demo-only actual time created for pre-time-tracking seeded data.'
from public.work_orders wo
join public.work_order_assignments a
  on a.work_order_id = wo.id
where wo.work_order_number like 'DEMO-%'
  and wo.status in ('travelling','on_site','working','waiting')
  and a.assignment_status in ('accepted','completed')
  and coalesce(a.scheduled_start, wo.scheduled_start) is not null
  and coalesce(a.scheduled_end, wo.scheduled_end) is not null
  and coalesce(a.scheduled_end, wo.scheduled_end) <= pg_catalog.now()
  and not exists (
    select 1
    from public.time_entries te
    where te.work_order_id = wo.id
      and te.technician_id = a.technician_id
  );
commit;
