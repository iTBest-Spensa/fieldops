-- FIELDOPS FIELD TEAM MODULE FOUNDATION V1
-- Extends the existing live technician model rather than creating a competing
-- technician system. Dispatch continues to use profiles, user_roles,
-- technician_profiles, work_order_assignments, time_entries, and
-- technician_schedule_events as its operational source of truth.

begin;

-- ============================================================
-- TECHNICIAN PROFILE EXTENSIONS
-- ============================================================

alter table public.technician_profiles
  add column if not exists employee_number text,
  add column if not exists job_title text,
  add column if not exists employment_type text not null default 'full_time',
  add column if not exists hire_date date,
  add column if not exists home_base text;

alter table public.technician_profiles
  alter column shift_start set default '07:00';

alter table public.technician_profiles
  alter column shift_end set default '17:00';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'technician_profiles_employment_type_check'
      and conrelid = 'public.technician_profiles'::regclass
  ) then
    alter table public.technician_profiles
      add constraint technician_profiles_employment_type_check
      check (employment_type in ('full_time','part_time','contractor','casual'));
  end if;
end
$$;

create unique index if not exists uq_technician_profiles_employee_number
  on public.technician_profiles(employee_number)
  where employee_number is not null and btrim(employee_number) <> '';

-- ============================================================
-- DETAILED SKILLS
-- skill_tags remains synchronized because Dispatch already uses it for fit.
-- ============================================================

create table if not exists public.technician_skills (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null check (btrim(skill_name) <> ''),
  proficiency text not null default 'intermediate'
    check (proficiency in ('beginner','intermediate','advanced','expert')),
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.uq_technician_skills_name_ci;
create unique index uq_technician_skills_name_ci
  on public.technician_skills(technician_id, lower(btrim(skill_name)))
  where active = true;

create index if not exists idx_technician_skills_technician
  on public.technician_skills(technician_id, active);

drop trigger if exists trg_technician_skills_updated_at on public.technician_skills;
create trigger trg_technician_skills_updated_at
before update on public.technician_skills
for each row execute function private.set_updated_at();

insert into public.technician_skills (
  technician_id,
  skill_name,
  proficiency,
  active,
  notes,
  created_by
)
select
  tp.technician_id,
  btrim(tag),
  'intermediate',
  true,
  'Imported from existing Dispatch skill tags.',
  null
from public.technician_profiles tp
cross join lateral unnest(coalesce(tp.skill_tags, '{}'::text[])) as tag
where btrim(tag) <> ''
on conflict do nothing;

create or replace function private.fieldops_sync_technician_skill_tags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  old_target_id uuid;
begin
  target_id := case when tg_op = 'DELETE' then old.technician_id else new.technician_id end;
  old_target_id := case when tg_op = 'UPDATE' then old.technician_id else null end;

  update public.technician_profiles tp
  set skill_tags = coalesce(
    (
      select array_agg(lower(btrim(s.skill_name)) order by lower(btrim(s.skill_name)))
      from public.technician_skills s
      where s.technician_id = target_id
        and s.active = true
    ),
    '{}'::text[]
  )
  where tp.technician_id = target_id;

  if old_target_id is not null and old_target_id is distinct from target_id then
    update public.technician_profiles tp
    set skill_tags = coalesce(
      (
        select array_agg(lower(btrim(s.skill_name)) order by lower(btrim(s.skill_name)))
        from public.technician_skills s
        where s.technician_id = old_target_id
          and s.active = true
      ),
      '{}'::text[]
    )
    where tp.technician_id = old_target_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.fieldops_sync_technician_skill_tags() from public;

drop trigger if exists trg_fieldops_sync_technician_skill_tags
  on public.technician_skills;

create trigger trg_fieldops_sync_technician_skill_tags
after insert or update or delete on public.technician_skills
for each row execute function private.fieldops_sync_technician_skill_tags();

-- Normalize the existing skill tag arrays through the new detailed table.
update public.technician_profiles tp
set skill_tags = coalesce(
  (
    select array_agg(lower(btrim(s.skill_name)) order by lower(btrim(s.skill_name)))
    from public.technician_skills s
    where s.technician_id = tp.technician_id
      and s.active = true
  ),
  '{}'::text[]
);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================

create table if not exists public.technician_certifications (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  certification_name text not null check (btrim(certification_name) <> ''),
  issuer text,
  credential_number text,
  issued_on date,
  expires_on date,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create index if not exists idx_technician_certifications_technician
  on public.technician_certifications(technician_id, active);

create index if not exists idx_technician_certifications_expiry
  on public.technician_certifications(expires_on)
  where active = true and expires_on is not null;

drop trigger if exists trg_technician_certifications_updated_at on public.technician_certifications;
create trigger trg_technician_certifications_updated_at
before update on public.technician_certifications
for each row execute function private.set_updated_at();

-- ============================================================
-- INTERNAL TECHNICIAN NOTES
-- ============================================================

create table if not exists public.technician_notes (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  note text not null check (btrim(note) <> ''),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_technician_notes_technician_created
  on public.technician_notes(technician_id, created_at desc);

-- ============================================================
-- CURRENT DEFAULT RATES
-- Actual time_entries retain their own billing_rate/pay_rate snapshots.
-- ============================================================

create table if not exists public.technician_compensation (
  technician_id uuid primary key references public.profiles(id) on delete cascade,
  billing_rate numeric(12,2) check (billing_rate is null or billing_rate >= 0),
  pay_rate numeric(12,2) check (pay_rate is null or pay_rate >= 0),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_technician_compensation_updated_at on public.technician_compensation;
create trigger trg_technician_compensation_updated_at
before update on public.technician_compensation
for each row execute function private.set_updated_at();

create or replace function private.fieldops_apply_default_time_rates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  defaults public.technician_compensation%rowtype;
begin
  if new.billing_rate is null or new.pay_rate is null then
    select *
    into defaults
    from public.technician_compensation c
    where c.technician_id = new.technician_id;

    if found then
      if new.billing_rate is null then
        new.billing_rate := defaults.billing_rate;
      end if;
      if new.pay_rate is null then
        new.pay_rate := defaults.pay_rate;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.fieldops_apply_default_time_rates() from public;

drop trigger if exists trg_fieldops_apply_default_time_rates
  on public.time_entries;

create trigger trg_fieldops_apply_default_time_rates
before insert on public.time_entries
for each row execute function private.fieldops_apply_default_time_rates();

-- ============================================================
-- SCHEDULE EVENT TYPES
-- Adds proper full-day/absence categories without removing existing types.
-- ============================================================

alter table public.technician_schedule_events
  drop constraint if exists technician_schedule_events_event_type_check;

alter table public.technician_schedule_events
  add constraint technician_schedule_events_event_type_check
  check (event_type in (
    'break',
    'lunch',
    'travel',
    'vacation',
    'sick',
    'training',
    'meeting',
    'unavailable',
    'other'
  ));

-- ============================================================
-- ROLE-SAFE TECHNICIAN MANAGEMENT RPCS
-- Add Technician intentionally requires an existing Auth/Profile account.
-- Account invitations remain a Settings/auth responsibility.
-- ============================================================

create or replace function public.fieldops_enable_technician(
  p_user_id uuid,
  p_specialty text,
  p_service_area text,
  p_shift_start time,
  p_shift_end time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin']::text[])) then
    raise exception 'Only an administrator can add a FieldOps technician.';
  end if;

  if p_shift_start is null or p_shift_end is null or p_shift_end <= p_shift_start then
    raise exception 'Shift end must be later than shift start.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'The selected FieldOps user profile does not exist.';
  end if;

  update public.profiles
  set active = true,
      updated_at = pg_catalog.now()
  where id = p_user_id;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'technician')
  on conflict (user_id, role) do nothing;

  insert into public.technician_profiles (
    technician_id,
    specialty,
    service_area,
    shift_start,
    shift_end
  ) values (
    p_user_id,
    nullif(btrim(p_specialty), ''),
    nullif(btrim(p_service_area), ''),
    p_shift_start,
    p_shift_end
  )
  on conflict (technician_id)
  do update set
    specialty = excluded.specialty,
    service_area = excluded.service_area,
    shift_start = excluded.shift_start,
    shift_end = excluded.shift_end,
    updated_at = pg_catalog.now();

  return jsonb_build_object(
    'technician_id', p_user_id,
    'enabled', true
  );
end;
$$;

create or replace function public.fieldops_update_technician(
  p_technician_id uuid,
  p_full_name text,
  p_phone text,
  p_active boolean,
  p_employee_number text,
  p_job_title text,
  p_employment_type text,
  p_hire_date date,
  p_specialty text,
  p_service_area text,
  p_home_base text,
  p_shift_start time,
  p_shift_end time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager']::text[])) then
    raise exception 'Only an administrator or manager can edit technician profiles.';
  end if;

  if not exists (
    select 1
    from public.technician_profiles tp
    where tp.technician_id = p_technician_id
  ) then
    raise exception 'Technician profile not found.';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'Technician full name is required.';
  end if;

  if p_shift_start is null or p_shift_end is null or p_shift_end <= p_shift_start then
    raise exception 'Shift end must be later than shift start.';
  end if;

  if p_employment_type not in ('full_time','part_time','contractor','casual') then
    raise exception 'Invalid employment type.';
  end if;

  if p_active = false then
    if p_technician_id = (select auth.uid()) then
      raise exception 'You cannot deactivate your own currently signed-in FieldOps account.';
    end if;

    if exists (
      select 1
      from public.time_entries te
      where te.technician_id = p_technician_id
        and te.ended_at is null
    ) then
      raise exception 'Finish the technician''s active time entry before deactivating the account.';
    end if;

    if exists (
      select 1
      from public.work_order_assignments a
      join public.work_orders wo on wo.id = a.work_order_id
      where a.technician_id = p_technician_id
        and a.assignment_role = 'primary'
        and a.assignment_status in ('assigned','accepted')
        and a.released_at is null
        and wo.status not in ('finished','billing_ready','closed','cancelled')
    ) then
      raise exception 'Reassign or finish the technician''s active work orders before deactivating the account.';
    end if;
  end if;

  update public.profiles
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    active = p_active,
    updated_at = pg_catalog.now()
  where id = p_technician_id;

  update public.technician_profiles
  set
    employee_number = nullif(btrim(p_employee_number), ''),
    job_title = nullif(btrim(p_job_title), ''),
    employment_type = p_employment_type,
    hire_date = p_hire_date,
    specialty = nullif(btrim(p_specialty), ''),
    service_area = nullif(btrim(p_service_area), ''),
    home_base = nullif(btrim(p_home_base), ''),
    shift_start = p_shift_start,
    shift_end = p_shift_end,
    updated_at = pg_catalog.now()
  where technician_id = p_technician_id;

  return jsonb_build_object(
    'technician_id', p_technician_id,
    'updated', true,
    'active', p_active
  );
end;
$$;

revoke all on function public.fieldops_enable_technician(uuid,text,text,time,time) from public;
revoke all on function public.fieldops_update_technician(uuid,text,text,boolean,text,text,text,date,text,text,text,time,time) from public;

grant execute on function public.fieldops_enable_technician(uuid,text,text,time,time) to authenticated;
grant execute on function public.fieldops_update_technician(uuid,text,text,boolean,text,text,text,date,text,text,text,time,time) to authenticated;

-- ============================================================
-- SERVER AVAILABILITY: INCLUDE SCHEDULE EVENTS
-- Preserves the existing function signature used by Work Orders.
-- ============================================================

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
  select
    a.technician_id,
    greatest(a.scheduled_start, p_day_start) as start_at,
    least(a.scheduled_end, p_day_end) as end_at
  from public.work_order_assignments a
  where a.assignment_status not in ('removed', 'declined', 'completed')
    and a.scheduled_start is not null
    and a.scheduled_end is not null
    and a.work_order_id <> p_work_order_id
    and a.scheduled_start < p_day_end
    and a.scheduled_end > p_day_start

  union all

  select
    te.technician_id,
    greatest(te.started_at, p_day_start) as start_at,
    least(coalesce(te.ended_at, p_day_end), p_day_end) as end_at
  from public.time_entries te
  where (p_exclude_time_entry_id is null or te.id <> p_exclude_time_entry_id)
    and te.started_at < p_day_end
    and coalesce(te.ended_at, p_day_end) > p_day_start

  union all

  select
    se.technician_id,
    greatest(se.starts_at, p_day_start) as start_at,
    least(se.ends_at, p_day_end) as end_at
  from public.technician_schedule_events se
  where se.starts_at < p_day_end
    and se.ends_at > p_day_start
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
    case when prior_max_end is null or start_at > prior_max_end then 1 else 0 end as new_group
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
  join merged m on m.technician_id = t.technician_id
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
  join merged m on m.technician_id = t.technician_id
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
        jsonb_build_object('start', f.free_start, 'end', f.free_end)
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
  left join free f on f.technician_id = t.technician_id
  group by t.technician_id
)
select technician_id, fits_requested_window, free_windows
from free_agg
order by technician_id;
$$;

revoke all on function public.fieldops_get_technician_availability(uuid,timestamptz,timestamptz,timestamptz,timestamptz,uuid) from public;
grant execute on function public.fieldops_get_technician_availability(uuid,timestamptz,timestamptz,timestamptz,timestamptz,uuid) to authenticated;

-- ============================================================
-- RLS + GRANTS
-- ============================================================

alter table public.technician_skills enable row level security;
alter table public.technician_certifications enable row level security;
alter table public.technician_notes enable row level security;
alter table public.technician_compensation enable row level security;

revoke all on table
  public.technician_skills,
  public.technician_certifications,
  public.technician_notes,
  public.technician_compensation
from anon;

grant select, insert, update, delete on table
  public.technician_skills,
  public.technician_certifications,
  public.technician_notes,
  public.technician_compensation
to authenticated;

create policy "technician_skills_select_staff"
on public.technician_skills for select
to authenticated
using ((select private.is_active_user()));

create policy "technician_skills_manage"
on public.technician_skills for all
to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])))
with check ((select private.has_any_role(array['admin','manager']::text[])));

create policy "technician_certifications_select_staff"
on public.technician_certifications for select
to authenticated
using ((select private.is_active_user()));

create policy "technician_certifications_manage"
on public.technician_certifications for all
to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])))
with check ((select private.has_any_role(array['admin','manager']::text[])));

create policy "technician_notes_select_management"
on public.technician_notes for select
to authenticated
using ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "technician_notes_insert_management"
on public.technician_notes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "technician_notes_update_management"
on public.technician_notes for update
to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])))
with check ((select private.has_any_role(array['admin','manager']::text[])));

create policy "technician_notes_delete_admin"
on public.technician_notes for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "technician_compensation_select_management"
on public.technician_compensation for select
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager']::text[]))
);

create policy "technician_compensation_manage"
on public.technician_compensation for all
to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])))
with check ((select private.has_any_role(array['admin','manager']::text[])));

-- ============================================================
-- REALTIME
-- Adds the tables this page watches. Existing Dispatch/Work Orders already
-- subscribe to time_entries, so publishing it also fixes that shared realtime
-- contract without changing those approved pages.
-- ============================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_profiles') then
      execute 'alter publication supabase_realtime add table public.technician_profiles';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_skills') then
      execute 'alter publication supabase_realtime add table public.technician_skills';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_certifications') then
      execute 'alter publication supabase_realtime add table public.technician_certifications';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_notes') then
      execute 'alter publication supabase_realtime add table public.technician_notes';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'technician_compensation') then
      execute 'alter publication supabase_realtime add table public.technician_compensation';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_entries') then
      execute 'alter publication supabase_realtime add table public.time_entries';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_roles') then
      execute 'alter publication supabase_realtime add table public.user_roles';
    end if;
  end if;
end
$$;

alter table public.technician_profiles replica identity full;
alter table public.technician_skills replica identity full;
alter table public.technician_certifications replica identity full;
alter table public.technician_notes replica identity full;
alter table public.technician_compensation replica identity full;
alter table public.time_entries replica identity full;
alter table public.user_roles replica identity full;

commit;
