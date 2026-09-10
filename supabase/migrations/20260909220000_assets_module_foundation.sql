-- FIELDOPS ASSETS MODULE FOUNDATION V1
-- Builds on the existing public.assets and public.asset_history tables.
-- Assets remain individually tracked serialized equipment; quantity-based stock
-- remains in the Inventory module.

begin;

-- ============================================================
-- ASSET REGISTER EXTENSIONS
-- ============================================================

create sequence if not exists public.asset_tag_seq start with 1001;

alter table public.assets
  add column if not exists asset_name text,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists condition text not null default 'good',
  add column if not exists replacement_cost numeric(12,2),
  add column if not exists purchase_vendor text,
  add column if not exists purchase_order text,
  add column if not exists warranty_expires_on date,
  add column if not exists in_service_date date,
  add column if not exists next_service_date date,
  add column if not exists current_work_order_id uuid references public.work_orders(id) on delete set null,
  add column if not exists inventory_location_id uuid references public.inventory_locations(id) on delete set null,
  add column if not exists retired_at timestamptz,
  add column if not exists disposed_at timestamptz,
  add column if not exists disposal_method text;

alter table public.assets
  alter column asset_tag set default ('AST-' || lpad(nextval('public.asset_tag_seq')::text, 6, '0'));

alter table public.assets
  drop constraint if exists assets_status_check;

alter table public.assets
  add constraint assets_status_check
  check (status in ('available','assigned','in_use','repair','retired','lost','disposed'));

alter table public.assets
  drop constraint if exists assets_condition_check;

alter table public.assets
  add constraint assets_condition_check
  check (condition in ('excellent','good','fair','poor','damaged'));

alter table public.assets
  drop constraint if exists assets_replacement_cost_check;

alter table public.assets
  add constraint assets_replacement_cost_check
  check (replacement_cost is null or replacement_cost >= 0);

create index if not exists idx_assets_current_work_order
  on public.assets(current_work_order_id)
  where current_work_order_id is not null;

create index if not exists idx_assets_inventory_location
  on public.assets(inventory_location_id)
  where inventory_location_id is not null;

create index if not exists idx_assets_status
  on public.assets(status);

create index if not exists idx_assets_next_service
  on public.assets(next_service_date)
  where next_service_date is not null;

-- Keep the existing generic updated_at trigger contract.
drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
before update on public.assets
for each row execute function private.set_updated_at();

-- ============================================================
-- ASSET HISTORY EXTENSIONS
-- Existing columns remain intact; these additions allow every transition to
-- reconstruct technician, customer, site, work-order, storage and status state.
-- ============================================================

alter table public.asset_history
  add column if not exists from_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists to_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists from_work_order_id uuid references public.work_orders(id) on delete set null,
  add column if not exists to_work_order_id uuid references public.work_orders(id) on delete set null,
  add column if not exists from_location_id uuid references public.inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references public.inventory_locations(id) on delete set null,
  add column if not exists from_status text,
  add column if not exists to_status text,
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists idx_asset_history_asset_created
  on public.asset_history(asset_id, created_at desc);

create index if not exists idx_asset_history_work_order_refs
  on public.asset_history(work_order_id, to_work_order_id, from_work_order_id);

-- ============================================================
-- MAINTENANCE / SERVICE HISTORY
-- ============================================================

create table if not exists public.asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  maintenance_type text not null default 'preventive'
    check (maintenance_type in ('preventive','repair','inspection','calibration','service','other')),
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','cancelled')),
  title text not null check (btrim(title) <> ''),
  description text,
  provider text,
  scheduled_date date,
  completed_date date,
  cost numeric(12,2) check (cost is null or cost >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_date is null or scheduled_date is null or completed_date >= scheduled_date)
);

create index if not exists idx_asset_maintenance_asset
  on public.asset_maintenance(asset_id, created_at desc);

create index if not exists idx_asset_maintenance_due
  on public.asset_maintenance(status, scheduled_date)
  where status in ('planned','in_progress');

drop trigger if exists trg_asset_maintenance_updated_at on public.asset_maintenance;
create trigger trg_asset_maintenance_updated_at
before update on public.asset_maintenance
for each row execute function private.set_updated_at();

-- ============================================================
-- DOCUMENT LINKS + INTERNAL NOTES
-- ============================================================

create table if not exists public.asset_documents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  document_type text not null default 'other'
    check (document_type in ('manual','warranty','purchase','inspection','calibration','registration','photo','other')),
  name text not null check (btrim(name) <> ''),
  url text not null check (url ~* '^https?://'),
  expires_on date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_asset_documents_asset
  on public.asset_documents(asset_id, created_at desc);

create index if not exists idx_asset_documents_expiry
  on public.asset_documents(expires_on)
  where expires_on is not null;

drop trigger if exists trg_asset_documents_updated_at on public.asset_documents;
create trigger trg_asset_documents_updated_at
before update on public.asset_documents
for each row execute function private.set_updated_at();

create table if not exists public.asset_notes (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  note text not null check (length(btrim(note)) >= 3),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_asset_notes_asset_created
  on public.asset_notes(asset_id, created_at desc);

-- ============================================================
-- ROLE-SAFE ATOMIC ASSET RPCS
-- ============================================================

create or replace function public.fieldops_create_asset(
  p_asset_tag text,
  p_asset_name text,
  p_serial_number text,
  p_asset_type text,
  p_category text,
  p_manufacturer text,
  p_model text,
  p_description text,
  p_ownership text,
  p_status text,
  p_condition text,
  p_purchase_date date,
  p_purchase_cost numeric,
  p_replacement_cost numeric,
  p_purchase_vendor text,
  p_purchase_order text,
  p_warranty_expires_on date,
  p_in_service_date date,
  p_next_service_date date,
  p_disposal_method text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_asset public.assets%rowtype;
  resolved_tag text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can create assets.';
  end if;

  if nullif(btrim(p_asset_type), '') is null then
    raise exception 'Asset type is required.';
  end if;

  if p_ownership not in ('company','customer','leased','other') then
    raise exception 'Invalid asset ownership.';
  end if;

  if p_status not in ('available','repair','retired','lost','disposed') then
    raise exception 'Create the asset first, then use Change Assignment for Assigned or In Service status.';
  end if;

  if p_condition not in ('excellent','good','fair','poor','damaged') then
    raise exception 'Invalid asset condition.';
  end if;

  if p_purchase_cost is not null and p_purchase_cost < 0 then
    raise exception 'Purchase cost cannot be negative.';
  end if;

  if p_replacement_cost is not null and p_replacement_cost < 0 then
    raise exception 'Replacement cost cannot be negative.';
  end if;

  resolved_tag := coalesce(
    nullif(btrim(p_asset_tag), ''),
    'AST-' || lpad(nextval('public.asset_tag_seq')::text, 6, '0')
  );

  insert into public.assets (
    asset_tag,
    asset_name,
    serial_number,
    asset_type,
    category,
    manufacturer,
    model,
    description,
    ownership,
    status,
    condition,
    purchase_date,
    purchase_cost,
    replacement_cost,
    purchase_vendor,
    purchase_order,
    warranty_expires_on,
    in_service_date,
    next_service_date,
    retired_at,
    disposed_at,
    disposal_method,
    notes
  ) values (
    resolved_tag,
    nullif(btrim(p_asset_name), ''),
    nullif(btrim(p_serial_number), ''),
    btrim(p_asset_type),
    nullif(btrim(p_category), ''),
    nullif(btrim(p_manufacturer), ''),
    nullif(btrim(p_model), ''),
    nullif(btrim(p_description), ''),
    p_ownership,
    p_status,
    p_condition,
    p_purchase_date,
    p_purchase_cost,
    p_replacement_cost,
    nullif(btrim(p_purchase_vendor), ''),
    nullif(btrim(p_purchase_order), ''),
    p_warranty_expires_on,
    p_in_service_date,
    p_next_service_date,
    case when p_status = 'retired' then pg_catalog.now() else null end,
    case when p_status = 'disposed' then pg_catalog.now() else null end,
    nullif(btrim(p_disposal_method), ''),
    nullif(btrim(p_notes), '')
  )
  returning * into new_asset;

  insert into public.asset_history (
    asset_id,
    event_type,
    to_status,
    details,
    notes,
    created_by
  ) values (
    new_asset.id,
    'created',
    new_asset.status,
    jsonb_build_object(
      'asset_tag', new_asset.asset_tag,
      'asset_type', new_asset.asset_type,
      'condition', new_asset.condition
    ),
    'Asset record created.',
    (select auth.uid())
  );

  return jsonb_build_object('asset_id', new_asset.id, 'asset_tag', new_asset.asset_tag, 'created', true);
end;
$$;

create or replace function public.fieldops_update_asset(
  p_asset_id uuid,
  p_asset_tag text,
  p_asset_name text,
  p_serial_number text,
  p_asset_type text,
  p_category text,
  p_manufacturer text,
  p_model text,
  p_description text,
  p_ownership text,
  p_status text,
  p_condition text,
  p_purchase_date date,
  p_purchase_cost numeric,
  p_replacement_cost numeric,
  p_purchase_vendor text,
  p_purchase_order text,
  p_warranty_expires_on date,
  p_in_service_date date,
  p_next_service_date date,
  p_disposal_method text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_asset public.assets%rowtype;
  updated_asset public.assets%rowtype;
  clear_assignment boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can edit assets.';
  end if;

  select * into old_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found.';
  end if;

  if nullif(btrim(p_asset_type), '') is null then
    raise exception 'Asset type is required.';
  end if;

  if p_ownership not in ('company','customer','leased','other') then
    raise exception 'Invalid asset ownership.';
  end if;

  if p_status not in ('available','assigned','in_use','repair','retired','lost','disposed') then
    raise exception 'Invalid asset status.';
  end if;

  if p_condition not in ('excellent','good','fair','poor','damaged') then
    raise exception 'Invalid asset condition.';
  end if;

  if p_status = 'assigned'
     and old_asset.assigned_to is null
     and old_asset.customer_id is null
     and old_asset.site_id is null then
    raise exception 'Assigned status requires a current technician, customer or site assignment. Use Change Assignment.';
  end if;

  if p_status = 'in_use' and old_asset.current_work_order_id is null then
    raise exception 'In Service status requires a current work-order assignment. Use Change Assignment.';
  end if;

  clear_assignment := p_status in ('available','retired','lost','disposed');

  update public.assets
  set
    asset_tag = coalesce(nullif(btrim(p_asset_tag), ''), asset_tag),
    asset_name = nullif(btrim(p_asset_name), ''),
    serial_number = nullif(btrim(p_serial_number), ''),
    asset_type = btrim(p_asset_type),
    category = nullif(btrim(p_category), ''),
    manufacturer = nullif(btrim(p_manufacturer), ''),
    model = nullif(btrim(p_model), ''),
    description = nullif(btrim(p_description), ''),
    ownership = p_ownership,
    status = p_status,
    condition = p_condition,
    purchase_date = p_purchase_date,
    purchase_cost = p_purchase_cost,
    replacement_cost = p_replacement_cost,
    purchase_vendor = nullif(btrim(p_purchase_vendor), ''),
    purchase_order = nullif(btrim(p_purchase_order), ''),
    warranty_expires_on = p_warranty_expires_on,
    in_service_date = p_in_service_date,
    next_service_date = p_next_service_date,
    assigned_to = case when clear_assignment then null else assigned_to end,
    customer_id = case when clear_assignment then null else customer_id end,
    site_id = case when clear_assignment then null else site_id end,
    current_work_order_id = case when clear_assignment then null else current_work_order_id end,
    inventory_location_id = case when clear_assignment then null else inventory_location_id end,
    retired_at = case
      when p_status = 'retired' and old_asset.status <> 'retired' then pg_catalog.now()
      when p_status <> 'retired' then null
      else retired_at
    end,
    disposed_at = case
      when p_status = 'disposed' and old_asset.status <> 'disposed' then pg_catalog.now()
      when p_status <> 'disposed' then null
      else disposed_at
    end,
    disposal_method = nullif(btrim(p_disposal_method), ''),
    notes = nullif(btrim(p_notes), '')
  where id = p_asset_id
  returning * into updated_asset;

  insert into public.asset_history (
    asset_id,
    work_order_id,
    event_type,
    from_user_id,
    to_user_id,
    from_site_id,
    to_site_id,
    from_customer_id,
    to_customer_id,
    from_work_order_id,
    to_work_order_id,
    from_location_id,
    to_location_id,
    from_status,
    to_status,
    details,
    notes,
    created_by
  ) values (
    updated_asset.id,
    updated_asset.current_work_order_id,
    case when old_asset.status is distinct from updated_asset.status then 'status_change' else 'asset_updated' end,
    old_asset.assigned_to,
    updated_asset.assigned_to,
    old_asset.site_id,
    updated_asset.site_id,
    old_asset.customer_id,
    updated_asset.customer_id,
    old_asset.current_work_order_id,
    updated_asset.current_work_order_id,
    old_asset.inventory_location_id,
    updated_asset.inventory_location_id,
    old_asset.status,
    updated_asset.status,
    jsonb_build_object(
      'old_condition', old_asset.condition,
      'new_condition', updated_asset.condition,
      'asset_type', updated_asset.asset_type,
      'asset_tag', updated_asset.asset_tag
    ),
    'Asset record updated.',
    (select auth.uid())
  );

  return jsonb_build_object('asset_id', updated_asset.id, 'updated', true, 'status', updated_asset.status);
end;
$$;

create or replace function public.fieldops_transfer_asset(
  p_asset_id uuid,
  p_target_type text,
  p_technician_id uuid,
  p_customer_id uuid,
  p_site_id uuid,
  p_work_order_id uuid,
  p_location_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_asset public.assets%rowtype;
  updated_asset public.assets%rowtype;
  resolved_customer uuid;
  resolved_site uuid;
  resolved_user uuid;
  resolved_work_order uuid;
  resolved_location uuid;
  resolved_status text;
  event_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can change asset assignments.';
  end if;

  select * into old_asset
  from public.assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found.';
  end if;

  if old_asset.status in ('retired','disposed') then
    raise exception 'Retired or disposed assets must be reactivated before assignment.';
  end if;

  if p_target_type not in ('available','technician','customer','site','work_order','storage') then
    raise exception 'Invalid asset destination.';
  end if;

  resolved_status := 'available';
  event_name := 'returned';

  if p_target_type = 'technician' then
    if p_technician_id is null or not exists (
      select 1 from public.profiles p where p.id = p_technician_id and p.active = true
    ) then
      raise exception 'Choose an active FieldOps staff member.';
    end if;
    resolved_user := p_technician_id;
    resolved_status := 'assigned';
    event_name := 'assigned_to_technician';
  elsif p_target_type = 'customer' then
    if p_customer_id is null or not exists (select 1 from public.customers c where c.id = p_customer_id) then
      raise exception 'Choose a valid customer.';
    end if;
    resolved_customer := p_customer_id;
    resolved_status := 'assigned';
    event_name := 'assigned_to_customer';
  elsif p_target_type = 'site' then
    if p_site_id is null then
      raise exception 'Choose a customer site.';
    end if;
    select s.customer_id into resolved_customer
    from public.sites s
    where s.id = p_site_id;
    if not found then
      raise exception 'Customer site not found.';
    end if;
    resolved_site := p_site_id;
    resolved_status := 'assigned';
    event_name := 'assigned_to_site';
  elsif p_target_type = 'work_order' then
    if p_work_order_id is null then
      raise exception 'Choose a work order.';
    end if;
    select wo.customer_id, wo.site_id
    into resolved_customer, resolved_site
    from public.work_orders wo
    where wo.id = p_work_order_id
      and wo.status not in ('closed','cancelled');
    if not found then
      raise exception 'Choose an open work order.';
    end if;
    resolved_work_order := p_work_order_id;
    resolved_status := 'in_use';
    event_name := 'allocated_to_work_order';
  elsif p_target_type = 'storage' then
    if p_location_id is null or not exists (
      select 1 from public.inventory_locations il where il.id = p_location_id and il.active = true
    ) then
      raise exception 'Choose an active storage location.';
    end if;
    resolved_location := p_location_id;
    resolved_status := 'available';
    event_name := 'moved_to_storage';
  end if;

  update public.assets
  set
    assigned_to = resolved_user,
    customer_id = resolved_customer,
    site_id = resolved_site,
    current_work_order_id = resolved_work_order,
    inventory_location_id = resolved_location,
    status = resolved_status,
    retired_at = null,
    disposed_at = null
  where id = p_asset_id
  returning * into updated_asset;

  insert into public.asset_history (
    asset_id,
    work_order_id,
    event_type,
    from_user_id,
    to_user_id,
    from_site_id,
    to_site_id,
    from_customer_id,
    to_customer_id,
    from_work_order_id,
    to_work_order_id,
    from_location_id,
    to_location_id,
    from_status,
    to_status,
    details,
    notes,
    created_by
  ) values (
    updated_asset.id,
    resolved_work_order,
    event_name,
    old_asset.assigned_to,
    updated_asset.assigned_to,
    old_asset.site_id,
    updated_asset.site_id,
    old_asset.customer_id,
    updated_asset.customer_id,
    old_asset.current_work_order_id,
    updated_asset.current_work_order_id,
    old_asset.inventory_location_id,
    updated_asset.inventory_location_id,
    old_asset.status,
    updated_asset.status,
    jsonb_build_object('target_type', p_target_type),
    nullif(btrim(p_notes), ''),
    (select auth.uid())
  );

  return jsonb_build_object(
    'asset_id', updated_asset.id,
    'status', updated_asset.status,
    'target_type', p_target_type,
    'updated', true
  );
end;
$$;

revoke all on function public.fieldops_create_asset(text,text,text,text,text,text,text,text,text,text,text,date,numeric,numeric,text,text,date,date,date,text,text) from public;
revoke all on function public.fieldops_update_asset(uuid,text,text,text,text,text,text,text,text,text,text,text,date,numeric,numeric,text,text,date,date,date,text,text) from public;
revoke all on function public.fieldops_transfer_asset(uuid,text,uuid,uuid,uuid,uuid,uuid,text) from public;

grant execute on function public.fieldops_create_asset(text,text,text,text,text,text,text,text,text,text,text,date,numeric,numeric,text,text,date,date,date,text,text) to authenticated;
grant execute on function public.fieldops_update_asset(uuid,text,text,text,text,text,text,text,text,text,text,text,date,numeric,numeric,text,text,date,date,date,text,text) to authenticated;
grant execute on function public.fieldops_transfer_asset(uuid,text,uuid,uuid,uuid,uuid,uuid,text) to authenticated;

-- ============================================================
-- RLS + GRANTS FOR NEW ASSET TABLES
-- ============================================================

alter table public.asset_maintenance enable row level security;
alter table public.asset_documents enable row level security;
alter table public.asset_notes enable row level security;

revoke all on table public.asset_maintenance, public.asset_documents, public.asset_notes from anon;
grant select, insert, update, delete on table public.asset_maintenance, public.asset_documents, public.asset_notes to authenticated;
grant usage, select on sequence public.asset_tag_seq to authenticated;

drop policy if exists fieldops_asset_maintenance_read on public.asset_maintenance;
create policy fieldops_asset_maintenance_read
on public.asset_maintenance for select
to authenticated
using ((select private.is_active_user()));

drop policy if exists fieldops_asset_maintenance_manage on public.asset_maintenance;
create policy fieldops_asset_maintenance_manage
on public.asset_maintenance for all
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists fieldops_asset_documents_read on public.asset_documents;
create policy fieldops_asset_documents_read
on public.asset_documents for select
to authenticated
using ((select private.is_active_user()));

drop policy if exists fieldops_asset_documents_manage on public.asset_documents;
create policy fieldops_asset_documents_manage
on public.asset_documents for all
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists fieldops_asset_notes_read on public.asset_notes;
create policy fieldops_asset_notes_read
on public.asset_notes for select
to authenticated
using ((select private.is_active_user()));

drop policy if exists fieldops_asset_notes_insert on public.asset_notes;
create policy fieldops_asset_notes_insert
on public.asset_notes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[]))
);

drop policy if exists fieldops_asset_notes_manage on public.asset_notes;
create policy fieldops_asset_notes_manage
on public.asset_notes for update
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists fieldops_asset_notes_delete on public.asset_notes;
create policy fieldops_asset_notes_delete
on public.asset_notes for delete
to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])));

commit;
