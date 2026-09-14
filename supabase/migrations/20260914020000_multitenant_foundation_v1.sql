-- FIELDOPS MULTI-TENANT FOUNDATION V1
-- Shared application, isolated company data. Existing data is preserved under iTBest.

begin;

create schema if not exists private;

-- ============================================================
-- ORGANIZATIONS + ONE ACTIVE COMPANY PER USER (V1)
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  legal_name text,
  status text not null default 'active'
    check (status in ('active','suspended','cancelled')),
  plan text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_not_blank check (btrim(slug) <> ''),
  constraint organizations_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists uq_organizations_slug_ci
  on public.organizations(lower(btrim(slug)));

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_organization_memberships_org
  on public.organization_memberships(organization_id, active);

insert into public.organizations(slug,name,legal_name,status,plan)
select
  'itbest',
  coalesce(nullif(btrim(s.company_name),''),'iTBest'),
  nullif(btrim(s.legal_name),''),
  'active',
  'standard'
from public.fieldops_settings s
where s.id=1
on conflict do nothing;

insert into public.organization_memberships(organization_id,user_id,active,is_owner)
select
  o.id,
  p.id,
  true,
  exists (
    select 1 from public.user_roles ur
    where ur.user_id=p.id and ur.role='admin'
  )
from public.profiles p
cross join public.organizations o
where o.slug='itbest'
on conflict (user_id) do update set
  organization_id=excluded.organization_id,
  active=true,
  updated_at=now();

-- ============================================================
-- TENANT CONTEXT
-- ============================================================

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select m.organization_id
  from public.organization_memberships m
  join public.profiles p on p.id=m.user_id
  join public.organizations o on o.id=m.organization_id
  where m.user_id=(select auth.uid())
    and m.active=true
    and p.active=true
    and o.status='active'
  limit 1;
$$;

revoke all on function private.current_organization_id() from public;

create or replace function private.is_current_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_organization_id is not null
     and p_organization_id=private.current_organization_id();
$$;

revoke all on function private.is_current_organization(uuid) from public;

-- ============================================================
-- ADD organization_id TO EVERY BUSINESS TABLE
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    execute format('alter table public.%I add column if not exists organization_id uuid',t);
  end loop;
end
$$;

do $$
declare
  t text;
  org_id uuid;
begin
  select id into org_id from public.organizations where slug='itbest';
  if org_id is null then raise exception 'iTBest seed organization was not created.'; end if;

  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    execute format('update public.%I set organization_id=$1 where organization_id is null',t) using org_id;
  end loop;
end
$$;

-- A newly invited auth user can briefly have a profile before membership provisioning.
-- Every operational row must always have a tenant.
do $$
declare
  t text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    execute format('alter table public.%I alter column organization_id set not null',t);
  end loop;
end
$$;

-- Organization FK + lookup index on every tenant table.
do $$
declare
  t text;
  c text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    c:='fk_'||t||'_organization';
    if not exists(
      select 1 from pg_constraint
      where conrelid=format('public.%I',t)::regclass and conname=c
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (organization_id) references public.organizations(id) on delete restrict',
        t,c
      );
    end if;
    execute format('create index if not exists %I on public.%I(organization_id)','idx_'||t||'_organization',t);
  end loop;
end
$$;

-- ============================================================
-- SETTINGS BECOME ONE ROW PER ORGANIZATION
-- ============================================================

alter table public.fieldops_settings drop constraint if exists fieldops_settings_id_check;
alter table public.fieldops_settings alter column id type bigint using id::bigint;
create sequence if not exists public.fieldops_settings_id_seq;
select setval(
  'public.fieldops_settings_id_seq'::regclass,
  greatest(coalesce((select max(id) from public.fieldops_settings),1),1),
  true
);
alter table public.fieldops_settings
  alter column id set default nextval('public.fieldops_settings_id_seq'::regclass);
alter sequence public.fieldops_settings_id_seq owned by public.fieldops_settings.id;
create unique index if not exists uq_fieldops_settings_organization
  on public.fieldops_settings(organization_id);

-- ============================================================
-- TENANT GUARD: ENFORCES WRITES EVEN INSIDE SECURITY DEFINER RPCS
-- ============================================================

create or replace function private.fieldops_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  caller_org uuid;
begin
  -- Trusted backend/migration operations do not have auth.uid().
  -- Anonymous users are blocked separately from FieldOps RPC execution.
  if (select auth.uid()) is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  caller_org:=private.current_organization_id();
  if caller_org is null then raise exception 'No active FieldOps organization is assigned to this user.'; end if;

  if tg_op='INSERT' then
    if new.organization_id is null then
      new.organization_id:=caller_org;
    elsif new.organization_id<>caller_org then
      raise exception 'Cross-company insert blocked.';
    end if;
    return new;
  elsif tg_op='UPDATE' then
    if old.organization_id is distinct from caller_org then raise exception 'Cross-company update blocked.'; end if;
    if new.organization_id is distinct from old.organization_id then raise exception 'A record cannot be moved between companies.'; end if;
    return new;
  elsif tg_op='DELETE' then
    if old.organization_id is distinct from caller_org then raise exception 'Cross-company delete blocked.'; end if;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function private.fieldops_tenant_guard() from public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    execute format('drop trigger if exists a_fieldops_tenant_guard on public.%I',t);
    execute format(
      'create trigger a_fieldops_tenant_guard before insert or update or delete on public.%I for each row execute function private.fieldops_tenant_guard()',t
    );
  end loop;
end
$$;

create or replace function private.fieldops_sync_profile_organization()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.profiles
  set organization_id=new.organization_id,updated_at=now()
  where id=new.user_id;
  return new;
end;
$$;

revoke all on function private.fieldops_sync_profile_organization() from public;
drop trigger if exists trg_fieldops_sync_profile_organization on public.organization_memberships;
create trigger trg_fieldops_sync_profile_organization
after insert or update of organization_id on public.organization_memberships
for each row execute function private.fieldops_sync_profile_organization();

-- ============================================================
-- RESTRICTIVE RLS TENANT BOUNDARY
-- Existing permissive role policies remain in place.
-- ============================================================

do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_compensation','technician_notes',
    'technician_profiles','technician_schedule_events','technician_skills','time_entries',
    'time_entry_corrections','user_roles','work_order_assignments','work_order_events',
    'work_order_notes','work_orders'
  ]
  loop
    execute format('alter table public.%I enable row level security',t);
    p:='tenant_isolation_'||t;
    execute format('drop policy if exists %I on public.%I',p,t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (organization_id=private.current_organization_id()) with check (organization_id=private.current_organization_id())',
      p,t
    );
  end loop;
end
$$;

alter table public.organizations enable row level security;
drop policy if exists organizations_current_tenant_select on public.organizations;
create policy organizations_current_tenant_select
on public.organizations for select to authenticated
using (id=private.current_organization_id());

alter table public.organization_memberships enable row level security;
drop policy if exists organization_memberships_current_tenant_select on public.organization_memberships;
create policy organization_memberships_current_tenant_select
on public.organization_memberships for select to authenticated
using (
  organization_id=private.current_organization_id()
  and (
    user_id=(select auth.uid())
    or private.has_any_role(array['admin','manager']::text[])
  )
);

-- ============================================================
-- AUTHORIZATION HELPERS BECOME TENANT-AWARE
-- ============================================================

create or replace function private.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.user_roles ur
    join public.profiles p
      on p.id=ur.user_id and p.organization_id=ur.organization_id
    join public.organization_memberships m
      on m.user_id=ur.user_id and m.organization_id=ur.organization_id and m.active=true
    where ur.user_id=(select auth.uid())
      and ur.organization_id=private.current_organization_id()
      and p.active=true
      and ur.role=any(required_roles)
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.profiles p
    join public.organization_memberships m
      on m.user_id=p.id and m.organization_id=p.organization_id and m.active=true
    where p.id=(select auth.uid())
      and p.organization_id=private.current_organization_id()
      and p.active=true
  );
$$;

create or replace function private.is_assigned_to_work_order(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.work_order_assignments a
    join public.profiles p
      on p.id=a.technician_id and p.organization_id=a.organization_id
    where a.work_order_id=target_work_order_id
      and a.organization_id=private.current_organization_id()
      and a.technician_id=(select auth.uid())
      and a.assignment_status in ('assigned','accepted','completed')
      and p.active=true
  );
$$;

create or replace function private.fieldops_has_active_primary_assignment(target_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.work_order_assignments a
    where a.work_order_id=target_work_order_id
      and a.organization_id=private.current_organization_id()
      and a.assignment_role='primary'
      and a.assignment_status not in ('removed','declined','completed')
      and a.released_at is null
  );
$$;

-- ============================================================
-- COMPOSITE TENANT FOREIGN KEYS
-- Child rows cannot reference parent records from another company.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'asset_documents','asset_history','asset_maintenance','asset_notes','assets',
    'contacts','customer_contacts','customer_notes','customers',
    'fieldops_settings','fieldops_settings_audit',
    'inventory_item_notes','inventory_item_suppliers','inventory_items','inventory_locations',
    'inventory_purchase_order_items','inventory_purchase_orders','inventory_receipt_items','inventory_receipts',
    'inventory_reconciliation_lines','inventory_reconciliations','inventory_return_items','inventory_returns',
    'inventory_suppliers','inventory_transactions',
    'invoice_adjustments','invoice_events','invoice_items','invoices','material_usage','payments',
    'profiles','sites','technician_certifications','technician_notes','technician_schedule_events',
    'technician_skills','time_entries','time_entry_corrections','work_order_assignments',
    'work_order_events','work_order_notes','work_orders'
  ]
  loop
    if exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='id'
    ) then
      execute format(
        'create unique index if not exists %I on public.%I(organization_id,id)',
        'uq_'||t||'_organization_id_id',t
      );
    end if;
  end loop;
end
$$;

do $$
declare
  r record;
  cname text;
begin
  for r in
    select
      child.relname child_table,
      parent.relname parent_table,
      child_att.attname child_column,
      parent_att.attname parent_column,
      con.oid
    from pg_constraint con
    join pg_class child on child.oid=con.conrelid
    join pg_namespace child_ns on child_ns.oid=child.relnamespace
    join pg_class parent on parent.oid=con.confrelid
    join pg_namespace parent_ns on parent_ns.oid=parent.relnamespace
    join pg_attribute child_att on child_att.attrelid=con.conrelid and child_att.attnum=con.conkey[1]
    join pg_attribute parent_att on parent_att.attrelid=con.confrelid and parent_att.attnum=con.confkey[1]
    where con.contype='f'
      and child_ns.nspname='public'
      and parent_ns.nspname='public'
      and array_length(con.conkey,1)=1
      and array_length(con.confkey,1)=1
      and parent_att.attname='id'
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name=child.relname and column_name='organization_id')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name=parent.relname and column_name='organization_id')
  loop
    cname:='mtfk_'||substr(md5(r.oid::text),1,20);
    if not exists(
      select 1 from pg_constraint
      where conrelid=format('public.%I',r.child_table)::regclass and conname=cname
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (organization_id,%I) references public.%I(organization_id,id) not valid',
        r.child_table,cname,r.child_column,r.parent_table
      );
      execute format('alter table public.%I validate constraint %I',r.child_table,cname);
    end if;
  end loop;
end
$$;

-- ============================================================
-- GLOBAL BUSINESS IDENTIFIERS BECOME UNIQUE PER COMPANY
-- ============================================================

alter table public.assets drop constraint if exists assets_asset_tag_key;
alter table public.customers drop constraint if exists customers_account_code_key;
alter table public.inventory_items drop constraint if exists inventory_items_sku_key;
alter table public.inventory_locations drop constraint if exists inventory_locations_name_key;
alter table public.inventory_purchase_orders drop constraint if exists inventory_purchase_orders_po_number_key;
alter table public.inventory_receipts drop constraint if exists inventory_receipts_receipt_number_key;
alter table public.inventory_reconciliations drop constraint if exists inventory_reconciliations_reconciliation_number_key;
alter table public.inventory_returns drop constraint if exists inventory_returns_return_number_key;
alter table public.inventory_suppliers drop constraint if exists inventory_suppliers_supplier_number_key;
alter table public.invoices drop constraint if exists invoices_invoice_number_key;
alter table public.work_orders drop constraint if exists work_orders_work_order_number_key;

drop index if exists public.uq_customers_account_number;
drop index if exists public.uq_inventory_items_barcode_ci;
drop index if exists public.uq_inventory_items_part_number_ci;
drop index if exists public.uq_inventory_locations_code_ci;
drop index if exists public.uq_inventory_suppliers_name_ci;
drop index if exists public.uq_technician_profiles_employee_number;

create unique index if not exists uq_assets_org_asset_tag on public.assets(organization_id,asset_tag) where asset_tag is not null;
create unique index if not exists uq_customers_org_account_code on public.customers(organization_id,account_code) where account_code is not null;
create unique index if not exists uq_customers_org_account_number on public.customers(organization_id,lower(account_number)) where account_number is not null;
create unique index if not exists uq_inventory_items_org_sku on public.inventory_items(organization_id,sku) where sku is not null;
create unique index if not exists uq_inventory_items_org_barcode_ci on public.inventory_items(organization_id,lower(btrim(barcode))) where barcode is not null and btrim(barcode)<>'';
create unique index if not exists uq_inventory_items_org_part_number_ci on public.inventory_items(organization_id,lower(btrim(part_number))) where part_number is not null and btrim(part_number)<>'';
create unique index if not exists uq_inventory_locations_org_name on public.inventory_locations(organization_id,name);
create unique index if not exists uq_inventory_locations_org_code_ci on public.inventory_locations(organization_id,lower(btrim(code))) where code is not null and btrim(code)<>'';
create unique index if not exists uq_inventory_purchase_orders_org_number on public.inventory_purchase_orders(organization_id,po_number);
create unique index if not exists uq_inventory_receipts_org_number on public.inventory_receipts(organization_id,receipt_number);
create unique index if not exists uq_inventory_reconciliations_org_number on public.inventory_reconciliations(organization_id,reconciliation_number);
create unique index if not exists uq_inventory_returns_org_number on public.inventory_returns(organization_id,return_number);
create unique index if not exists uq_inventory_suppliers_org_number on public.inventory_suppliers(organization_id,supplier_number);
create unique index if not exists uq_inventory_suppliers_org_name_ci on public.inventory_suppliers(organization_id,lower(btrim(name)));
create unique index if not exists uq_invoices_org_number on public.invoices(organization_id,invoice_number);
create unique index if not exists uq_technician_profiles_org_employee_number on public.technician_profiles(organization_id,employee_number) where employee_number is not null and btrim(employee_number)<>'';
create unique index if not exists uq_work_orders_org_number on public.work_orders(organization_id,work_order_number);

-- ============================================================
-- NEW ORGANIZATIONS AUTOMATICALLY RECEIVE THEIR OWN SETTINGS ROW
-- ============================================================

create or replace function private.fieldops_create_organization_settings()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.fieldops_settings(organization_id,company_name,legal_name)
  values(new.id,new.name,new.legal_name)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

revoke all on function private.fieldops_create_organization_settings() from public;
drop trigger if exists trg_fieldops_create_organization_settings on public.organizations;
create trigger trg_fieldops_create_organization_settings
after insert on public.organizations
for each row execute function private.fieldops_create_organization_settings();

-- ============================================================
-- PATCH FUNCTIONS THAT USED THE OLD GLOBAL settings id=1 ROW
-- ============================================================

do $$
declare
  r record;
  fn text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private')
      and p.prokind='f'
      and p.proname<>'fieldops_reset_it_demo_data'
      and pg_get_functiondef(p.oid) ilike '%fieldops_settings%'
  loop
    fn:=pg_get_functiondef(r.oid);
    fn:=replace(fn,'from public.fieldops_settings where id=1','from public.fieldops_settings where organization_id = private.current_organization_id()');
    fn:=replace(fn,'from public.fieldops_settings where id = 1','from public.fieldops_settings where organization_id = private.current_organization_id()');
    fn:=replace(fn,'from public.fieldops_settings s where s.id = 1','from public.fieldops_settings s where s.organization_id = private.current_organization_id()');
    fn:=replace(fn,'from public.fieldops_settings s'||chr(10)||'  where s.id = 1','from public.fieldops_settings s'||chr(10)||'  where s.organization_id = private.current_organization_id()');
    execute fn;
  end loop;
end
$$;

-- Role editing must never target a user from another company.
create or replace function public.fieldops_set_user_roles(p_user_id uuid,p_roles text[])
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  allowed constant text[]:=array['admin','manager','dispatcher','technician','billing','inventory']::text[];
  clean_roles text[];
  target_is_admin boolean;
  other_active_admins integer;
  org_id uuid:=private.current_organization_id();
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if org_id is null then raise exception 'No active organization is assigned.'; end if;
  if not private.has_any_role(array['admin']::text[]) then raise exception 'Only an Admin can change user roles.'; end if;

  if not exists(select 1 from public.profiles p where p.id=p_user_id and p.organization_id=org_id) then
    raise exception 'User profile not found in this company.';
  end if;

  select coalesce(array_agg(distinct lower(btrim(role))) filter(where btrim(role)<>''),'{}'::text[])
  into clean_roles
  from unnest(coalesce(p_roles,'{}'::text[])) as r(role);

  if cardinality(clean_roles)=0 then raise exception 'An active user must have at least one role.'; end if;
  if exists(select 1 from unnest(clean_roles) as rr(role) where not(role=any(allowed))) then
    raise exception 'One or more roles are not supported by FieldOps.';
  end if;

  select exists(select 1 from public.user_roles ur where ur.user_id=p_user_id and ur.organization_id=org_id and ur.role='admin')
  into target_is_admin;

  if target_is_admin and not('admin'=any(clean_roles)) then
    select count(*)::integer into other_active_admins
    from public.user_roles ur
    join public.profiles p on p.id=ur.user_id and p.organization_id=ur.organization_id and p.active=true
    where ur.organization_id=org_id and ur.role='admin' and ur.user_id<>p_user_id;
    if other_active_admins=0 then raise exception 'This company must keep at least one active Admin.'; end if;
  end if;

  delete from public.user_roles where user_id=p_user_id and organization_id=org_id;
  insert into public.user_roles(user_id,role,organization_id)
  select p_user_id,role,org_id from unnest(clean_roles) as r(role);

  insert into public.fieldops_settings_audit(event_type,target_user_id,details,created_by,organization_id)
  values('user_roles_changed',p_user_id,jsonb_build_object('roles',clean_roles),auth.uid(),org_id);

  return jsonb_build_object('user_id',p_user_id,'roles',clean_roles);
end;
$$;

create or replace function public.fieldops_set_user_active(p_user_id uuid,p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  target_is_admin boolean;
  other_active_admins integer;
  org_id uuid:=private.current_organization_id();
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if org_id is null then raise exception 'No active organization is assigned.'; end if;
  if not private.has_any_role(array['admin']::text[]) then raise exception 'Only an Admin can change account activation.'; end if;
  if p_user_id=auth.uid() and p_active=false then raise exception 'You cannot deactivate your own FieldOps account.'; end if;

  if not exists(select 1 from public.profiles p where p.id=p_user_id and p.organization_id=org_id) then
    raise exception 'User profile not found in this company.';
  end if;

  select exists(select 1 from public.user_roles ur where ur.user_id=p_user_id and ur.organization_id=org_id and ur.role='admin')
  into target_is_admin;

  if target_is_admin and p_active=false then
    select count(*)::integer into other_active_admins
    from public.user_roles ur
    join public.profiles p on p.id=ur.user_id and p.organization_id=ur.organization_id and p.active=true
    where ur.organization_id=org_id and ur.role='admin' and ur.user_id<>p_user_id;
    if other_active_admins=0 then raise exception 'This company must keep at least one active Admin.'; end if;
  end if;

  update public.profiles set active=p_active,updated_at=now()
  where id=p_user_id and organization_id=org_id;

  insert into public.fieldops_settings_audit(event_type,target_user_id,details,created_by,organization_id)
  values(case when p_active then 'user_reactivated' else 'user_deactivated' end,p_user_id,jsonb_build_object('active',p_active),auth.uid(),org_id);

  return jsonb_build_object('user_id',p_user_id,'active',p_active);
end;
$$;

-- The old demo reset TRUNCATEs shared tables and is unsafe in SaaS mode.
create or replace function public.fieldops_reset_it_demo_data()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'Global demo reset is disabled in multi-tenant FieldOps.';
end;
$$;

create or replace function public.fieldops_current_organization()
returns table(id uuid,slug text,name text,legal_name text,status text,plan text)
language sql
stable
security definer
set search_path=''
as $$
  select o.id,o.slug,o.name,o.legal_name,o.status,o.plan
  from public.organizations o
  where o.id=private.current_organization_id();
$$;

revoke all on function public.fieldops_current_organization() from public;
grant execute on function public.fieldops_current_organization() to authenticated;

-- ============================================================
-- CLOSE ANONYMOUS SECURITY-DEFINER RPC ACCESS
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.proname like 'fieldops_%'
  loop
    execute format('revoke execute on function %I.%I(%s) from anon',r.nspname,r.proname,r.args);
  end loop;
end
$$;

revoke execute on function public.fieldops_reset_it_demo_data() from authenticated;

-- Existing profile/membership mapping must be internally consistent.
do $$
declare
  bad_count bigint;
begin
  select count(*) into bad_count
  from public.profiles p
  left join public.organization_memberships m
    on m.user_id=p.id and m.organization_id=p.organization_id
  where p.organization_id is not null and m.id is null;
  if bad_count>0 then raise exception 'Tenant migration consistency check failed for profiles.'; end if;
end
$$;

commit;
