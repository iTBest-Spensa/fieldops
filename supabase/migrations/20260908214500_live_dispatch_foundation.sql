-- FieldOps live dispatch foundation
-- Adds technician metadata, schedule events, dispatch-fit inputs,
-- first-user admin bootstrap, and Realtime publication support.

-- =========================================================
-- WORK ORDER DISPATCH FIELDS
-- =========================================================

alter table public.work_orders
  add column if not exists estimated_duration_minutes integer not null default 60
    check (estimated_duration_minutes > 0),
  add column if not exists required_skills text[] not null default '{}'::text[],
  add column if not exists service_area text;

-- =========================================================
-- TECHNICIAN PROFILE
-- =========================================================

create table if not exists public.technician_profiles (
  technician_id uuid primary key references public.profiles(id) on delete cascade,
  specialty text,
  skill_tags text[] not null default '{}'::text[],
  service_area text,
  shift_start time not null default '08:00',
  shift_end time not null default '17:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (shift_end > shift_start)
);

create index if not exists idx_technician_profiles_service_area
  on public.technician_profiles(service_area);

drop trigger if exists trg_technician_profiles_updated_at
  on public.technician_profiles;

create trigger trg_technician_profiles_updated_at
before update on public.technician_profiles
for each row execute function private.set_updated_at();

insert into public.technician_profiles (technician_id)
select ur.user_id
from public.user_roles ur
where ur.role = 'technician'
on conflict (technician_id) do nothing;

-- =========================================================
-- TECHNICIAN NON-JOB SCHEDULE EVENTS
-- =========================================================

create table if not exists public.technician_schedule_events (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'break',
      'lunch',
      'travel',
      'training',
      'meeting',
      'unavailable',
      'other'
    )),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_technician_schedule_events_technician_time
  on public.technician_schedule_events(technician_id, starts_at, ends_at);

create index if not exists idx_technician_schedule_events_work_order
  on public.technician_schedule_events(work_order_id);

drop trigger if exists trg_technician_schedule_events_updated_at
  on public.technician_schedule_events;

create trigger trg_technician_schedule_events_updated_at
before update on public.technician_schedule_events
for each row execute function private.set_updated_at();

-- =========================================================
-- FIRST USER BOOTSTRAP
-- The first FieldOps Auth user becomes admin only when no
-- application role exists yet. Later users are not auto-admin.
-- =========================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;

  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

do $$
declare
  first_user uuid;
begin
  if not exists (select 1 from public.user_roles) then
    select id
      into first_user
    from auth.users
    order by created_at asc
    limit 1;

    if first_user is not null then
      insert into public.profiles (id, full_name, email)
      select
        u.id,
        coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
        u.email
      from auth.users u
      where u.id = first_user
      on conflict (id) do nothing;

      insert into public.user_roles (user_id, role)
      values (first_user, 'admin')
      on conflict (user_id, role) do nothing;
    end if;
  end if;
end
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.technician_profiles enable row level security;
alter table public.technician_schedule_events enable row level security;

revoke all on table
  public.technician_profiles,
  public.technician_schedule_events
from anon;

grant select, insert, update, delete on table
  public.technician_profiles,
  public.technician_schedule_events
to authenticated;

drop policy if exists "user_roles_select_self_or_management"
  on public.user_roles;

create policy "user_roles_select_self_or_management"
on public.user_roles for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

drop policy if exists "technician_profiles_staff_select"
  on public.technician_profiles;

create policy "technician_profiles_staff_select"
on public.technician_profiles for select
to authenticated
using ((select private.is_active_user()));

drop policy if exists "technician_profiles_manage"
  on public.technician_profiles;

create policy "technician_profiles_manage"
on public.technician_profiles for all
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
)
with check (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

drop policy if exists "technician_schedule_events_select"
  on public.technician_schedule_events;

create policy "technician_schedule_events_select"
on public.technician_schedule_events for select
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

drop policy if exists "technician_schedule_events_insert"
  on public.technician_schedule_events;

create policy "technician_schedule_events_insert"
on public.technician_schedule_events for insert
to authenticated
with check (
  (
    technician_id = (select auth.uid())
    and created_by = (select auth.uid())
  )
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

drop policy if exists "technician_schedule_events_update"
  on public.technician_schedule_events;

create policy "technician_schedule_events_update"
on public.technician_schedule_events for update
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
)
with check (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

drop policy if exists "technician_schedule_events_delete"
  on public.technician_schedule_events;

create policy "technician_schedule_events_delete"
on public.technician_schedule_events for delete
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'work_orders'
    ) then
      execute 'alter publication supabase_realtime add table public.work_orders';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'work_order_assignments'
    ) then
      execute 'alter publication supabase_realtime add table public.work_order_assignments';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'technician_schedule_events'
    ) then
      execute 'alter publication supabase_realtime add table public.technician_schedule_events';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'profiles'
    ) then
      execute 'alter publication supabase_realtime add table public.profiles';
    end if;
  end if;
end
$$;

alter table public.work_orders replica identity full;
alter table public.work_order_assignments replica identity full;
alter table public.technician_schedule_events replica identity full;
alter table public.profiles replica identity full;
