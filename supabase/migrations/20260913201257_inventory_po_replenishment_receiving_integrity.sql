
begin;

-- Link every replenishment PO to the stock location it is intended to refill.
alter table public.inventory_purchase_orders
  add column if not exists destination_location_id uuid;

alter table public.inventory_purchase_orders
  drop constraint if exists inventory_purchase_orders_destination_location_id_fkey;

alter table public.inventory_purchase_orders
  add constraint inventory_purchase_orders_destination_location_id_fkey
  foreign key (destination_location_id)
  references public.inventory_locations(id)
  on delete restrict;

create index if not exists idx_inventory_purchase_orders_destination_status
  on public.inventory_purchase_orders(destination_location_id, status, created_at desc);

-- Backfill POs created by the existing Inventory/Dashboard flows. Both flows
-- already put the location name in the notes.
update public.inventory_purchase_orders po
set destination_location_id = (
  select l.id
  from public.inventory_locations l
  where l.active = true
    and po.notes is not null
    and position(lower(l.name) in lower(po.notes)) > 0
  order by length(l.name) desc
  limit 1
)
where po.destination_location_id is null
  and po.notes is not null
  and exists (
    select 1
    from public.inventory_locations l
    where l.active = true
      and position(lower(l.name) in lower(po.notes)) > 0
  );

-- Repair POs that were closed before their ordered quantity was actually
-- received. A PO with remaining quantity must stay receivable.
update public.inventory_purchase_orders po
set status = case
  when exists (
    select 1
    from public.inventory_purchase_order_items x
    where x.purchase_order_id = po.id
      and x.quantity_received > 0
      and x.quantity_received < x.quantity_ordered
  ) then 'partially_received'
  when po.ordered_at is not null then 'ordered'
  when po.approved_at is not null then 'approved'
  else 'draft'
end
where po.status = 'closed'
  and exists (
    select 1
    from public.inventory_purchase_order_items x
    where x.purchase_order_id = po.id
      and x.quantity_received < x.quantity_ordered
  );

-- Location-aware replenishment creator with duplicate protection.
create or replace function public.fieldops_create_replenishment_purchase_order(
  p_destination_location_id uuid,
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
  on_hand numeric;
  target_qty numeric;
  covered_qty numeric;
  location_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can create purchase orders.';
  end if;

  select l.name
  into location_name
  from public.inventory_locations l
  where l.id = p_destination_location_id
    and l.active = true
  for update;

  if location_name is null then
    raise exception 'Choose an active replenishment location.';
  end if;

  if not exists (
    select 1
    from public.inventory_suppliers s
    where s.id = p_supplier_id
      and s.active = true
  ) then
    raise exception 'Choose an active supplier.';
  end if;

  if coalesce(p_shipping_amount, 0) < 0
     or coalesce(p_tax_amount, 0) < 0 then
    raise exception 'Shipping and tax cannot be negative.';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one purchase-order item.';
  end if;

  -- Validate every line and block duplicate replenishment when an existing
  -- open PO already covers this item/location's configured reorder target.
  for line in select value from jsonb_array_elements(p_lines)
  loop
    select *
    into item
    from public.inventory_items
    where id = (line->>'inventory_item_id')::uuid
      and active = true;

    if not found then
      raise exception 'A purchase-order item is missing or inactive.';
    end if;

    qty := (line->>'quantity')::numeric;
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, item.unit_cost);

    if qty <= 0 then
      raise exception 'Purchase-order quantities must be greater than zero.';
    end if;

    if cost < 0 then
      raise exception 'Purchase-order unit cost cannot be negative.';
    end if;

    on_hand := private.fieldops_inventory_location_quantity(
      item.id,
      p_destination_location_id
    );

    target_qty := case
      when coalesce(item.reorder_quantity, 0) > 0
        then item.reorder_quantity
      else greatest(
        1::numeric,
        coalesce(item.reorder_level, 0) - greatest(on_hand, 0)
      )
    end;

    select coalesce(
      sum(greatest(poi.quantity_ordered - poi.quantity_received, 0)),
      0
    )
    into covered_qty
    from public.inventory_purchase_orders existing_po
    join public.inventory_purchase_order_items poi
      on poi.purchase_order_id = existing_po.id
    where existing_po.destination_location_id = p_destination_location_id
      and poi.inventory_item_id = item.id
      and existing_po.status in (
        'draft',
        'approved',
        'ordered',
        'partially_received'
      );

    if covered_qty >= target_qty then
      raise exception
        'An open replenishment PO already covers % at % (% remaining against target %).',
        item.name,
        location_name,
        covered_qty,
        target_qty;
    end if;
  end loop;

  insert into public.inventory_purchase_orders (
    supplier_id,
    destination_location_id,
    expected_date,
    shipping_amount,
    tax_amount,
    notes,
    created_by
  )
  values (
    p_supplier_id,
    p_destination_location_id,
    p_expected_date,
    coalesce(p_shipping_amount, 0),
    coalesce(p_tax_amount, 0),
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning * into po;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    select *
    into item
    from public.inventory_items
    where id = (line->>'inventory_item_id')::uuid
      and active = true;

    qty := (line->>'quantity')::numeric;
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, item.unit_cost);

    insert into public.inventory_purchase_order_items (
      purchase_order_id,
      inventory_item_id,
      description,
      supplier_sku,
      quantity_ordered,
      unit_cost
    )
    values (
      po.id,
      item.id,
      item.name,
      nullif(btrim(line->>'supplier_sku'), ''),
      qty,
      cost
    );

    insert into public.inventory_item_suppliers (
      inventory_item_id,
      supplier_id,
      supplier_sku,
      last_unit_cost,
      preferred,
      active
    )
    values (
      item.id,
      p_supplier_id,
      nullif(btrim(line->>'supplier_sku'), ''),
      cost,
      coalesce(item.preferred_supplier_id = p_supplier_id, false),
      true
    )
    on conflict (inventory_item_id, supplier_id)
    do update set
      supplier_sku = coalesce(
        excluded.supplier_sku,
        public.inventory_item_suppliers.supplier_sku
      ),
      last_unit_cost = excluded.last_unit_cost,
      preferred = excluded.preferred,
      active = true,
      updated_at = now();
  end loop;

  return jsonb_build_object(
    'purchase_order_id', po.id,
    'po_number', po.po_number,
    'destination_location_id', po.destination_location_id
  );
end;
$$;

revoke all on function public.fieldops_create_replenishment_purchase_order(
  uuid,uuid,date,numeric,numeric,text,jsonb
) from public;

grant execute on function public.fieldops_create_replenishment_purchase_order(
  uuid,uuid,date,numeric,numeric,text,jsonb
) to authenticated;

-- Keep the existing RPC compatible. If its notes identify a stock location,
-- route it through the protected location-aware replenishment function.
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
  inferred_location_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can create purchase orders.';
  end if;

  select l.id
  into inferred_location_id
  from public.inventory_locations l
  where l.active = true
    and p_notes is not null
    and position(lower(l.name) in lower(p_notes)) > 0
  order by length(l.name) desc
  limit 1;

  if inferred_location_id is not null then
    return public.fieldops_create_replenishment_purchase_order(
      inferred_location_id,
      p_supplier_id,
      p_expected_date,
      p_shipping_amount,
      p_tax_amount,
      p_notes,
      p_lines
    );
  end if;

  if not exists (
    select 1
    from public.inventory_suppliers s
    where s.id = p_supplier_id
      and s.active = true
  ) then
    raise exception 'Choose an active supplier.';
  end if;

  if coalesce(p_shipping_amount, 0) < 0
     or coalesce(p_tax_amount, 0) < 0 then
    raise exception 'Shipping and tax cannot be negative.';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one purchase-order item.';
  end if;

  insert into public.inventory_purchase_orders (
    supplier_id,
    expected_date,
    shipping_amount,
    tax_amount,
    notes,
    created_by
  )
  values (
    p_supplier_id,
    p_expected_date,
    coalesce(p_shipping_amount, 0),
    coalesce(p_tax_amount, 0),
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning * into po;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    select *
    into item
    from public.inventory_items
    where id = (line->>'inventory_item_id')::uuid
      and active = true;

    if not found then
      raise exception 'A purchase-order item is missing or inactive.';
    end if;

    qty := (line->>'quantity')::numeric;
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, item.unit_cost);

    if qty <= 0 then
      raise exception 'Purchase-order quantities must be greater than zero.';
    end if;

    if cost < 0 then
      raise exception 'Purchase-order unit cost cannot be negative.';
    end if;

    insert into public.inventory_purchase_order_items (
      purchase_order_id,
      inventory_item_id,
      description,
      supplier_sku,
      quantity_ordered,
      unit_cost
    )
    values (
      po.id,
      item.id,
      item.name,
      nullif(btrim(line->>'supplier_sku'), ''),
      qty,
      cost
    );

    insert into public.inventory_item_suppliers (
      inventory_item_id,
      supplier_id,
      supplier_sku,
      last_unit_cost,
      preferred,
      active
    )
    values (
      item.id,
      p_supplier_id,
      nullif(btrim(line->>'supplier_sku'), ''),
      cost,
      coalesce(item.preferred_supplier_id = p_supplier_id, false),
      true
    )
    on conflict (inventory_item_id, supplier_id)
    do update set
      supplier_sku = coalesce(
        excluded.supplier_sku,
        public.inventory_item_suppliers.supplier_sku
      ),
      last_unit_cost = excluded.last_unit_cost,
      preferred = excluded.preferred,
      active = true,
      updated_at = now();
  end loop;

  return jsonb_build_object(
    'purchase_order_id', po.id,
    'po_number', po.po_number
  );
end;
$$;

-- Correct the PO state machine: a PO cannot be closed while quantities remain.
-- A fully received PO may then be closed.
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
  approval_required boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can change a purchase order.';
  end if;

  select status
  into current_status
  from public.inventory_purchase_orders
  where id = p_purchase_order_id
  for update;

  if current_status is null then
    raise exception 'Purchase order not found.';
  end if;

  if p_status not in ('approved','ordered','closed','cancelled') then
    raise exception 'Invalid purchase-order status change.';
  end if;

  if current_status in ('closed','cancelled') then
    raise exception 'This purchase order can no longer be changed.';
  end if;

  if p_status = 'approved' and current_status <> 'draft' then
    raise exception 'Only a Draft purchase order can be approved.';
  end if;

  select coalesce(s.po_approval_required, false)
  into approval_required
  from public.fieldops_settings s
  where s.id = 1;

  if p_status = 'ordered' then
    if approval_required and current_status <> 'approved' then
      raise exception 'This FieldOps configuration requires PO approval before ordering.';
    end if;

    if not approval_required
       and current_status not in ('draft','approved') then
      raise exception 'Only Draft or Approved purchase orders can be ordered.';
    end if;
  end if;

  if p_status = 'cancelled'
     and current_status in ('partially_received','received') then
    raise exception 'A purchase order with received quantities cannot be cancelled.';
  end if;

  if p_status = 'closed' then
    if current_status <> 'received' then
      raise exception 'A purchase order can be closed only after every ordered quantity has been received.';
    end if;
  end if;

  if current_status = 'received' and p_status <> 'closed' then
    raise exception 'A fully received purchase order can only be closed.';
  end if;

  update public.inventory_purchase_orders
  set
    status = p_status,
    approved_by = case
      when p_status = 'approved' then auth.uid()
      else approved_by
    end,
    approved_at = case
      when p_status = 'approved' then now()
      else approved_at
    end,
    ordered_at = case
      when p_status = 'ordered' then now()
      else ordered_at
    end
  where id = p_purchase_order_id;

  return jsonb_build_object(
    'purchase_order_id', p_purchase_order_id,
    'status', p_status
  );
end;
$$;

-- Receiving is location-bound, partial-safe, and is the only point at which
-- available stock / received-cost transactions are created.
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
  expected_location_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can receive purchase orders.';
  end if;

  if not exists (
    select 1
    from public.inventory_locations l
    where l.id = p_location_id
      and l.active = true
  ) then
    raise exception 'Choose an active receiving location.';
  end if;

  select *
  into po
  from public.inventory_purchase_orders
  where id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order not found.';
  end if;

  if po.status not in ('approved','ordered','partially_received') then
    raise exception 'Purchase order must be Approved, Ordered or Partially Received before receiving.';
  end if;

  if po.destination_location_id is null then
    update public.inventory_purchase_orders
    set destination_location_id = p_location_id
    where id = po.id;

    po.destination_location_id := p_location_id;
  elsif po.destination_location_id <> p_location_id then
    select l.name
    into expected_location_name
    from public.inventory_locations l
    where l.id = po.destination_location_id;

    raise exception
      'This purchase order is for %, not the selected receiving location.',
      coalesce(expected_location_name, 'another location');
  end if;

  if jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Enter at least one received quantity.';
  end if;

  insert into public.inventory_receipts (
    purchase_order_id,
    location_id,
    received_at,
    packing_slip,
    notes,
    created_by
  )
  values (
    po.id,
    p_location_id,
    coalesce(p_received_at, now()),
    nullif(btrim(p_packing_slip), ''),
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning * into receipt;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    qty := coalesce((line->>'quantity_received')::numeric, 0);
    damaged := coalesce((line->>'quantity_damaged')::numeric, 0);

    if qty <= 0 then
      continue;
    end if;

    processed_count := processed_count + 1;

    if damaged < 0 or damaged > qty then
      raise exception 'Damaged quantity must be between zero and received quantity.';
    end if;

    select *
    into poi
    from public.inventory_purchase_order_items
    where id = (line->>'purchase_order_item_id')::uuid
      and purchase_order_id = po.id
    for update;

    if not found then
      raise exception 'Purchase-order line not found.';
    end if;

    if poi.quantity_received + qty > poi.quantity_ordered then
      raise exception 'Received quantity exceeds the remaining purchase-order quantity.';
    end if;

    cost := coalesce(nullif(line->>'unit_cost','')::numeric, poi.unit_cost);
    good_qty := qty - damaged;

    insert into public.inventory_receipt_items (
      receipt_id,
      purchase_order_item_id,
      inventory_item_id,
      quantity_received,
      quantity_damaged,
      unit_cost
    )
    values (
      receipt.id,
      poi.id,
      poi.inventory_item_id,
      qty,
      damaged,
      cost
    );

    update public.inventory_purchase_order_items
    set
      quantity_received = quantity_received + qty,
      unit_cost = cost
    where id = poi.id;

    if good_qty > 0 then
      insert into public.inventory_transactions (
        inventory_item_id,
        location_id,
        supplier_id,
        purchase_order_id,
        receipt_id,
        transaction_type,
        quantity,
        unit_cost,
        reference,
        notes,
        created_by
      )
      values (
        poi.inventory_item_id,
        p_location_id,
        po.supplier_id,
        po.id,
        receipt.id,
        'receive',
        good_qty,
        cost,
        receipt.receipt_number,
        case
          when damaged > 0 then
            concat(
              damaged,
              ' received damaged and excluded from available stock. ',
              coalesce(p_notes,'')
            )
          else nullif(btrim(p_notes),'')
        end,
        auth.uid()
      );
    end if;

    update public.inventory_items
    set unit_cost = cost
    where id = poi.inventory_item_id;

    update public.inventory_item_suppliers
    set
      last_unit_cost = cost,
      updated_at = now()
    where inventory_item_id = poi.inventory_item_id
      and supplier_id = po.supplier_id;
  end loop;

  if processed_count = 0 then
    raise exception 'Enter at least one received quantity greater than zero.';
  end if;

  if not exists (
    select 1
    from public.inventory_purchase_order_items x
    where x.purchase_order_id = po.id
      and x.quantity_received < x.quantity_ordered
  ) then
    update public.inventory_purchase_orders
    set status = 'received'
    where id = po.id;
  else
    update public.inventory_purchase_orders
    set status = 'partially_received'
    where id = po.id;
  end if;

  return jsonb_build_object(
    'receipt_id', receipt.id,
    'receipt_number', receipt.receipt_number
  );
end;
$$;

-- Reporting source: costs appear only after a receipt is posted, never merely
-- because a PO was created.
create or replace view public.fieldops_inventory_received_cost_report
with (security_invoker = true)
as
select
  r.id as receipt_id,
  r.receipt_number,
  r.purchase_order_id,
  r.location_id,
  r.received_at,
  ri.inventory_item_id,
  ri.quantity_received,
  ri.quantity_damaged,
  greatest(ri.quantity_received - ri.quantity_damaged, 0) as quantity_added_to_stock,
  ri.unit_cost,
  (ri.quantity_received * ri.unit_cost) as received_cost,
  (greatest(ri.quantity_received - ri.quantity_damaged, 0) * ri.unit_cost) as accepted_stock_cost
from public.inventory_receipts r
join public.inventory_receipt_items ri
  on ri.receipt_id = r.id
where r.status = 'posted';

grant select on public.fieldops_inventory_received_cost_report to authenticated;

commit;
