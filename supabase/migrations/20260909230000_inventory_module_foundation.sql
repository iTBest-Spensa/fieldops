-- FIELDOPS INVENTORY MODULE FOUNDATION V1
-- Quantity-based stock, purchase orders, receiving, returns, reconciliation,
-- suppliers, locations and permanent stock movements.
-- Serialized equipment remains in Assets.

begin;

-- ============================================================
-- EXISTING INVENTORY TABLE EXTENSIONS
-- ============================================================

alter table public.inventory_items
  add column if not exists part_number text,
  add column if not exists barcode text,
  add column if not exists category text,
  add column if not exists manufacturer text,
  add column if not exists reorder_quantity numeric(12,2) not null default 0,
  add column if not exists taxable boolean not null default true,
  add column if not exists track_stock boolean not null default true,
  add column if not exists preferred_supplier_id uuid,
  add column if not exists notes text;

alter table public.inventory_items
  drop constraint if exists inventory_items_reorder_quantity_check;
alter table public.inventory_items
  add constraint inventory_items_reorder_quantity_check check (reorder_quantity >= 0);

create unique index if not exists uq_inventory_items_part_number_ci
  on public.inventory_items(lower(btrim(part_number)))
  where part_number is not null and btrim(part_number) <> '';

create unique index if not exists uq_inventory_items_barcode_ci
  on public.inventory_items(lower(btrim(barcode)))
  where barcode is not null and btrim(barcode) <> '';

alter table public.inventory_locations
  add column if not exists code text,
  add column if not exists technician_id uuid references public.profiles(id) on delete set null,
  add column if not exists vehicle_identifier text,
  add column if not exists notes text;

create unique index if not exists uq_inventory_locations_code_ci
  on public.inventory_locations(lower(btrim(code)))
  where code is not null and btrim(code) <> '';

create index if not exists idx_inventory_locations_technician
  on public.inventory_locations(technician_id)
  where technician_id is not null;

-- ============================================================
-- SUPPLIERS
-- ============================================================

create sequence if not exists public.inventory_supplier_number_seq start with 1001;

create table if not exists public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_number text not null unique
    default ('SUP-' || lpad(nextval('public.inventory_supplier_number_seq')::text, 5, '0')),
  name text not null check (btrim(name) <> ''),
  contact_name text,
  email text,
  phone text,
  website text,
  address1 text,
  address2 text,
  city text,
  province_state text,
  postal_code text,
  country text not null default 'Canada',
  payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_inventory_suppliers_name_ci
  on public.inventory_suppliers(lower(btrim(name)));

alter table public.inventory_items
  drop constraint if exists inventory_items_preferred_supplier_id_fkey;
alter table public.inventory_items
  add constraint inventory_items_preferred_supplier_id_fkey
  foreign key (preferred_supplier_id) references public.inventory_suppliers(id) on delete set null;

create table if not exists public.inventory_item_suppliers (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  supplier_id uuid not null references public.inventory_suppliers(id) on delete cascade,
  supplier_sku text,
  last_unit_cost numeric(12,2) check (last_unit_cost is null or last_unit_cost >= 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  preferred boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_item_id, supplier_id)
);

create index if not exists idx_inventory_item_suppliers_supplier
  on public.inventory_item_suppliers(supplier_id, active);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

create sequence if not exists public.inventory_po_number_seq start with 1001;

create table if not exists public.inventory_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique
    default ('PO-' || lpad(nextval('public.inventory_po_number_seq')::text, 6, '0')),
  supplier_id uuid not null references public.inventory_suppliers(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','approved','ordered','partially_received','received','closed','cancelled')),
  ordered_at timestamptz,
  expected_date date,
  shipping_amount numeric(12,2) not null default 0 check (shipping_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_purchase_orders_supplier
  on public.inventory_purchase_orders(supplier_id, created_at desc);
create index if not exists idx_inventory_purchase_orders_status
  on public.inventory_purchase_orders(status, expected_date);

create table if not exists public.inventory_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.inventory_purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  description text not null,
  supplier_sku text,
  quantity_ordered numeric(12,2) not null check (quantity_ordered > 0),
  quantity_received numeric(12,2) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_received <= quantity_ordered)
);

create index if not exists idx_inventory_po_items_po
  on public.inventory_purchase_order_items(purchase_order_id);
create index if not exists idx_inventory_po_items_item
  on public.inventory_purchase_order_items(inventory_item_id);

-- ============================================================
-- RECEIVING
-- ============================================================

create sequence if not exists public.inventory_receipt_number_seq start with 1001;

create table if not exists public.inventory_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique
    default ('RCV-' || lpad(nextval('public.inventory_receipt_number_seq')::text, 6, '0')),
  purchase_order_id uuid not null references public.inventory_purchase_orders(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  received_at timestamptz not null default now(),
  packing_slip text,
  status text not null default 'posted' check (status in ('posted','void')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_receipts_po
  on public.inventory_receipts(purchase_order_id, received_at desc);
create index if not exists idx_inventory_receipts_location
  on public.inventory_receipts(location_id, received_at desc);

create table if not exists public.inventory_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.inventory_receipts(id) on delete cascade,
  purchase_order_item_id uuid not null references public.inventory_purchase_order_items(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity_received numeric(12,2) not null check (quantity_received > 0),
  quantity_damaged numeric(12,2) not null default 0 check (quantity_damaged >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  check (quantity_damaged <= quantity_received)
);

create index if not exists idx_inventory_receipt_items_receipt
  on public.inventory_receipt_items(receipt_id);

-- ============================================================
-- RETURNS
-- ============================================================

create sequence if not exists public.inventory_return_number_seq start with 1001;

create table if not exists public.inventory_returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique
    default ('RTN-' || lpad(nextval('public.inventory_return_number_seq')::text, 6, '0')),
  return_type text not null
    check (return_type in ('supplier','work_order','technician','customer','other')),
  supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  purchase_order_id uuid references public.inventory_purchase_orders(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  technician_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  status text not null default 'posted' check (status in ('posted','cancelled')),
  returned_at timestamptz not null default now(),
  reason text not null check (length(btrim(reason)) >= 3),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_returns_location
  on public.inventory_returns(location_id, returned_at desc);
create index if not exists idx_inventory_returns_work_order
  on public.inventory_returns(work_order_id)
  where work_order_id is not null;

create table if not exists public.inventory_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.inventory_returns(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  condition text not null default 'restockable'
    check (condition in ('restockable','damaged','scrap')),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_return_items_return
  on public.inventory_return_items(return_id);

-- ============================================================
-- RECONCILIATION / PHYSICAL COUNTS
-- ============================================================

create sequence if not exists public.inventory_reconciliation_number_seq start with 1001;

create table if not exists public.inventory_reconciliations (
  id uuid primary key default gen_random_uuid(),
  reconciliation_number text not null unique
    default ('REC-' || lpad(nextval('public.inventory_reconciliation_number_seq')::text, 6, '0')),
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  status text not null default 'counting' check (status in ('counting','posted','cancelled')),
  started_at timestamptz not null default now(),
  posted_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  posted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_reconciliations_location
  on public.inventory_reconciliations(location_id, created_at desc);

create table if not exists public.inventory_reconciliation_lines (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.inventory_reconciliations(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  system_quantity numeric(12,2) not null default 0,
  counted_quantity numeric(12,2) check (counted_quantity is null or counted_quantity >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reconciliation_id, inventory_item_id)
);

create index if not exists idx_inventory_reconciliation_lines_reconciliation
  on public.inventory_reconciliation_lines(reconciliation_id);

-- ============================================================
-- ITEM NOTES
-- ============================================================

create table if not exists public.inventory_item_notes (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  note text not null check (length(btrim(note)) >= 3),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_item_notes_item_created
  on public.inventory_item_notes(inventory_item_id, created_at desc);

-- ============================================================
-- PERMANENT LEDGER PROVENANCE
-- ============================================================

alter table public.inventory_transactions
  add column if not exists technician_id uuid references public.profiles(id) on delete set null,
  add column if not exists supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  add column if not exists purchase_order_id uuid references public.inventory_purchase_orders(id) on delete set null,
  add column if not exists receipt_id uuid references public.inventory_receipts(id) on delete set null,
  add column if not exists return_id uuid references public.inventory_returns(id) on delete set null,
  add column if not exists reconciliation_id uuid references public.inventory_reconciliations(id) on delete set null,
  add column if not exists from_location_id uuid references public.inventory_locations(id) on delete set null,
  add column if not exists to_location_id uuid references public.inventory_locations(id) on delete set null,
  add column if not exists transfer_group_id uuid;

create index if not exists idx_inventory_transactions_location_item
  on public.inventory_transactions(location_id, inventory_item_id, created_at);
create index if not exists idx_inventory_transactions_po
  on public.inventory_transactions(purchase_order_id)
  where purchase_order_id is not null;
create index if not exists idx_inventory_transactions_receipt
  on public.inventory_transactions(receipt_id)
  where receipt_id is not null;
create index if not exists idx_inventory_transactions_return
  on public.inventory_transactions(return_id)
  where return_id is not null;
create index if not exists idx_inventory_transactions_reconciliation
  on public.inventory_transactions(reconciliation_id)
  where reconciliation_id is not null;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'inventory_items',
    'inventory_locations',
    'inventory_suppliers',
    'inventory_item_suppliers',
    'inventory_purchase_orders',
    'inventory_purchase_order_items',
    'inventory_reconciliations',
    'inventory_reconciliation_lines'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', 'trg_' || t || '_updated_at', t);
  end loop;
end
$$;

-- ============================================================
-- HELPER: CURRENT STOCK AT A LOCATION
-- ============================================================

create or replace function private.fieldops_inventory_location_quantity(
  p_item_id uuid,
  p_location_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(t.quantity), 0)::numeric
  from public.inventory_transactions t
  where t.inventory_item_id = p_item_id
    and t.location_id = p_location_id;
$$;

revoke all on function private.fieldops_inventory_location_quantity(uuid, uuid) from public;

-- ============================================================
-- ITEM CREATE / UPDATE
-- ============================================================

create or replace function public.fieldops_create_inventory_item(
  p_sku text,
  p_part_number text,
  p_barcode text,
  p_name text,
  p_description text,
  p_category text,
  p_manufacturer text,
  p_unit text,
  p_unit_cost numeric,
  p_unit_price numeric,
  p_reorder_level numeric,
  p_reorder_quantity numeric,
  p_taxable boolean,
  p_track_stock boolean,
  p_preferred_supplier_id uuid,
  p_notes text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_item public.inventory_items%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can create inventory items.';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Item name is required.'; end if;
  if p_unit_cost < 0 or p_unit_price < 0 or p_reorder_level < 0 or p_reorder_quantity < 0 then
    raise exception 'Inventory costs and reorder quantities cannot be negative.';
  end if;

  insert into public.inventory_items (
    sku, part_number, barcode, name, description, category, manufacturer, unit,
    unit_cost, unit_price, reorder_level, reorder_quantity, taxable, track_stock,
    preferred_supplier_id, notes, active
  ) values (
    nullif(btrim(p_sku), ''), nullif(btrim(p_part_number), ''), nullif(btrim(p_barcode), ''),
    btrim(p_name), nullif(btrim(p_description), ''), nullif(btrim(p_category), ''),
    nullif(btrim(p_manufacturer), ''), coalesce(nullif(btrim(p_unit), ''), 'each'),
    p_unit_cost, p_unit_price, p_reorder_level, p_reorder_quantity, coalesce(p_taxable, true),
    coalesce(p_track_stock, true), p_preferred_supplier_id, nullif(btrim(p_notes), ''), coalesce(p_active, true)
  ) returning * into new_item;

  return jsonb_build_object('inventory_item_id', new_item.id, 'sku', new_item.sku, 'name', new_item.name);
end;
$$;

create or replace function public.fieldops_update_inventory_item(
  p_inventory_item_id uuid,
  p_sku text,
  p_part_number text,
  p_barcode text,
  p_name text,
  p_description text,
  p_category text,
  p_manufacturer text,
  p_unit text,
  p_unit_cost numeric,
  p_unit_price numeric,
  p_reorder_level numeric,
  p_reorder_quantity numeric,
  p_taxable boolean,
  p_track_stock boolean,
  p_preferred_supplier_id uuid,
  p_notes text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can update inventory items.';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Item name is required.'; end if;
  if p_unit_cost < 0 or p_unit_price < 0 or p_reorder_level < 0 or p_reorder_quantity < 0 then
    raise exception 'Inventory costs and reorder quantities cannot be negative.';
  end if;

  update public.inventory_items set
    sku = nullif(btrim(p_sku), ''),
    part_number = nullif(btrim(p_part_number), ''),
    barcode = nullif(btrim(p_barcode), ''),
    name = btrim(p_name),
    description = nullif(btrim(p_description), ''),
    category = nullif(btrim(p_category), ''),
    manufacturer = nullif(btrim(p_manufacturer), ''),
    unit = coalesce(nullif(btrim(p_unit), ''), 'each'),
    unit_cost = p_unit_cost,
    unit_price = p_unit_price,
    reorder_level = p_reorder_level,
    reorder_quantity = p_reorder_quantity,
    taxable = coalesce(p_taxable, true),
    track_stock = coalesce(p_track_stock, true),
    preferred_supplier_id = p_preferred_supplier_id,
    notes = nullif(btrim(p_notes), ''),
    active = coalesce(p_active, true)
  where id = p_inventory_item_id;

  if not found then raise exception 'Inventory item not found.'; end if;
  return jsonb_build_object('inventory_item_id', p_inventory_item_id);
end;
$$;

-- ============================================================
-- STOCK MOVEMENT / TRANSFER
-- ============================================================

create or replace function public.fieldops_post_inventory_movement(
  p_movement_type text,
  p_inventory_item_id uuid,
  p_location_id uuid,
  p_to_location_id uuid,
  p_work_order_id uuid,
  p_technician_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_reference text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  available_qty numeric;
  signed_qty numeric;
  transfer_id uuid := gen_random_uuid();
  movement_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])) then
    raise exception 'You do not have permission to record inventory movement.';
  end if;
  if p_movement_type not in ('receive','issue','consume','adjustment','transfer') then raise exception 'Invalid inventory movement type.'; end if;
  if p_movement_type in ('receive','adjustment','transfer')
     and not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can receive, adjust or transfer stock.';
  end if;
  if p_location_id is null then raise exception 'Inventory location is required.'; end if;
  if p_quantity is null or p_quantity = 0 then raise exception 'Quantity must not be zero.'; end if;
  if p_movement_type <> 'adjustment' and p_quantity <= 0 then raise exception 'Quantity must be greater than zero.'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'Unit cost cannot be negative.'; end if;

  if p_movement_type = 'transfer' then
    if p_to_location_id is null or p_to_location_id = p_location_id then raise exception 'Choose a different destination location.'; end if;
    available_qty := private.fieldops_inventory_location_quantity(p_inventory_item_id, p_location_id);
    if available_qty < p_quantity then raise exception 'Insufficient stock at the source location.'; end if;

    insert into public.inventory_transactions (
      inventory_item_id, location_id, from_location_id, to_location_id, transfer_group_id,
      transaction_type, quantity, unit_cost, reference, notes, created_by
    ) values (
      p_inventory_item_id, p_location_id, p_location_id, p_to_location_id, transfer_id,
      'transfer_out', -abs(p_quantity), p_unit_cost, nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''), auth.uid()
    ) returning id into movement_id;

    insert into public.inventory_transactions (
      inventory_item_id, location_id, from_location_id, to_location_id, transfer_group_id,
      transaction_type, quantity, unit_cost, reference, notes, created_by
    ) values (
      p_inventory_item_id, p_to_location_id, p_location_id, p_to_location_id, transfer_id,
      'transfer_in', abs(p_quantity), p_unit_cost, nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''), auth.uid()
    );

    return jsonb_build_object('transaction_id', movement_id, 'transfer_group_id', transfer_id);
  end if;

  signed_qty := case
    when p_movement_type = 'receive' then abs(p_quantity)
    when p_movement_type in ('issue','consume') then -abs(p_quantity)
    else p_quantity
  end;

  if signed_qty < 0 then
    available_qty := private.fieldops_inventory_location_quantity(p_inventory_item_id, p_location_id);
    if available_qty + signed_qty < 0 then raise exception 'Insufficient stock at the selected location.'; end if;
  end if;

  insert into public.inventory_transactions (
    inventory_item_id, location_id, work_order_id, technician_id, transaction_type,
    quantity, unit_cost, reference, notes, created_by
  ) values (
    p_inventory_item_id, p_location_id, p_work_order_id, p_technician_id,
    p_movement_type, signed_qty, p_unit_cost, nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''), auth.uid()
  ) returning id into movement_id;

  if p_movement_type = 'consume' and p_work_order_id is not null then
    insert into public.material_usage (
      work_order_id, inventory_item_id, description, quantity, unit_cost, unit_price, billable, recorded_by
    )
    select
      p_work_order_id, i.id, i.name, abs(p_quantity), coalesce(p_unit_cost, i.unit_cost), i.unit_price, true, auth.uid()
    from public.inventory_items i
    where i.id = p_inventory_item_id;
  end if;

  return jsonb_build_object('transaction_id', movement_id);
end;
$$;

-- ============================================================
-- PURCHASE ORDER CREATE + STATUS
-- ============================================================

create or replace function public.fieldops_create_purchase_order(
  p_supplier_id uuid,
  p_expected_date date,
  p_shipping_amount numeric,
  p_tax_amount numeric,
  p_notes text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.inventory_purchase_orders%rowtype;
  line jsonb;
  item public.inventory_items%rowtype;
  qty numeric;
  cost numeric;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can create purchase orders.';
  end if;
  if not exists (select 1 from public.inventory_suppliers s where s.id = p_supplier_id and s.active = true) then raise exception 'Choose an active supplier.'; end if;
  if coalesce(p_shipping_amount, 0) < 0 or coalesce(p_tax_amount, 0) < 0 then raise exception 'Shipping and tax cannot be negative.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one purchase-order item.'; end if;

  insert into public.inventory_purchase_orders (supplier_id, expected_date, shipping_amount, tax_amount, notes, created_by)
  values (p_supplier_id, p_expected_date, coalesce(p_shipping_amount, 0), coalesce(p_tax_amount, 0), nullif(btrim(p_notes), ''), auth.uid())
  returning * into po;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    select * into item from public.inventory_items where id = (line->>'inventory_item_id')::uuid and active = true;
    if not found then raise exception 'A purchase-order item is missing or inactive.'; end if;
    qty := (line->>'quantity')::numeric;
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, item.unit_cost);
    if qty <= 0 then raise exception 'Purchase-order quantities must be greater than zero.'; end if;
    if cost < 0 then raise exception 'Purchase-order unit cost cannot be negative.'; end if;

    insert into public.inventory_purchase_order_items (
      purchase_order_id, inventory_item_id, description, supplier_sku, quantity_ordered, unit_cost
    ) values (
      po.id, item.id, item.name, nullif(btrim(line->>'supplier_sku'), ''), qty, cost
    );

    insert into public.inventory_item_suppliers (inventory_item_id, supplier_id, supplier_sku, last_unit_cost, preferred, active)
    values (item.id, p_supplier_id, nullif(btrim(line->>'supplier_sku'), ''), cost, coalesce(item.preferred_supplier_id = p_supplier_id, false), true)
    on conflict (inventory_item_id, supplier_id) do update set
      supplier_sku = coalesce(excluded.supplier_sku, public.inventory_item_suppliers.supplier_sku),
      last_unit_cost = excluded.last_unit_cost,
      preferred = excluded.preferred,
      active = true,
      updated_at = now();
  end loop;

  return jsonb_build_object('purchase_order_id', po.id, 'po_number', po.po_number);
end;
$$;

create or replace function public.fieldops_set_purchase_order_status(
  p_purchase_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can change a purchase order.'; end if;
  select status into current_status from public.inventory_purchase_orders where id = p_purchase_order_id for update;
  if current_status is null then raise exception 'Purchase order not found.'; end if;
  if p_status not in ('approved','ordered','closed','cancelled') then raise exception 'Invalid purchase-order status change.'; end if;
  if current_status in ('received','closed','cancelled') then raise exception 'This purchase order can no longer be changed.'; end if;
  if p_status = 'approved' and current_status <> 'draft' then raise exception 'Only a Draft purchase order can be approved.'; end if;
  if p_status = 'ordered' and current_status not in ('draft','approved') then raise exception 'Only Draft or Approved purchase orders can be ordered.'; end if;
  if p_status = 'cancelled' and current_status in ('partially_received','received') then raise exception 'A received purchase order cannot be cancelled.'; end if;

  update public.inventory_purchase_orders set
    status = p_status,
    approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    ordered_at = case when p_status = 'ordered' then now() else ordered_at end
  where id = p_purchase_order_id;

  return jsonb_build_object('purchase_order_id', p_purchase_order_id, 'status', p_status);
end;
$$;

-- ============================================================
-- RECEIVE AGAINST PURCHASE ORDER
-- ============================================================

create or replace function public.fieldops_receive_purchase_order(
  p_purchase_order_id uuid,
  p_location_id uuid,
  p_received_at timestamptz,
  p_packing_slip text,
  p_notes text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.inventory_purchase_orders%rowtype;
  receipt public.inventory_receipts%rowtype;
  line jsonb;
  poi public.inventory_purchase_order_items%rowtype;
  qty numeric;
  damaged numeric;
  good_qty numeric;
  cost numeric;
  processed_count integer := 0;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can receive purchase orders.'; end if;
  if not exists (select 1 from public.inventory_locations l where l.id = p_location_id and l.active = true) then raise exception 'Choose an active receiving location.'; end if;
  select * into po from public.inventory_purchase_orders where id = p_purchase_order_id for update;
  if not found then raise exception 'Purchase order not found.'; end if;
  if po.status not in ('approved','ordered','partially_received') then raise exception 'Purchase order must be Approved, Ordered or Partially Received before receiving.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Enter at least one received quantity.'; end if;

  insert into public.inventory_receipts (purchase_order_id, location_id, received_at, packing_slip, notes, created_by)
  values (po.id, p_location_id, coalesce(p_received_at, now()), nullif(btrim(p_packing_slip), ''), nullif(btrim(p_notes), ''), auth.uid())
  returning * into receipt;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    qty := coalesce((line->>'quantity_received')::numeric, 0);
    damaged := coalesce((line->>'quantity_damaged')::numeric, 0);
    if qty <= 0 then continue; end if;
    processed_count := processed_count + 1;
    if damaged < 0 or damaged > qty then raise exception 'Damaged quantity must be between zero and received quantity.'; end if;

    select * into poi
    from public.inventory_purchase_order_items
    where id = (line->>'purchase_order_item_id')::uuid
      and purchase_order_id = po.id
    for update;
    if not found then raise exception 'Purchase-order line not found.'; end if;
    if poi.quantity_received + qty > poi.quantity_ordered then raise exception 'Received quantity exceeds the remaining purchase-order quantity.'; end if;

    cost := coalesce(nullif(line->>'unit_cost','')::numeric, poi.unit_cost);
    good_qty := qty - damaged;

    insert into public.inventory_receipt_items (
      receipt_id, purchase_order_item_id, inventory_item_id, quantity_received, quantity_damaged, unit_cost
    ) values (receipt.id, poi.id, poi.inventory_item_id, qty, damaged, cost);

    update public.inventory_purchase_order_items
    set quantity_received = quantity_received + qty,
        unit_cost = cost
    where id = poi.id;

    if good_qty > 0 then
      insert into public.inventory_transactions (
        inventory_item_id, location_id, supplier_id, purchase_order_id, receipt_id,
        transaction_type, quantity, unit_cost, reference, notes, created_by
      ) values (
        poi.inventory_item_id, p_location_id, po.supplier_id, po.id, receipt.id,
        'receive', good_qty, cost, receipt.receipt_number,
        case when damaged > 0 then concat(damaged, ' received damaged and excluded from available stock. ', coalesce(p_notes,'')) else nullif(btrim(p_notes),'') end,
        auth.uid()
      );
    end if;

    update public.inventory_items
    set unit_cost = cost
    where id = poi.inventory_item_id;

    update public.inventory_item_suppliers
    set last_unit_cost = cost, updated_at = now()
    where inventory_item_id = poi.inventory_item_id and supplier_id = po.supplier_id;
  end loop;

  if processed_count = 0 then
    raise exception 'Enter at least one received quantity greater than zero.';
  end if;

  if not exists (
    select 1 from public.inventory_purchase_order_items x
    where x.purchase_order_id = po.id and x.quantity_received < x.quantity_ordered
  ) then
    update public.inventory_purchase_orders set status = 'received' where id = po.id;
  else
    update public.inventory_purchase_orders set status = 'partially_received' where id = po.id;
  end if;

  return jsonb_build_object('receipt_id', receipt.id, 'receipt_number', receipt.receipt_number);
end;
$$;

-- ============================================================
-- RETURNS
-- ============================================================

create or replace function public.fieldops_post_inventory_return(
  p_return_type text,
  p_supplier_id uuid,
  p_purchase_order_id uuid,
  p_work_order_id uuid,
  p_technician_id uuid,
  p_customer_id uuid,
  p_location_id uuid,
  p_reason text,
  p_notes text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.inventory_returns%rowtype;
  line jsonb;
  item public.inventory_items%rowtype;
  qty numeric;
  cost numeric;
  condition_value text;
  signed_qty numeric;
  available_qty numeric;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])) then raise exception 'You do not have permission to record an inventory return.'; end if;
  if p_return_type not in ('supplier','work_order','technician','customer','other') then raise exception 'Invalid return type.'; end if;
  if p_return_type = 'supplier'
     and not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can return stock to a supplier.';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) < 3 then raise exception 'Return reason must be at least 3 characters.'; end if;
  if p_return_type = 'supplier' and p_supplier_id is null then raise exception 'Supplier is required for a supplier return.'; end if;
  if p_return_type = 'work_order' and p_work_order_id is null then raise exception 'Work order is required for a work-order return.'; end if;
  if p_return_type = 'technician' and p_technician_id is null then raise exception 'Technician is required for a technician return.'; end if;
  if p_return_type = 'customer' and p_customer_id is null then raise exception 'Customer is required for a customer return.'; end if;
  if not exists (select 1 from public.inventory_locations l where l.id = p_location_id and l.active = true) then raise exception 'Choose an active inventory location.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one return item.'; end if;

  insert into public.inventory_returns (
    return_type, supplier_id, purchase_order_id, work_order_id, technician_id, customer_id, location_id,
    reason, notes, created_by
  ) values (
    p_return_type, p_supplier_id, p_purchase_order_id, p_work_order_id, p_technician_id, p_customer_id,
    p_location_id, btrim(p_reason), nullif(btrim(p_notes), ''), auth.uid()
  ) returning * into ret;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    select * into item from public.inventory_items where id = (line->>'inventory_item_id')::uuid;
    if not found then raise exception 'Return item not found.'; end if;
    qty := (line->>'quantity')::numeric;
    condition_value := coalesce(nullif(line->>'condition',''), 'restockable');
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, item.unit_cost);
    if qty <= 0 then raise exception 'Return quantities must be greater than zero.'; end if;
    if condition_value not in ('restockable','damaged','scrap') then raise exception 'Invalid return condition.'; end if;

    insert into public.inventory_return_items (return_id, inventory_item_id, quantity, condition, unit_cost)
    values (ret.id, item.id, qty, condition_value, cost);

    if p_return_type = 'supplier' then
      available_qty := private.fieldops_inventory_location_quantity(item.id, p_location_id);
      if available_qty < qty then raise exception 'Insufficient stock for supplier return.'; end if;
      signed_qty := -qty;
    elsif condition_value = 'restockable' then
      signed_qty := qty;
    else
      signed_qty := 0;
    end if;

    if signed_qty <> 0 then
      insert into public.inventory_transactions (
        inventory_item_id, location_id, work_order_id, technician_id, supplier_id,
        purchase_order_id, return_id, transaction_type, quantity, unit_cost, reference, notes, created_by
      ) values (
        item.id, p_location_id, p_work_order_id, p_technician_id, p_supplier_id,
        p_purchase_order_id, ret.id, 'return', signed_qty, cost, ret.return_number,
        concat('Return condition: ', condition_value, '. ', coalesce(p_notes,'')), auth.uid()
      );
    end if;
  end loop;

  return jsonb_build_object('return_id', ret.id, 'return_number', ret.return_number);
end;
$$;

-- ============================================================
-- RECONCILIATION
-- ============================================================

create or replace function public.fieldops_start_inventory_reconciliation(
  p_location_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.inventory_reconciliations%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can start reconciliation.'; end if;
  if not exists (select 1 from public.inventory_locations l where l.id = p_location_id and l.active = true) then raise exception 'Choose an active inventory location.'; end if;
  if exists (select 1 from public.inventory_reconciliations r where r.location_id = p_location_id and r.status = 'counting') then raise exception 'This location already has an open reconciliation.'; end if;

  insert into public.inventory_reconciliations (location_id, notes, created_by)
  values (p_location_id, nullif(btrim(p_notes), ''), auth.uid()) returning * into rec;

  insert into public.inventory_reconciliation_lines (
    reconciliation_id, inventory_item_id, system_quantity, unit_cost
  )
  select
    rec.id,
    i.id,
    coalesce((select sum(t.quantity) from public.inventory_transactions t where t.inventory_item_id = i.id and t.location_id = p_location_id), 0),
    i.unit_cost
  from public.inventory_items i
  where i.active = true and i.track_stock = true
  order by i.name;

  return jsonb_build_object('reconciliation_id', rec.id, 'reconciliation_number', rec.reconciliation_number);
end;
$$;

create or replace function public.fieldops_post_inventory_reconciliation(
  p_reconciliation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.inventory_reconciliations%rowtype;
  line public.inventory_reconciliation_lines%rowtype;
  variance numeric;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can post reconciliation.'; end if;

  select * into rec from public.inventory_reconciliations where id = p_reconciliation_id for update;
  if not found then raise exception 'Reconciliation not found.'; end if;
  if rec.status <> 'counting' then raise exception 'Only a Counting reconciliation can be posted.'; end if;
  if exists (select 1 from public.inventory_reconciliation_lines l where l.reconciliation_id = rec.id and l.counted_quantity is null) then raise exception 'Every inventory item must have a physical count before posting.'; end if;
  if exists (
    select 1 from public.inventory_transactions t
    where t.location_id = rec.location_id and t.created_at > rec.started_at
  ) then
    raise exception 'Stock changed after this reconciliation started. Cancel it and start a fresh count.';
  end if;

  for line in select * from public.inventory_reconciliation_lines where reconciliation_id = rec.id
  loop
    variance := line.counted_quantity - line.system_quantity;
    if variance <> 0 then
      insert into public.inventory_transactions (
        inventory_item_id, location_id, reconciliation_id, transaction_type, quantity,
        unit_cost, reference, notes, created_by
      ) values (
        line.inventory_item_id, rec.location_id, rec.id, 'adjustment', variance,
        line.unit_cost, rec.reconciliation_number,
        concat('Physical reconciliation variance. ', coalesce(line.reason, '')), auth.uid()
      );
    end if;
  end loop;

  update public.inventory_reconciliations
  set status = 'posted', posted_at = now(), posted_by = auth.uid()
  where id = rec.id;

  return jsonb_build_object('reconciliation_id', rec.id, 'status', 'posted');
end;
$$;

-- ============================================================
-- RLS + PRIVILEGES
-- ============================================================

alter table public.inventory_suppliers enable row level security;
alter table public.inventory_item_suppliers enable row level security;
alter table public.inventory_purchase_orders enable row level security;
alter table public.inventory_purchase_order_items enable row level security;
alter table public.inventory_receipts enable row level security;
alter table public.inventory_receipt_items enable row level security;
alter table public.inventory_returns enable row level security;
alter table public.inventory_return_items enable row level security;
alter table public.inventory_reconciliations enable row level security;
alter table public.inventory_reconciliation_lines enable row level security;
alter table public.inventory_item_notes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'inventory_suppliers','inventory_item_suppliers','inventory_purchase_orders','inventory_purchase_order_items',
    'inventory_receipts','inventory_receipt_items','inventory_returns','inventory_return_items',
    'inventory_reconciliations','inventory_reconciliation_lines','inventory_item_notes'
  ]
  loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'inventory_suppliers','inventory_item_suppliers','inventory_purchase_orders','inventory_purchase_order_items',
    'inventory_receipts','inventory_receipt_items','inventory_returns','inventory_return_items',
    'inventory_reconciliations','inventory_reconciliation_lines','inventory_item_notes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_active_user()))', t || '_staff_select', t);
  end loop;
end
$$;

drop policy if exists inventory_suppliers_manage on public.inventory_suppliers;
create policy inventory_suppliers_manage on public.inventory_suppliers for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_item_suppliers_manage on public.inventory_item_suppliers;
create policy inventory_item_suppliers_manage on public.inventory_item_suppliers for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_purchase_orders_manage on public.inventory_purchase_orders;
create policy inventory_purchase_orders_manage on public.inventory_purchase_orders for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_purchase_order_items_manage on public.inventory_purchase_order_items;
create policy inventory_purchase_order_items_manage on public.inventory_purchase_order_items for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_receipts_manage on public.inventory_receipts;
create policy inventory_receipts_manage on public.inventory_receipts for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_receipt_items_manage on public.inventory_receipt_items;
create policy inventory_receipt_items_manage on public.inventory_receipt_items for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_returns_manage on public.inventory_returns;
create policy inventory_returns_manage on public.inventory_returns for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])));

drop policy if exists inventory_return_items_manage on public.inventory_return_items;
create policy inventory_return_items_manage on public.inventory_return_items for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])));

drop policy if exists inventory_reconciliations_manage on public.inventory_reconciliations;
create policy inventory_reconciliations_manage on public.inventory_reconciliations for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_reconciliation_lines_manage on public.inventory_reconciliation_lines;
create policy inventory_reconciliation_lines_manage on public.inventory_reconciliation_lines for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory']::text[])));

drop policy if exists inventory_item_notes_manage on public.inventory_item_notes;
create policy inventory_item_notes_manage on public.inventory_item_notes for all to authenticated
using ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])))
with check ((select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])));

-- RPC execution is the write path for atomic inventory operations.
revoke all on function public.fieldops_create_inventory_item(text,text,text,text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,uuid,text,boolean) from public;
revoke all on function public.fieldops_update_inventory_item(uuid,text,text,text,text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,uuid,text,boolean) from public;
revoke all on function public.fieldops_post_inventory_movement(text,uuid,uuid,uuid,uuid,uuid,numeric,numeric,text,text) from public;
revoke all on function public.fieldops_create_purchase_order(uuid,date,numeric,numeric,text,jsonb) from public;
revoke all on function public.fieldops_set_purchase_order_status(uuid,text) from public;
revoke all on function public.fieldops_receive_purchase_order(uuid,uuid,timestamptz,text,text,jsonb) from public;
revoke all on function public.fieldops_post_inventory_return(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public;
revoke all on function public.fieldops_start_inventory_reconciliation(uuid,text) from public;
revoke all on function public.fieldops_post_inventory_reconciliation(uuid) from public;

grant execute on function public.fieldops_create_inventory_item(text,text,text,text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,uuid,text,boolean) to authenticated;
grant execute on function public.fieldops_update_inventory_item(uuid,text,text,text,text,text,text,text,text,numeric,numeric,numeric,numeric,boolean,boolean,uuid,text,boolean) to authenticated;
grant execute on function public.fieldops_post_inventory_movement(text,uuid,uuid,uuid,uuid,uuid,numeric,numeric,text,text) to authenticated;
grant execute on function public.fieldops_create_purchase_order(uuid,date,numeric,numeric,text,jsonb) to authenticated;
grant execute on function public.fieldops_set_purchase_order_status(uuid,text) to authenticated;
grant execute on function public.fieldops_receive_purchase_order(uuid,uuid,timestamptz,text,text,jsonb) to authenticated;
grant execute on function public.fieldops_post_inventory_return(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to authenticated;
grant execute on function public.fieldops_start_inventory_reconciliation(uuid,text) to authenticated;
grant execute on function public.fieldops_post_inventory_reconciliation(uuid) to authenticated;

grant usage, select on sequence public.inventory_supplier_number_seq to authenticated;
grant usage, select on sequence public.inventory_po_number_seq to authenticated;
grant usage, select on sequence public.inventory_receipt_number_seq to authenticated;
grant usage, select on sequence public.inventory_return_number_seq to authenticated;
grant usage, select on sequence public.inventory_reconciliation_number_seq to authenticated;

commit;
