-- FIELDOPS CROSS-MODULE INTEGRITY FIX V1
-- Keeps Work Orders, Billing, Inventory, Assets and technician time synchronized.

begin;

-- ============================================================
-- MATERIAL USAGE: TRACK RETURNS WITHOUT DELETING HISTORY
-- ============================================================

alter table public.material_usage
  add column if not exists quantity_returned numeric(12,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'material_usage_quantity_returned_check'
      and conrelid = 'public.material_usage'::regclass
  ) then
    alter table public.material_usage
      add constraint material_usage_quantity_returned_check
      check (quantity_returned >= 0 and quantity_returned <= quantity);
  end if;
end $$;

-- Any material change after invoice approval must return the work order to review.
create or replace function private.fieldops_material_usage_billing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wo_id uuid;
  old_billing text;
begin
  wo_id := coalesce(new.work_order_id, old.work_order_id);
  if wo_id is null then return coalesce(new, old); end if;

  select billing_status into old_billing
  from public.work_orders
  where id = wo_id
  for update;

  if old_billing = 'billed' then
    update public.work_orders
    set billing_status = 'review_required', updated_at = pg_catalog.now()
    where id = wo_id;

    insert into public.work_order_events(work_order_id,event_type,details)
    values (
      wo_id,
      'billing_review_required',
      jsonb_build_object(
        'reason','material_usage_changed_after_billing',
        'changed_at',pg_catalog.now()
      )
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_fieldops_material_usage_billing_review on public.material_usage;
create trigger trg_fieldops_material_usage_billing_review
after insert or update or delete on public.material_usage
for each row execute function private.fieldops_material_usage_billing_review();

-- ============================================================
-- INVENTORY RETURNS: REDUCE BILLABLE WORK-ORDER MATERIALS
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
  remaining_return numeric;
  usage_row public.material_usage%rowtype;
  reversible numeric;
  apply_qty numeric;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician']::text[])) then
    raise exception 'You do not have permission to record an inventory return.';
  end if;
  if p_return_type not in ('supplier','work_order','technician','customer','other') then raise exception 'Invalid return type.'; end if;
  if p_return_type = 'supplier' and not (select private.has_any_role(array['admin','manager','inventory']::text[])) then
    raise exception 'Only Admin, Manager or Inventory can return stock to a supplier.';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) < 3 then raise exception 'Return reason must be at least 3 characters.'; end if;
  if p_return_type = 'supplier' and p_supplier_id is null then raise exception 'Supplier is required for a supplier return.'; end if;
  if p_return_type = 'work_order' and p_work_order_id is null then raise exception 'Work order is required for a work-order return.'; end if;
  if p_return_type = 'technician' and p_technician_id is null then raise exception 'Technician is required for a technician return.'; end if;
  if p_return_type = 'customer' and p_customer_id is null then raise exception 'Customer is required for a customer return.'; end if;
  if not exists (select 1 from public.inventory_locations l where l.id = p_location_id and l.active = true) then raise exception 'Choose an active inventory location.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one return item.'; end if;

  insert into public.inventory_returns(
    return_type,supplier_id,purchase_order_id,work_order_id,technician_id,customer_id,location_id,
    reason,notes,created_by
  ) values (
    p_return_type,p_supplier_id,p_purchase_order_id,p_work_order_id,p_technician_id,p_customer_id,
    p_location_id,btrim(p_reason),nullif(btrim(p_notes),''),auth.uid()
  ) returning * into ret;

  for line in select value from jsonb_array_elements(p_lines)
  loop
    select * into item from public.inventory_items where id = (line->>'inventory_item_id')::uuid;
    if not found then raise exception 'Return item not found.'; end if;

    qty := (line->>'quantity')::numeric;
    condition_value := coalesce(nullif(line->>'condition',''),'restockable');
    cost := coalesce(nullif(line->>'unit_cost','')::numeric,item.unit_cost);
    if qty <= 0 then raise exception 'Return quantities must be greater than zero.'; end if;
    if condition_value not in ('restockable','damaged','scrap') then raise exception 'Invalid return condition.'; end if;

    -- A Work Order return must be traceable to previously consumed material.
    if p_return_type = 'work_order' then
      select coalesce(sum(mu.quantity - mu.quantity_returned),0)
      into reversible
      from public.material_usage mu
      where mu.work_order_id = p_work_order_id
        and mu.inventory_item_id = item.id;

      if reversible < qty then
        raise exception 'Return quantity exceeds material previously consumed by this work order.';
      end if;
    end if;

    insert into public.inventory_return_items(return_id,inventory_item_id,quantity,condition,unit_cost)
    values (ret.id,item.id,qty,condition_value,cost);

    if p_return_type = 'supplier' then
      available_qty := private.fieldops_inventory_location_quantity(item.id,p_location_id);
      if available_qty < qty then raise exception 'Insufficient stock for supplier return.'; end if;
      signed_qty := -qty;
    elsif condition_value = 'restockable' then
      signed_qty := qty;
    else
      signed_qty := 0;
    end if;

    if signed_qty <> 0 then
      insert into public.inventory_transactions(
        inventory_item_id,location_id,work_order_id,technician_id,supplier_id,purchase_order_id,
        return_id,transaction_type,quantity,unit_cost,reference,notes,created_by
      ) values (
        item.id,p_location_id,p_work_order_id,p_technician_id,p_supplier_id,p_purchase_order_id,
        ret.id,'return',signed_qty,cost,ret.return_number,
        concat('Return condition: ',condition_value,'. ',coalesce(p_notes,'')),auth.uid()
      );
    end if;

    if p_return_type = 'work_order' then
      remaining_return := qty;
      for usage_row in
        select * from public.material_usage
        where work_order_id = p_work_order_id
          and inventory_item_id = item.id
          and quantity_returned < quantity
        order by created_at desc, id
        for update
      loop
        exit when remaining_return <= 0;
        reversible := usage_row.quantity - usage_row.quantity_returned;
        apply_qty := least(reversible,remaining_return);
        update public.material_usage
        set quantity_returned = quantity_returned + apply_qty
        where id = usage_row.id;
        remaining_return := remaining_return - apply_qty;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('return_id',ret.id,'return_number',ret.return_number);
end;
$$;

-- ============================================================
-- INVOICE SOURCE SYNCHRONIZATION
-- ============================================================

create or replace function private.fieldops_sync_invoice_source_lines(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  wo public.work_orders%rowtype;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.work_order_id is null then return; end if;

  select * into wo from public.work_orders where id = inv.work_order_id;
  if not found then raise exception 'Work order not found.'; end if;

  delete from public.invoice_items
  where invoice_id = inv.id and source_type in ('time_entry','material_usage');

  insert into public.invoice_items(
    invoice_id,work_order_id,line_type,description,quantity,unit_price,sort_order,source_type,source_id,taxable
  )
  select
    inv.id,wo.id,
    case when coalesce(te.activity_type,'work')='travel' then 'travel' else 'labour' end,
    concat(
      case coalesce(te.activity_type,'work')
        when 'travel' then 'Travel' when 'on_site' then 'On Site' when 'waiting' then 'Waiting'
        when 'break' then 'Break / Lunch' when 'other' then 'Other labour' else 'Labour'
      end,
      ' · ',coalesce(p.full_name,p.email,'Technician')
    ),
    greatest(coalesce(te.duration_minutes,round(extract(epoch from (te.ended_at-te.started_at))/60.0)::integer),0)::numeric/60.0,
    coalesce(te.billing_rate,te.hourly_rate,0),
    row_number() over(order by te.started_at)::integer,
    'time_entry',te.id,true
  from public.time_entries te
  left join public.profiles p on p.id = te.technician_id
  where te.work_order_id = wo.id
    and te.billable = true
    and te.ended_at is not null
    and coalesce(te.approval_status,'approved')='approved'
    and coalesce(te.duration_minutes,round(extract(epoch from (te.ended_at-te.started_at))/60.0)::integer,0)>0;

  insert into public.invoice_items(
    invoice_id,work_order_id,line_type,description,quantity,unit_price,sort_order,source_type,source_id,taxable
  )
  select inv.id,wo.id,'material',mu.description,
    (mu.quantity-coalesce(mu.quantity_returned,0)),mu.unit_price,
    1000+row_number() over(order by mu.created_at)::integer,
    'material_usage',mu.id,true
  from public.material_usage mu
  where mu.work_order_id=wo.id
    and mu.billable=true
    and (mu.quantity-coalesce(mu.quantity_returned,0))>0;

  perform private.fieldops_recalculate_invoice(inv.id);
end;
$$;

create or replace function public.fieldops_refresh_invoice_from_work_order(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare inv public.invoices%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status <> 'draft' then raise exception 'Only a Draft invoice can be refreshed from its Work Order.'; end if;
  if inv.work_order_id is null then raise exception 'This invoice is not linked to a Work Order.'; end if;

  perform private.fieldops_sync_invoice_source_lines(inv.id);
  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values(inv.id,'invoice_source_refreshed',jsonb_build_object('work_order_id',inv.work_order_id),auth.uid());

  return jsonb_build_object('invoice_id',inv.id,'refreshed',true);
end;
$$;

-- Latest Settings-aware invoice creation, using billing state as the authority.
create or replace function public.fieldops_create_invoice_from_work_order(p_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  wo public.work_orders%rowtype;
  cust public.customers%rowtype;
  st public.sites%rowtype;
  inv public.invoices%rowtype;
  defaults public.fieldops_settings%rowtype;
  terms_days integer;
  site_snapshot text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Only Admin, Manager or Billing can create invoices.'; end if;

  select * into wo from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if wo.billing_status not in ('ready','review_required') then raise exception 'This work order is not ready for billing.'; end if;
  if wo.status not in ('billing_ready','closed') then raise exception 'The Work Order must be Billing Ready before an invoice can be created.'; end if;
  if exists(select 1 from public.invoices i where i.work_order_id=wo.id and i.status<>'void') then raise exception 'This work order already has an active invoice.'; end if;

  select * into cust from public.customers where id=wo.customer_id;
  if not found then raise exception 'Customer not found.'; end if;
  select * into defaults from public.fieldops_settings where id=1;

  if wo.site_id is not null then
    select * into st from public.sites where id=wo.site_id;
    if found then site_snapshot := concat_ws(', ',nullif(st.address1,''),nullif(st.address2,''),nullif(st.city,''),nullif(st.province_state,''),nullif(st.postal_code,''),nullif(st.country,'')); end if;
  end if;

  terms_days := greatest(coalesce(cust.billing_terms_days,cust.payment_terms_days,defaults.default_payment_terms_days,30),0);

  insert into public.invoices(
    customer_id,site_id,work_order_id,status,issued_date,due_date,tax_rate,discount_amount,
    notes,currency,billing_email_snapshot,customer_name_snapshot,site_address_snapshot,created_by
  ) values (
    wo.customer_id,wo.site_id,wo.id,'draft',current_date,current_date+terms_days,
    case when cust.tax_exempt then 0 else coalesce(defaults.default_tax_rate,0) end,
    0,null,coalesce(defaults.currency,'CAD'),cust.billing_email,cust.name,nullif(site_snapshot,''),auth.uid()
  ) returning * into inv;

  perform private.fieldops_sync_invoice_source_lines(inv.id);

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values(inv.id,'invoice_created_from_work_order',jsonb_build_object('work_order_id',wo.id,'work_order_number',wo.work_order_number),auth.uid());

  return jsonb_build_object('invoice_id',inv.id,'invoice_number',inv.invoice_number);
end;
$$;

-- Always synchronize a Draft with current approved labour/material source before approval.
create or replace function public.fieldops_set_invoice_status(p_invoice_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  wo_billing_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_status not in ('approved','sent') then raise exception 'Unsupported invoice status transition.'; end if;

  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;

  if p_status='approved' then
    if inv.status<>'draft' then raise exception 'Only a Draft invoice can be approved.'; end if;
    if inv.work_order_id is not null then
      select billing_status into wo_billing_status from public.work_orders where id=inv.work_order_id for update;
      if wo_billing_status not in ('ready','review_required') then raise exception 'Work Order is no longer ready for billing.'; end if;
      perform private.fieldops_sync_invoice_source_lines(inv.id);
    else
      perform private.fieldops_recalculate_invoice(inv.id);
    end if;
    select * into inv from public.invoices where id=p_invoice_id for update;
    if inv.total<=0 then raise exception 'Invoice total must be greater than zero before approval.'; end if;

    update public.invoices set status='approved',approved_by=auth.uid(),approved_at=pg_catalog.now(),issued_date=coalesce(issued_date,current_date),updated_at=pg_catalog.now() where id=p_invoice_id;
    if inv.work_order_id is not null then
      update public.work_orders set billing_status='billed',billed_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=inv.work_order_id;
    end if;
    insert into public.invoice_events(invoice_id,event_type,details,created_by) values(p_invoice_id,'invoice_approved',null,auth.uid());
  else
    if inv.status not in ('approved','ready') then raise exception 'Only an Approved invoice can be marked Sent.'; end if;
    update public.invoices set status='sent',sent_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=p_invoice_id;
    insert into public.invoice_events(invoice_id,event_type,details,created_by) values(p_invoice_id,'invoice_sent',jsonb_build_object('billing_email',inv.billing_email_snapshot),auth.uid());
  end if;

  return jsonb_build_object('invoice_id',p_invoice_id,'status',p_status);
end;
$$;

-- ============================================================
-- WORK ORDER LIFECYCLE + BILLING HANDOFF
-- ============================================================

create or replace function private.fieldops_normal_transition_allowed(p_old text,p_new text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_old
    when 'requested' then p_new in ('planned','cancelled')
    when 'planned' then p_new in ('cancelled') -- assignment RPC moves Planned -> Assigned
    when 'assigned' then p_new in ('travelling','cancelled')
    when 'travelling' then p_new in ('on_site','cancelled')
    when 'on_site' then p_new in ('working','waiting','finished','cancelled')
    when 'working' then p_new in ('waiting','finished','cancelled')
    when 'waiting' then p_new in ('working','finished','cancelled')
    when 'finished' then p_new in ('billing_ready')
    when 'billing_ready' then p_new in ('closed')
    else false
  end;
$$;

create or replace function public.fieldops_transition_work_order_status(
  p_work_order_id uuid,
  p_new_status text,
  p_at timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  old_billing_status text;
  activity text;
  a public.work_order_assignments%rowtype;
  open_other uuid;
  can_manage boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_new_status not in ('requested','planned','assigned','travelling','on_site','working','waiting','finished','billing_ready','closed','cancelled') then raise exception 'Unsupported work-order status: %',p_new_status; end if;

  select wo.status,wo.billing_status into old_status,old_billing_status
  from public.work_orders wo where wo.id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;

  can_manage := (select private.has_any_role(array['admin','manager','dispatcher']::text[]));
  if not can_manage and not (select private.is_assigned_to_work_order(p_work_order_id)) then raise exception 'You are not authorized to change this work order.'; end if;
  if p_new_status=old_status then return jsonb_build_object('status',old_status,'changed',false); end if;

  if not private.fieldops_normal_transition_allowed(old_status,p_new_status) then
    raise exception 'Invalid Work Order transition: % -> %. Use the normal lifecycle or an Admin Override.',old_status,p_new_status;
  end if;

  if p_new_status='billing_ready' and old_status<>'finished' then raise exception 'Only a Finished Work Order can become Billing Ready.'; end if;
  if p_new_status='closed' then
    if old_billing_status not in ('billed','waived') then raise exception 'Work Order cannot close until Billing is Billed or Waived / No Charge.'; end if;
    if exists(select 1 from public.assets x where x.current_work_order_id=p_work_order_id) then
      raise exception 'Work Order still has one or more Assets assigned to it. Transfer or resolve those Assets before closing.';
    end if;
  end if;

  activity := private.fieldops_activity_for_status(p_new_status);

  if activity is not null then
    select * into a
    from public.work_order_assignments
    where work_order_id=p_work_order_id
      and assignment_status='accepted'
      and assignment_role='primary'
      and released_at is null
    order by accepted_at desc nulls last,assigned_at desc
    limit 1 for update;

    if not found then raise exception 'An active primary technician assignment is required before the job can enter %.',p_new_status; end if;
    if not can_manage and a.technician_id<>auth.uid() then raise exception 'Only the active primary technician can start this activity.'; end if;

    select te.work_order_id into open_other
    from public.time_entries te
    where te.technician_id=a.technician_id and te.ended_at is null and te.work_order_id<>p_work_order_id
    limit 1;
    if open_other is not null then raise exception 'Technician is still active on another work order and is not available.'; end if;

    perform private.fieldops_close_open_time(p_work_order_id,a.technician_id,p_at,'status_change');
    insert into public.time_entries(work_order_id,technician_id,assignment_id,started_at,activity_type,billable,source,notes)
    values(p_work_order_id,a.technician_id,a.id,p_at,activity,activity not in ('waiting','break'),'status_transition','Actual time created by work-order status transition.');
  else
    update public.time_entries te
    set ended_at=greatest(p_at,te.started_at),
        ended_reason=case when p_new_status in ('finished','billing_ready','closed') then p_new_status when p_new_status='cancelled' then 'cancelled' else 'status_change' end
    where te.work_order_id=p_work_order_id and te.ended_at is null;
  end if;

  update public.work_orders
  set status=p_new_status,
      completed_at=case when p_new_status in ('finished','billing_ready','closed') then coalesce(completed_at,p_at) else completed_at end,
      billing_status=case when p_new_status='billing_ready' then case when old_billing_status='waived' then 'waived' else 'ready' end else billing_status end,
      billing_ready_at=case when p_new_status='billing_ready' then coalesce(billing_ready_at,p_at) else billing_ready_at end,
      closed_at=case when p_new_status='closed' then coalesce(closed_at,p_at) else closed_at end,
      updated_at=pg_catalog.now()
  where id=p_work_order_id;

  if p_new_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set assignment_status='completed',updated_at=pg_catalog.now()
    where work_order_id=p_work_order_id and assignment_status='accepted';
  end if;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(p_work_order_id,'status_change',old_status,p_new_status,
    jsonb_build_object('actual_time_activity',activity,'transition_at',p_at,'billing_status',case when p_new_status='billing_ready' then case when old_billing_status='waived' then 'waived' else 'ready' end else old_billing_status end));

  return jsonb_build_object('status',p_new_status,'changed',true,'activity_type',activity);
end;
$$;

-- Admin-only exceptional status correction. Still protects financially unsafe closure.
create or replace function public.fieldops_admin_override_work_order_status(
  p_work_order_id uuid,
  p_new_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  billing_state text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin']::text[])) then raise exception 'Admin role required for status override.'; end if;
  if p_reason is null or length(btrim(p_reason))<5 then raise exception 'Override reason must be at least 5 characters.'; end if;
  if p_new_status not in ('requested','planned','assigned','travelling','on_site','working','waiting','finished','billing_ready','closed','cancelled') then raise exception 'Unsupported Work Order status.'; end if;

  select status,billing_status into old_status,billing_state from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if p_new_status='assigned' and not exists(select 1 from public.work_order_assignments a where a.work_order_id=p_work_order_id and a.assignment_role='primary' and a.assignment_status='accepted' and a.released_at is null) then raise exception 'Assigned status requires an active primary technician. Use Assign Technician.'; end if;
  if p_new_status='billing_ready' and billing_state='billed' then raise exception 'A Billed Work Order cannot be moved back to Billing Ready. Void/reopen billing first if correction is required.'; end if;
  if p_new_status='closed' and billing_state not in ('billed','waived') then raise exception 'Even an Admin Override cannot close an unbilled Work Order. Bill it or Waive Billing first.'; end if;
  if p_new_status='closed' and exists(select 1 from public.assets x where x.current_work_order_id=p_work_order_id) then raise exception 'Resolve Assets assigned to this Work Order before closing.'; end if;

  if p_new_status in ('finished','billing_ready','closed','cancelled') then
    update public.time_entries set ended_at=greatest(pg_catalog.now(),started_at),ended_reason='admin_override' where work_order_id=p_work_order_id and ended_at is null;
  end if;

  update public.work_orders set
    status=p_new_status,
    completed_at=case when p_new_status in ('finished','billing_ready','closed') then coalesce(completed_at,pg_catalog.now()) else null end,
    billing_status=case when p_new_status='billing_ready' then case when billing_state='waived' then 'waived' else 'ready' end else billing_status end,
    billing_ready_at=case when p_new_status='billing_ready' then coalesce(billing_ready_at,pg_catalog.now()) else billing_ready_at end,
    closed_at=case when p_new_status='closed' then coalesce(closed_at,pg_catalog.now()) else null end,
    updated_at=pg_catalog.now()
  where id=p_work_order_id;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(p_work_order_id,'admin_status_override',old_status,p_new_status,jsonb_build_object('reason',btrim(p_reason),'overridden_by',auth.uid(),'overridden_at',pg_catalog.now()));

  return jsonb_build_object('status',p_new_status,'changed',old_status is distinct from p_new_status,'override',true);
end;
$$;

-- No-charge path: explicit, audited, and safe for closure.
create or replace function public.fieldops_waive_work_order_billing(p_work_order_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare old_billing text; work_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Only Admin, Manager or Billing can waive billing.'; end if;
  if p_reason is null or length(btrim(p_reason))<5 then raise exception 'Waiver reason must be at least 5 characters.'; end if;

  select status,billing_status into work_status,old_billing from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if work_status not in ('finished','billing_ready','closed') then raise exception 'Billing can only be waived after field work is Finished.'; end if;
  if exists(select 1 from public.invoices i where i.work_order_id=p_work_order_id and i.status<>'void') then raise exception 'Void the active invoice before waiving this Work Order.'; end if;

  update public.work_orders set billing_status='waived',billed_at=null,updated_at=pg_catalog.now() where id=p_work_order_id;
  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(p_work_order_id,'billing_waived',work_status,work_status,jsonb_build_object('old_billing_status',old_billing,'new_billing_status','waived','reason',btrim(p_reason),'waived_by',auth.uid(),'waived_at',pg_catalog.now()));

  return jsonb_build_object('billing_status','waived','waived',true);
end;
$$;

-- Billing recovery is only valid after field completion and never overwrites billed/waived.
create or replace function public.fieldops_recover_billing(p_work_order_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare work_status text; old_billing_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Only Admin, Manager, or Billing may recover billing.'; end if;
  if p_reason is null or length(btrim(p_reason))<5 then raise exception 'A billing recovery reason of at least 5 characters is required.'; end if;

  select status,billing_status into work_status,old_billing_status from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if work_status not in ('finished','billing_ready','closed') then raise exception 'Billing recovery is only allowed after field work is Finished.'; end if;
  if old_billing_status in ('billed','waived') then raise exception 'This Work Order is already Billed or Waived.'; end if;

  update public.work_orders set billing_status='ready',billing_ready_at=coalesce(billing_ready_at,pg_catalog.now()),updated_at=pg_catalog.now() where id=p_work_order_id;
  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(p_work_order_id,'billing_recovered',work_status,work_status,jsonb_build_object('old_billing_status',old_billing_status,'new_billing_status','ready','reason',btrim(p_reason),'recovered_by',auth.uid(),'recovered_at',pg_catalog.now()));

  return jsonb_build_object('billing_status','ready','recovered',true);
end;
$$;

-- ============================================================
-- CUSTOMER FIELD COMPATIBILITY: KEEP OLD + NEW TERMS/ACCOUNT IN SYNC
-- ============================================================

update public.customers
set billing_terms_days = coalesce(billing_terms_days,payment_terms_days,30),
    payment_terms_days = coalesce(billing_terms_days,payment_terms_days,30),
    account_number = coalesce(account_number,account_code),
    account_code = coalesce(account_code,account_number);

create or replace function private.fieldops_sync_customer_compat_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op='INSERT' then
    new.billing_terms_days := coalesce(new.billing_terms_days,new.payment_terms_days,30);
    new.payment_terms_days := new.billing_terms_days;
    new.account_number := coalesce(new.account_number,new.account_code);
    new.account_code := coalesce(new.account_code,new.account_number);
  else
    if new.billing_terms_days is distinct from old.billing_terms_days then
      new.payment_terms_days := new.billing_terms_days;
    elsif new.payment_terms_days is distinct from old.payment_terms_days then
      new.billing_terms_days := new.payment_terms_days;
    end if;
    if new.account_number is distinct from old.account_number then
      new.account_code := new.account_number;
    elsif new.account_code is distinct from old.account_code then
      new.account_number := new.account_code;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fieldops_sync_customer_compat_fields on public.customers;
create trigger trg_fieldops_sync_customer_compat_fields
before insert or update on public.customers
for each row execute function private.fieldops_sync_customer_compat_fields();

-- Permissions
revoke all on function public.fieldops_refresh_invoice_from_work_order(uuid) from public;
revoke all on function public.fieldops_admin_override_work_order_status(uuid,text,text) from public;
revoke all on function public.fieldops_waive_work_order_billing(uuid,text) from public;
grant execute on function public.fieldops_refresh_invoice_from_work_order(uuid) to authenticated;
grant execute on function public.fieldops_admin_override_work_order_status(uuid,text,text) to authenticated;
grant execute on function public.fieldops_waive_work_order_billing(uuid,text) to authenticated;

commit;
