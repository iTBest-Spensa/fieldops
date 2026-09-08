-- FieldOps initial schema
-- Core: customers, sites, contacts, dispatch/work orders, field work,
-- inventory/assets, billing, payments, roles and RLS.
-- Generated for a fresh Supabase project.

create extension if not exists pgcrypto;

create schema if not exists private;

-- Human-readable numbering
create sequence if not exists public.work_order_number_seq start with 1001;
create sequence if not exists public.invoice_number_seq start with 1001;

-- =========================================================
-- USERS + ROLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (
    role in ('admin','manager','dispatcher','technician','billing','inventory')
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- =========================================================
-- CUSTOMERS
-- =========================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_code text unique,
  billing_email text,
  phone text,
  payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  tax_exempt boolean not null default false,
  status text not null default 'active'
    check (status in ('lead','active','on_hold','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  address1 text,
  address2 text,
  city text,
  province_state text,
  postal_code text,
  country text not null default 'Canada',
  latitude numeric(10,7),
  longitude numeric(10,7),
  timezone text not null default 'America/Vancouver',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INVENTORY + ASSETS
-- =========================================================

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location_type text not null default 'warehouse'
    check (location_type in ('warehouse','office','vehicle','technician','other')),
  site_id uuid references public.sites(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  unit text not null default 'each',
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  reorder_level numeric(12,2) not null default 0 check (reorder_level >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text unique,
  serial_number text,
  asset_type text not null,
  manufacturer text,
  model text,
  ownership text not null default 'company'
    check (ownership in ('company','customer','leased','other')),
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'available'
    check (status in ('available','assigned','in_use','repair','retired','lost')),
  purchase_date date,
  purchase_cost numeric(12,2) check (purchase_cost is null or purchase_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- WORK ORDERS + DISPATCH
-- =========================================================

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number text not null unique
    default ('WO-' || lpad(nextval('public.work_order_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  site_id uuid references public.sites(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,

  title text not null,
  description text,
  job_type text,

  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent','emergency')),

  status text not null default 'requested'
    check (status in (
      'requested',
      'planned',
      'assigned',
      'travelling',
      'on_site',
      'working',
      'waiting',
      'finished',
      'billing_ready',
      'closed',
      'cancelled'
    )),

  source text not null default 'office'
    check (source in ('office','phone','email','customer_portal','technician','other')),

  requested_at timestamptz not null default now(),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,

  customer_po text,
  completion_summary text,
  internal_notes text,

  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    scheduled_end is null
    or scheduled_start is null
    or scheduled_end >= scheduled_start
  )
);

create table if not exists public.work_order_assignments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete restrict,
  assignment_role text not null default 'primary'
    check (assignment_role in ('primary','helper','observer')),
  assignment_status text not null default 'assigned'
    check (assignment_status in ('assigned','accepted','declined','removed','completed')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  assigned_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id, technician_id)
);

create table if not exists public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  event_type text not null,
  old_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  note text not null,
  visibility text not null default 'internal'
    check (visibility in ('internal','customer')),
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0),
  billable boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.material_usage (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  billable boolean not null default true,
  recorded_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  transaction_type text not null
    check (transaction_type in (
      'receive','issue','return','transfer_in','transfer_out','adjustment','consume'
    )),
  quantity numeric(12,2) not null check (quantity <> 0),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  reference text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.asset_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  event_type text not null,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  from_site_id uuid references public.sites(id) on delete set null,
  to_site_id uuid references public.sites(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

-- =========================================================
-- BILLING
-- =========================================================

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
    default ('INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  site_id uuid references public.sites(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,

  status text not null default 'draft'
    check (status in (
      'draft','ready','sent','partial','paid','overdue','void'
    )),

  issued_date date,
  due_date date,
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),

  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12,2) not null default 0 check (balance_due >= 0),

  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (due_date is null or issued_date is null or due_date >= issued_date)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  line_type text not null
    check (line_type in ('labour','material','service','travel','equipment','other')),
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_total numeric(12,2)
    generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'other'
    check (payment_method in ('cash','cheque','credit_card','debit','eft','etransfer','other')),
  status text not null default 'posted'
    check (status in ('pending','posted','failed','refunded','void')),
  reference text,
  received_at timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles(id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_sites_customer on public.sites(customer_id);
create index if not exists idx_contacts_customer on public.contacts(customer_id);
create index if not exists idx_contacts_site on public.contacts(site_id);

create index if not exists idx_work_orders_customer on public.work_orders(customer_id);
create index if not exists idx_work_orders_site on public.work_orders(site_id);
create index if not exists idx_work_orders_status on public.work_orders(status);
create index if not exists idx_work_orders_priority on public.work_orders(priority);
create index if not exists idx_work_orders_schedule on public.work_orders(scheduled_start);

create index if not exists idx_assignments_work_order
  on public.work_order_assignments(work_order_id);
create index if not exists idx_assignments_technician
  on public.work_order_assignments(technician_id);
create index if not exists idx_work_order_events_work_order
  on public.work_order_events(work_order_id, created_at);
create index if not exists idx_work_order_notes_work_order
  on public.work_order_notes(work_order_id, created_at);
create index if not exists idx_time_entries_work_order
  on public.time_entries(work_order_id);
create index if not exists idx_time_entries_technician
  on public.time_entries(technician_id);
create index if not exists idx_material_usage_work_order
  on public.material_usage(work_order_id);

create index if not exists idx_assets_customer on public.assets(customer_id);
create index if not exists idx_assets_site on public.assets(site_id);
create index if not exists idx_assets_assigned_to on public.assets(assigned_to);
create index if not exists idx_inventory_transactions_item
  on public.inventory_transactions(inventory_item_id, created_at);
create index if not exists idx_inventory_transactions_work_order
  on public.inventory_transactions(work_order_id);

create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_work_order on public.invoices(work_order_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'customers',
    'sites',
    'contacts',
    'inventory_locations',
    'inventory_items',
    'assets',
    'work_orders',
    'work_order_assignments',
    'work_order_notes',
    'time_entries',
    'invoices'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I
       for each row execute function private.set_updated_at()',
      t, t
    );
  end loop;
end
$$;

-- =========================================================
-- PROFILE CREATION FROM SUPABASE AUTH
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill any Auth users that existed before this migration.
insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.email
from auth.users u
on conflict (id) do nothing;

-- =========================================================
-- RLS HELPERS
-- =========================================================

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active = true
  );
$$;

create or replace function private.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and p.active = true
      and ur.role = any(required_roles)
  );
$$;

create or replace function private.is_assigned_to_work_order(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.work_order_assignments a
    join public.profiles p on p.id = a.technician_id
    where a.work_order_id = target_work_order_id
      and a.technician_id = (select auth.uid())
      and a.assignment_status in ('assigned','accepted','completed')
      and p.active = true
  );
$$;

revoke all on function private.is_active_user() from public;
revoke all on function private.has_any_role(text[]) from public;
revoke all on function private.is_assigned_to_work_order(uuid) from public;

grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.has_any_role(text[]) to authenticated;
grant execute on function private.is_assigned_to_work_order(uuid) to authenticated;

-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.contacts enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.assets enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_assignments enable row level security;
alter table public.work_order_events enable row level security;
alter table public.work_order_notes enable row level security;
alter table public.time_entries enable row level security;
alter table public.material_usage enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.asset_history enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

-- No anonymous access to application data.
revoke all on table
  public.profiles,
  public.user_roles,
  public.customers,
  public.sites,
  public.contacts,
  public.inventory_locations,
  public.inventory_items,
  public.assets,
  public.work_orders,
  public.work_order_assignments,
  public.work_order_events,
  public.work_order_notes,
  public.time_entries,
  public.material_usage,
  public.inventory_transactions,
  public.asset_history,
  public.invoices,
  public.invoice_items,
  public.payments
from anon;

grant select, insert, update, delete on table
  public.profiles,
  public.user_roles,
  public.customers,
  public.sites,
  public.contacts,
  public.inventory_locations,
  public.inventory_items,
  public.assets,
  public.work_orders,
  public.work_order_assignments,
  public.work_order_events,
  public.work_order_notes,
  public.time_entries,
  public.material_usage,
  public.inventory_transactions,
  public.asset_history,
  public.invoices,
  public.invoice_items,
  public.payments
to authenticated;

grant usage, select on sequence
  public.work_order_number_seq,
  public.invoice_number_seq
to authenticated;

-- =========================================================
-- RLS POLICIES: PROFILES + ROLES
-- =========================================================

create policy "profiles_select_active_staff"
on public.profiles for select
to authenticated
using ((select private.is_active_user()));

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "profiles_admin_update"
on public.profiles for update
to authenticated
using ((select private.has_any_role(array['admin']::text[])))
with check ((select private.has_any_role(array['admin']::text[])));

create policy "user_roles_select_self_or_management"
on public.user_roles for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager']::text[]))
);

create policy "user_roles_admin_insert"
on public.user_roles for insert
to authenticated
with check ((select private.has_any_role(array['admin']::text[])));

create policy "user_roles_admin_update"
on public.user_roles for update
to authenticated
using ((select private.has_any_role(array['admin']::text[])))
with check ((select private.has_any_role(array['admin']::text[])));

create policy "user_roles_admin_delete"
on public.user_roles for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

-- =========================================================
-- RLS POLICIES: CUSTOMERS
-- =========================================================

create policy "customers_staff_select"
on public.customers for select
to authenticated
using ((select private.is_active_user()));

create policy "customers_ops_insert"
on public.customers for insert
to authenticated
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "customers_ops_update"
on public.customers for update
to authenticated
using ((select private.has_any_role(array['admin','manager','dispatcher']::text[])))
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "customers_admin_delete"
on public.customers for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "sites_staff_select"
on public.sites for select
to authenticated
using ((select private.is_active_user()));

create policy "sites_ops_insert"
on public.sites for insert
to authenticated
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "sites_ops_update"
on public.sites for update
to authenticated
using ((select private.has_any_role(array['admin','manager','dispatcher']::text[])))
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "sites_admin_delete"
on public.sites for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "contacts_staff_select"
on public.contacts for select
to authenticated
using ((select private.is_active_user()));

create policy "contacts_ops_insert"
on public.contacts for insert
to authenticated
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "contacts_ops_update"
on public.contacts for update
to authenticated
using ((select private.has_any_role(array['admin','manager','dispatcher']::text[])))
with check ((select private.has_any_role(array['admin','manager','dispatcher']::text[])));

create policy "contacts_admin_delete"
on public.contacts for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

-- =========================================================
-- RLS POLICIES: WORK ORDERS
-- =========================================================

create policy "work_orders_select_authorized"
on public.work_orders for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher','billing','inventory']::text[]))
  or (select private.is_assigned_to_work_order(id))
);

create policy "work_orders_ops_insert"
on public.work_orders for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "work_orders_ops_update"
on public.work_orders for update
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
)
with check (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "work_orders_admin_delete"
on public.work_orders for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "assignments_select_authorized"
on public.work_order_assignments for select
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher','billing','inventory']::text[]))
);

create policy "assignments_ops_insert"
on public.work_order_assignments for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "assignments_ops_update"
on public.work_order_assignments for update
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
)
with check (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "assignments_ops_delete"
on public.work_order_assignments for delete
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "events_select_authorized"
on public.work_order_events for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher','billing','inventory']::text[]))
  or (select private.is_assigned_to_work_order(work_order_id))
);

create policy "events_insert_authorized"
on public.work_order_events for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
  or (select private.is_assigned_to_work_order(work_order_id))
);

create policy "events_admin_delete"
on public.work_order_events for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "notes_select_authorized"
on public.work_order_notes for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher','billing','inventory']::text[]))
  or (select private.is_assigned_to_work_order(work_order_id))
);

create policy "notes_insert_authorized"
on public.work_order_notes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
    or (select private.is_assigned_to_work_order(work_order_id))
  )
);

create policy "notes_update_own_or_ops"
on public.work_order_notes for update
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
)
with check (
  created_by = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "notes_admin_delete"
on public.work_order_notes for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "time_entries_select_authorized"
on public.time_entries for select
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager','dispatcher','billing']::text[]))
);

create policy "time_entries_insert_authorized"
on public.time_entries for insert
to authenticated
with check (
  (
    technician_id = (select auth.uid())
    and (select private.is_assigned_to_work_order(work_order_id))
  )
  or (select private.has_any_role(array['admin','manager','dispatcher']::text[]))
);

create policy "time_entries_update_authorized"
on public.time_entries for update
to authenticated
using (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager']::text[]))
)
with check (
  technician_id = (select auth.uid())
  or (select private.has_any_role(array['admin','manager']::text[]))
);

create policy "time_entries_admin_delete"
on public.time_entries for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "material_usage_select_authorized"
on public.material_usage for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','dispatcher','billing','inventory']::text[]))
  or (select private.is_assigned_to_work_order(work_order_id))
);

create policy "material_usage_insert_authorized"
on public.material_usage for insert
to authenticated
with check (
  recorded_by = (select auth.uid())
  and (
    (select private.has_any_role(array['admin','manager','dispatcher','inventory']::text[]))
    or (select private.is_assigned_to_work_order(work_order_id))
  )
);

create policy "material_usage_admin_delete"
on public.material_usage for delete
to authenticated
using (
  (select private.has_any_role(array['admin','manager','inventory']::text[]))
);

-- =========================================================
-- RLS POLICIES: INVENTORY + ASSETS
-- =========================================================

create policy "inventory_locations_staff_select"
on public.inventory_locations for select
to authenticated
using ((select private.is_active_user()));

create policy "inventory_locations_manage"
on public.inventory_locations for all
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

create policy "inventory_items_staff_select"
on public.inventory_items for select
to authenticated
using ((select private.is_active_user()));

create policy "inventory_items_manage"
on public.inventory_items for all
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

create policy "assets_staff_select"
on public.assets for select
to authenticated
using ((select private.is_active_user()));

create policy "assets_manage"
on public.assets for all
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

create policy "inventory_transactions_staff_select"
on public.inventory_transactions for select
to authenticated
using ((select private.is_active_user()));

create policy "inventory_transactions_staff_insert"
on public.inventory_transactions for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_any_role(array['admin','manager','dispatcher','technician','inventory']::text[]))
);

create policy "inventory_transactions_manage_update"
on public.inventory_transactions for update
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

create policy "inventory_transactions_manage_delete"
on public.inventory_transactions for delete
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])));

create policy "asset_history_staff_select"
on public.asset_history for select
to authenticated
using ((select private.is_active_user()));

create policy "asset_history_staff_insert"
on public.asset_history for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_any_role(array['admin','manager','dispatcher','technician','inventory']::text[]))
);

create policy "asset_history_admin_delete"
on public.asset_history for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

-- =========================================================
-- RLS POLICIES: BILLING
-- =========================================================

create policy "invoices_authorized_select"
on public.invoices for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing','dispatcher']::text[]))
);

create policy "invoices_billing_insert"
on public.invoices for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "invoices_billing_update"
on public.invoices for update
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
)
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "invoices_admin_delete"
on public.invoices for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));

create policy "invoice_items_authorized_select"
on public.invoice_items for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing','dispatcher']::text[]))
);

create policy "invoice_items_billing_insert"
on public.invoice_items for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "invoice_items_billing_update"
on public.invoice_items for update
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
)
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "invoice_items_billing_delete"
on public.invoice_items for delete
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "payments_authorized_select"
on public.payments for select
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "payments_billing_insert"
on public.payments for insert
to authenticated
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "payments_billing_update"
on public.payments for update
to authenticated
using (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
)
with check (
  (select private.has_any_role(array['admin','manager','billing']::text[]))
);

create policy "payments_admin_delete"
on public.payments for delete
to authenticated
using ((select private.has_any_role(array['admin']::text[])));
