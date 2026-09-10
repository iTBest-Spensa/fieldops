-- FIELDOPS SERVER-SIDE TECHNICIAN AVAILABILITY V1
-- Makes technician availability use the same database truth as time-entry
-- overlap validation so UI availability cannot disagree with Save Correction /
-- Add Time Segment.

begin;
create or replace function public.fieldops_get_technician_availability(
  p_work_order_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_exclude_time_entry_id uuid default null
)
returns table (
  technician_id uuid,
  fits_requested_window boolean,
  free_windows jsonb
)
language sql
security definer
set search_path = ''
as $$
with techs as (
  select distinct p.id as technician_id
  from public.profiles p
  join public.user_roles ur
    on ur.user_id = p.id
   and ur.role = 'technician'
  where p.active = true
),
blocked_raw as (
  -- Planned/scheduled work blocks technician availability.
  -- Exclude the current work order's own assignment so the job does not
  -- conflict with itself while choosing/reviewing its technician.
  select
    a.technician_id,
    greatest(a.scheduled_start, p_day_start) as start_at,
    least(a.scheduled_end, p_day_end) as end_at
  from public.work_order_assignments a
  where a.assignment_status not in ('removed', 'declined')
    and a.scheduled_start is not null
    and a.scheduled_end is not null
    and a.work_order_id <> p_work_order_id
    and a.scheduled_start < p_day_end
    and a.scheduled_end > p_day_start

  union all

  -- Actual technician time is authoritative for overlap protection.
  -- IMPORTANT: current work-order actual entries are intentionally included.
  -- That makes this function agree with fieldops_add_time_entry's overlap rule.
  select
    te.technician_id,
    greatest(te.started_at, p_day_start) as start_at,
    least(
      coalesce(te.ended_at, p_day_end),
      p_day_end
    ) as end_at
  from public.time_entries te
  where (p_exclude_time_entry_id is null or te.id <> p_exclude_time_entry_id)
    and te.started_at < p_day_end
    and coalesce(te.ended_at, p_day_end) > p_day_start
),
blocked as (
  select *
  from blocked_raw
  where end_at > start_at
),
ordered as (
  select
    technician_id,
    start_at,
    end_at,
    max(end_at) over (
      partition by technician_id
      order by start_at, end_at
      rows between unbounded preceding and 1 preceding
    ) as prior_max_end
  from blocked
),
marked as (
  select
    technician_id,
    start_at,
    end_at,
    case
      when prior_max_end is null or start_at > prior_max_end
        then 1
      else 0
    end as new_group
  from ordered
),
grouped as (
  select
    technician_id,
    start_at,
    end_at,
    sum(new_group) over (
      partition by technician_id
      order by start_at, end_at
      rows unbounded preceding
    ) as grp
  from marked
),
merged as (
  select
    technician_id,
    min(start_at) as start_at,
    max(end_at) as end_at
  from grouped
  group by technician_id, grp
),
sequenced as (
  select
    technician_id,
    start_at,
    end_at,
    lag(end_at) over (
      partition by technician_id
      order by start_at
    ) as previous_end
  from merged
),
first_gaps as (
  select
    t.technician_id,
    p_day_start as free_start,
    min(m.start_at) as free_end
  from techs t
  join merged m
    on m.technician_id = t.technician_id
  group by t.technician_id
  having min(m.start_at) > p_day_start
),
middle_gaps as (
  select
    technician_id,
    previous_end as free_start,
    start_at as free_end
  from sequenced
  where previous_end is not null
    and start_at > previous_end
),
last_gaps as (
  select
    t.technician_id,
    max(m.end_at) as free_start,
    p_day_end as free_end
  from techs t
  join merged m
    on m.technician_id = t.technician_id
  group by t.technician_id
  having max(m.end_at) < p_day_end
),
fully_free as (
  select
    t.technician_id,
    p_day_start as free_start,
    p_day_end as free_end
  from techs t
  where not exists (
    select 1
    from merged m
    where m.technician_id = t.technician_id
  )
),
free as (
  select * from first_gaps
  union all
  select * from middle_gaps
  union all
  select * from last_gaps
  union all
  select * from fully_free
),
free_agg as (
  select
    t.technician_id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'start', f.free_start,
          'end', f.free_end
        )
        order by f.free_start
      ) filter (where f.free_start is not null),
      '[]'::jsonb
    ) as free_windows,
    coalesce(
      bool_or(
        p_window_start >= f.free_start
        and p_window_end <= f.free_end
      ),
      false
    ) as fits_requested_window
  from techs t
  left join free f
    on f.technician_id = t.technician_id
  group by t.technician_id
)
select
  technician_id,
  fits_requested_window,
  free_windows
from free_agg
order by technician_id;
$$;
revoke all on function public.fieldops_get_technician_availability(
  uuid,timestamptz,timestamptz,timestamptz,timestamptz,uuid
) from public;
grant execute on function public.fieldops_get_technician_availability(
  uuid,timestamptz,timestamptz,timestamptz,timestamptz,uuid
) to authenticated;
commit;
