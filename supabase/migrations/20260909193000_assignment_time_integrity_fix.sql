-- FIELDOPS ASSIGNMENT + ACTUAL-TIME INTEGRITY FIX
-- Fixes two confirmed issues:
-- 1) work_orders.status could be changed to "assigned" without a real primary
--    technician assignment;
-- 2) time_entries are actual records and must not be created in the future.

begin;

-- ============================================================
-- ASSIGNED STATUS REQUIRES A REAL PRIMARY ASSIGNMENT
-- ============================================================

create or replace function private.fieldops_require_assignment_for_assigned_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'assigned' then
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from new.status) then
      if not exists (
      select 1
      from public.work_order_assignments a
      where a.work_order_id = new.id
        and a.assignment_role = 'primary'
        and a.assignment_status in ('assigned','accepted')
        and a.released_at is null
      ) then
        raise exception 'Assigned status requires an active primary technician assignment. Use Assign Technician.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fieldops_require_assignment_for_assigned_status
  on public.work_orders;

create trigger trg_fieldops_require_assignment_for_assigned_status
before insert or update of status on public.work_orders
for each row
execute function private.fieldops_require_assignment_for_assigned_status();

-- Repair already-orphaned "assigned" work orders without guessing a technician.
-- They return to Planned so Dispatch can assign the real technician explicitly.
with repaired as (
  update public.work_orders wo
  set
    status = 'planned',
    updated_at = pg_catalog.now()
  where wo.status = 'assigned'
    and not exists (
      select 1
      from public.work_order_assignments a
      where a.work_order_id = wo.id
        and a.assignment_role = 'primary'
        and a.assignment_status in ('assigned','accepted')
        and a.released_at is null
    )
  returning wo.id
)
insert into public.work_order_events (
  work_order_id,
  event_type,
  old_status,
  new_status,
  details
)
select
  r.id,
  'status_integrity_repaired',
  'assigned',
  'planned',
  jsonb_build_object(
    'reason', 'Assigned status had no active primary technician assignment',
    'repair', 'returned_to_planned_without_guessing_technician'
  )
from repaired r;

-- ============================================================
-- ACTUAL TIME MAY NOT BE IN THE FUTURE
-- ============================================================

create or replace function private.fieldops_validate_actual_time_not_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Five-minute tolerance avoids rejecting legitimate entries because of
  -- small browser/server clock differences.
  if new.started_at > pg_catalog.now() + interval '5 minutes' then
    raise exception 'Actual technician start time cannot be in the future. Use Assign Technician / reschedule for planned work.';
  end if;

  if new.ended_at is not null
     and new.ended_at > pg_catalog.now() + interval '5 minutes' then
    raise exception 'Actual technician end time cannot be in the future. Use Assign Technician / reschedule for planned work.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fieldops_validate_actual_time_not_future
  on public.time_entries;

create trigger trg_fieldops_validate_actual_time_not_future
before insert or update of started_at, ended_at on public.time_entries
for each row
execute function private.fieldops_validate_actual_time_not_future();

commit;
