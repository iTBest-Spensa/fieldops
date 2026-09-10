-- FIELDOPS ACTIVE DEMO CLOCK REPAIR FOR OVERRUN DISPLAY
-- Migration: 20260909112500_demo_active_clock_overrun_repair.sql
--
-- This does NOT change planned schedule times.
-- It only reopens DEMO time_entries that our earlier demo_backfill
-- incorrectly ended at the planned schedule end while the work order
-- itself remained in an active status.

begin;
with candidates as (
  select
    te.id,
    te.technician_id,
    te.work_order_id,
    row_number() over (
      partition by te.technician_id
      order by te.started_at desc, te.created_at desc, te.id desc
    ) as rn
  from public.time_entries te
  join public.work_orders wo
    on wo.id = te.work_order_id
  join public.work_order_assignments a
    on a.id = te.assignment_id
  where te.source = 'demo_backfill'
    and te.ended_at is not null
    and wo.work_order_number like 'DEMO-%'
    and wo.status in ('travelling','on_site','working','waiting')
    and a.assignment_status = 'accepted'
    and a.released_at is null
),
eligible as (
  select c.*
  from candidates c
  where c.rn = 1
    and not exists (
      select 1
      from public.time_entries open_te
      where open_te.technician_id = c.technician_id
        and open_te.ended_at is null
        and open_te.id <> c.id
    )
)
update public.time_entries te
set
  ended_at = null,
  ended_reason = null,
  notes = 'Demo active clock repaired. Planned schedule remains unchanged; actual overrun continues until real stop.'
from eligible e
where te.id = e.id;
commit;
