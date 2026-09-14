-- FIELDOPS BILLING REVIEW INTELLIGENCE
-- Adds rich review events for post-billing source changes and explicit review resolution.

begin;

create or replace function private.fieldops_material_usage_billing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wo_id uuid;
  old_billing text;
  active_invoice_id uuid;
begin
  wo_id := coalesce(new.work_order_id, old.work_order_id);
  if wo_id is null then return coalesce(new, old); end if;

  select wo.billing_status into old_billing
  from public.work_orders wo
  where wo.id = wo_id
  for update;

  if old_billing in ('billed','review_required') then
    update public.work_orders
    set billing_status='review_required',updated_at=pg_catalog.now()
    where id=wo_id;

    select i.id into active_invoice_id
    from public.invoices i
    where i.work_order_id=wo_id and i.status<>'void'
    order by i.created_at desc limit 1;

    insert into public.work_order_events(work_order_id,event_type,details,created_by)
    values(
      wo_id,'billing_review_required',
      jsonb_build_object(
        'reason','material_usage_changed_after_billing',
        'operation',lower(tg_op),
        'invoice_id',active_invoice_id,
        'material_usage_id',coalesce(new.id,old.id),
        'inventory_item_id',coalesce(new.inventory_item_id,old.inventory_item_id),
        'description',coalesce(new.description,old.description),
        'before',case when tg_op='INSERT' then null else jsonb_build_object(
          'quantity',old.quantity,'quantity_returned',old.quantity_returned,
          'unit_price',old.unit_price,'billable',old.billable
        ) end,
        'after',case when tg_op='DELETE' then null else jsonb_build_object(
          'quantity',new.quantity,'quantity_returned',new.quantity_returned,
          'unit_price',new.unit_price,'billable',new.billable
        ) end,
        'changed_by',auth.uid(),'changed_at',pg_catalog.now()
      ),auth.uid()
    );
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.fieldops_time_correction_billing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_billing text;
  active_invoice_id uuid;
  review_reason text;
begin
  select wo.billing_status into old_billing
  from public.work_orders wo
  where wo.id=new.work_order_id
  for update;

  if old_billing in ('billed','review_required') then
    update public.work_orders
    set billing_status='review_required',updated_at=pg_catalog.now()
    where id=new.work_order_id;

    select i.id into active_invoice_id
    from public.invoices i
    where i.work_order_id=new.work_order_id and i.status<>'void'
    order by i.created_at desc limit 1;

    review_reason := case
      when new.operation='added' then 'missing_time_added_after_billing'
      else 'technician_time_changed_after_billing'
    end;

    insert into public.work_order_events(work_order_id,event_type,details,created_by)
    values(
      new.work_order_id,'billing_review_required',
      jsonb_build_object(
        'reason',review_reason,'invoice_id',active_invoice_id,
        'correction_id',new.id,'time_entry_id',new.time_entry_id,
        'technician_id',new.technician_id,'operation',new.operation,
        'before',new.original_values,'after',new.corrected_values,
        'correction_reason',new.reason,'changed_by',new.corrected_by,
        'changed_at',new.corrected_at
      ),new.corrected_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_time_correction_billing_review on public.time_entry_corrections;
create trigger trg_time_correction_billing_review
after insert on public.time_entry_corrections
for each row execute function private.fieldops_time_correction_billing_review();

create or replace function private.fieldops_travel_distance_billing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare active_invoice_id uuid;
begin
  if old.travel_distance_km is distinct from new.travel_distance_km
     and old.billing_status in ('billed','review_required') then
    update public.work_orders
    set billing_status='review_required',updated_at=pg_catalog.now()
    where id=new.id;

    select i.id into active_invoice_id
    from public.invoices i
    where i.work_order_id=new.id and i.status<>'void'
    order by i.created_at desc limit 1;

    insert into public.work_order_events(work_order_id,event_type,details,created_by)
    values(
      new.id,'billing_review_required',
      jsonb_build_object(
        'reason','travel_distance_changed_after_billing',
        'invoice_id',active_invoice_id,
        'before',jsonb_build_object('travel_distance_km',old.travel_distance_km),
        'after',jsonb_build_object('travel_distance_km',new.travel_distance_km),
        'changed_by',auth.uid(),'changed_at',pg_catalog.now()
      ),auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_travel_distance_billing_review on public.work_orders;
create trigger trg_travel_distance_billing_review
after update of travel_distance_km on public.work_orders
for each row execute function private.fieldops_travel_distance_billing_review();

create or replace function public.fieldops_resolve_billing_review(
  p_work_order_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  wo public.work_orders%rowtype;
  inv public.invoices%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then
    raise exception 'Admin, Manager or Billing role required.';
  end if;
  if p_note is null or length(btrim(p_note))<5 then
    raise exception 'Enter a resolution note of at least 5 characters.';
  end if;

  select * into wo from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work Order not found.'; end if;
  if wo.billing_status<>'review_required' then
    raise exception 'This Work Order does not currently require billing review.';
  end if;

  select * into inv
  from public.invoices
  where work_order_id=wo.id and status<>'void'
  order by created_at desc limit 1;

  if not found then raise exception 'No active invoice exists for this billing review.'; end if;
  if inv.status='draft' then
    raise exception 'Refresh and approve the Draft invoice instead of resolving a billed review.';
  end if;

  update public.work_orders
  set billing_status='billed',updated_at=pg_catalog.now()
  where id=wo.id;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details,created_by)
  values(
    wo.id,'billing_review_resolved',wo.status,wo.status,
    jsonb_build_object(
      'invoice_id',inv.id,'invoice_number',inv.invoice_number,
      'note',btrim(p_note),'resolved_by',auth.uid(),'resolved_at',pg_catalog.now()
    ),auth.uid()
  );

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values(
    inv.id,'billing_review_resolved',
    jsonb_build_object(
      'work_order_id',wo.id,'note',btrim(p_note),'resolved_at',pg_catalog.now()
    ),auth.uid()
  );

  return jsonb_build_object(
    'resolved',true,'work_order_id',wo.id,'invoice_id',inv.id,'billing_status','billed'
  );
end;
$$;

revoke all on function public.fieldops_resolve_billing_review(uuid,text) from public;
grant execute on function public.fieldops_resolve_billing_review(uuid,text) to authenticated;

commit;
