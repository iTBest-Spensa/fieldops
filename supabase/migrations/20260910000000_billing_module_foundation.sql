-- FIELDOPS BILLING MODULE FOUNDATION V1
-- Work-order billing, labour/material invoice generation, manual charges,
-- credit notes, Cash/Tap payments, partial/split payments and audit history.

begin;

-- ============================================================
-- EXISTING BILLING TABLE EXTENSIONS
-- ============================================================

alter table public.invoices
  add column if not exists currency text not null default 'CAD',
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id) on delete set null,
  add column if not exists void_reason text,
  add column if not exists billing_email_snapshot text,
  add column if not exists customer_name_snapshot text,
  add column if not exists site_address_snapshot text;

alter table public.invoices
  drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft','ready','approved','sent','partial','paid','overdue','void'));

alter table public.invoices
  drop constraint if exists invoices_currency_check;
alter table public.invoices
  add constraint invoices_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.invoice_items
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists taxable boolean not null default true;

alter table public.invoice_items
  drop constraint if exists invoice_items_source_type_check;
alter table public.invoice_items
  add constraint invoice_items_source_type_check
  check (source_type is null or source_type in ('time_entry','material_usage','manual'));

create unique index if not exists uq_invoice_items_source
  on public.invoice_items(invoice_id, source_type, source_id)
  where source_type is not null and source_id is not null;

alter table public.payments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id) on delete set null,
  add column if not exists void_reason text;

alter table public.payments
  drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash','tap','cheque','credit_card','debit','eft','etransfer','other'));

-- ============================================================
-- CREDIT NOTES / ADJUSTMENTS + ACTIVITY
-- ============================================================

create table if not exists public.invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('credit','charge')),
  amount numeric(12,2) not null check (amount <> 0),
  reason text not null check (length(btrim(reason)) >= 3),
  notes text,
  status text not null default 'posted' check (status in ('posted','void')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text,
  check (
    (adjustment_type = 'credit' and amount < 0)
    or (adjustment_type = 'charge' and amount > 0)
  )
);

create index if not exists idx_invoice_adjustments_invoice
  on public.invoice_adjustments(invoice_id, created_at desc);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  event_type text not null check (btrim(event_type) <> ''),
  details jsonb,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_events_invoice
  on public.invoice_events(invoice_id, created_at desc);

-- ============================================================
-- RECALCULATE INVOICE TOTALS + PAYMENT STATE
-- ============================================================

create or replace function private.fieldops_recalculate_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  line_sum numeric(12,2);
  taxable_line_sum numeric(12,2);
  adjustment_sum numeric(12,2);
  paid_sum numeric(12,2);
  calculated_subtotal numeric(12,2);
  taxable_base numeric(12,2);
  calculated_tax numeric(12,2);
  calculated_total numeric(12,2);
  calculated_balance numeric(12,2);
  next_status text;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then return; end if;

  select coalesce(sum(line_total), 0)::numeric(12,2)
    into line_sum
  from public.invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(sum(case when taxable then line_total else 0 end), 0)::numeric(12,2)
    into taxable_line_sum
  from public.invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(sum(amount), 0)::numeric(12,2)
    into adjustment_sum
  from public.invoice_adjustments
  where invoice_id = p_invoice_id and status = 'posted';

  select coalesce(sum(amount), 0)::numeric(12,2)
    into paid_sum
  from public.payments
  where invoice_id = p_invoice_id and status = 'posted';

  calculated_subtotal := greatest(line_sum, 0);
  taxable_base := greatest(taxable_line_sum + adjustment_sum - coalesce(inv.discount_amount, 0), 0);
  calculated_tax := round(taxable_base * coalesce(inv.tax_rate, 0), 2);
  calculated_total := round(greatest(line_sum + adjustment_sum - coalesce(inv.discount_amount, 0), 0) + calculated_tax, 2);
  calculated_balance := greatest(round(calculated_total - paid_sum, 2), 0);

  if inv.status = 'void' then
    next_status := 'void';
  elsif calculated_total > 0 and paid_sum >= calculated_total - 0.005 then
    next_status := 'paid';
  elsif paid_sum > 0 then
    next_status := 'partial';
  elsif inv.sent_at is not null and inv.due_date is not null and inv.due_date < current_date and calculated_balance > 0 then
    next_status := 'overdue';
  elsif inv.status in ('partial','paid','overdue') then
    next_status := case when inv.sent_at is not null then 'sent' else 'approved' end;
  else
    next_status := inv.status;
  end if;

  update public.invoices
  set
    subtotal = calculated_subtotal,
    tax_amount = calculated_tax,
    total = calculated_total,
    amount_paid = paid_sum,
    balance_due = calculated_balance,
    status = next_status,
    updated_at = pg_catalog.now()
  where id = p_invoice_id;
end;
$$;

revoke all on function private.fieldops_recalculate_invoice(uuid) from public;

create or replace function private.fieldops_invoice_child_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invoice_id uuid;
begin
  if tg_op = 'DELETE' then
    target_invoice_id := old.invoice_id;
    perform private.fieldops_recalculate_invoice(target_invoice_id);
    return old;
  end if;

  target_invoice_id := new.invoice_id;
  perform private.fieldops_recalculate_invoice(target_invoice_id);
  return new;
end;
$$;

revoke all on function private.fieldops_invoice_child_changed() from public;

drop trigger if exists trg_invoice_items_recalculate on public.invoice_items;
create trigger trg_invoice_items_recalculate
after insert or update or delete on public.invoice_items
for each row execute function private.fieldops_invoice_child_changed();

drop trigger if exists trg_invoice_adjustments_recalculate on public.invoice_adjustments;
create trigger trg_invoice_adjustments_recalculate
after insert or update or delete on public.invoice_adjustments
for each row execute function private.fieldops_invoice_child_changed();

drop trigger if exists trg_payments_recalculate on public.payments;
create trigger trg_payments_recalculate
after insert or update or delete on public.payments
for each row execute function private.fieldops_invoice_child_changed();

-- ============================================================
-- CREATE DRAFT INVOICE FROM BILLING-READY WORK ORDER
-- ============================================================

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
  terms_days integer;
  site_snapshot text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then
    raise exception 'Only Admin, Manager or Billing can create invoices.';
  end if;

  select * into wo from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;

  if not (wo.billing_status in ('ready','review_required') or wo.status = 'billing_ready') then
    raise exception 'This work order is not ready for billing.';
  end if;

  if exists (
    select 1 from public.invoices i
    where i.work_order_id = wo.id and i.status <> 'void'
  ) then
    raise exception 'This work order already has an active invoice.';
  end if;

  select * into cust from public.customers where id = wo.customer_id;
  if not found then raise exception 'Customer not found.'; end if;

  if wo.site_id is not null then
    select * into st from public.sites where id = wo.site_id;
    if found then
      site_snapshot := concat_ws(', ', nullif(st.address1,''), nullif(st.address2,''), nullif(st.city,''), nullif(st.province_state,''), nullif(st.postal_code,''), nullif(st.country,''));
    end if;
  end if;

  terms_days := greatest(coalesce(cust.billing_terms_days, cust.payment_terms_days, 30), 0);

  insert into public.invoices (
    customer_id, site_id, work_order_id, status,
    issued_date, due_date, tax_rate, discount_amount,
    notes, currency, billing_email_snapshot, customer_name_snapshot,
    site_address_snapshot, created_by
  ) values (
    wo.customer_id, wo.site_id, wo.id, 'draft',
    current_date, current_date + terms_days,
    case when cust.tax_exempt then 0 else 0 end,
    0, null, 'CAD', cust.billing_email, cust.name,
    nullif(site_snapshot, ''), auth.uid()
  ) returning * into inv;

  insert into public.invoice_items (
    invoice_id, work_order_id, line_type, description,
    quantity, unit_price, sort_order, source_type, source_id, taxable
  )
  select
    inv.id,
    wo.id,
    case when coalesce(te.activity_type, 'work') = 'travel' then 'travel' else 'labour' end,
    concat(
      case coalesce(te.activity_type, 'work')
        when 'travel' then 'Travel'
        when 'on_site' then 'On Site'
        when 'waiting' then 'Waiting'
        when 'break' then 'Break / Lunch'
        when 'other' then 'Other labour'
        else 'Labour'
      end,
      ' · ', coalesce(p.full_name, p.email, 'Technician')
    ),
    greatest(
      coalesce(
        te.duration_minutes,
        round(extract(epoch from (te.ended_at - te.started_at)) / 60.0)::integer
      ),
      0
    )::numeric / 60.0,
    coalesce(te.billing_rate, te.hourly_rate, 0),
    row_number() over (order by te.started_at)::integer,
    'time_entry', te.id, true
  from public.time_entries te
  left join public.profiles p on p.id = te.technician_id
  where te.work_order_id = wo.id
    and te.billable = true
    and te.ended_at is not null
    and coalesce(te.approval_status, 'approved') = 'approved'
    and coalesce(te.duration_minutes, round(extract(epoch from (te.ended_at - te.started_at)) / 60.0)::integer, 0) > 0;

  insert into public.invoice_items (
    invoice_id, work_order_id, line_type, description,
    quantity, unit_price, sort_order, source_type, source_id, taxable
  )
  select
    inv.id, wo.id, 'material', mu.description,
    mu.quantity, mu.unit_price,
    1000 + row_number() over (order by mu.created_at)::integer,
    'material_usage', mu.id, true
  from public.material_usage mu
  where mu.work_order_id = wo.id and mu.billable = true;

  perform private.fieldops_recalculate_invoice(inv.id);

  insert into public.invoice_events(invoice_id, event_type, details, created_by)
  values (
    inv.id,
    'invoice_created_from_work_order',
    jsonb_build_object('work_order_id', wo.id, 'work_order_number', wo.work_order_number),
    auth.uid()
  );

  return jsonb_build_object('invoice_id', inv.id, 'invoice_number', inv.invoice_number);
end;
$$;

-- ============================================================
-- DRAFT TERMS + MANUAL CHARGES
-- ============================================================

create or replace function public.fieldops_update_invoice_terms(
  p_invoice_id uuid,
  p_issued_date date,
  p_due_date date,
  p_tax_rate numeric,
  p_discount_amount numeric,
  p_billing_email text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status <> 'draft' then raise exception 'Only draft invoices can change invoice terms directly.'; end if;
  if p_tax_rate is null or p_tax_rate < 0 or p_tax_rate > 1 then raise exception 'Tax rate must be between 0 and 1.'; end if;
  if p_discount_amount is null or p_discount_amount < 0 then raise exception 'Discount cannot be negative.'; end if;
  if p_due_date is not null and p_issued_date is not null and p_due_date < p_issued_date then raise exception 'Due date cannot be before issued date.'; end if;

  update public.invoices set
    issued_date = p_issued_date,
    due_date = p_due_date,
    tax_rate = p_tax_rate,
    discount_amount = p_discount_amount,
    billing_email_snapshot = nullif(btrim(p_billing_email), ''),
    notes = nullif(btrim(p_notes), ''),
    updated_at = pg_catalog.now()
  where id = p_invoice_id;

  perform private.fieldops_recalculate_invoice(p_invoice_id);
  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (p_invoice_id,'invoice_terms_updated',jsonb_build_object('tax_rate',p_tax_rate,'discount_amount',p_discount_amount,'due_date',p_due_date),auth.uid());
  return jsonb_build_object('invoice_id', p_invoice_id);
end;
$$;

create or replace function public.fieldops_add_invoice_charge(
  p_invoice_id uuid,
  p_line_type text,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_taxable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  new_line_id uuid;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status <> 'draft' then raise exception 'Manual invoice lines can only be added while the invoice is Draft.'; end if;
  if p_line_type not in ('service','travel','equipment','other') then raise exception 'Invalid charge type.'; end if;
  if p_description is null or btrim(p_description) = '' then raise exception 'Description is required.'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero.'; end if;
  if p_unit_price is null or p_unit_price < 0 then raise exception 'Unit price cannot be negative.'; end if;

  insert into public.invoice_items(invoice_id,work_order_id,line_type,description,quantity,unit_price,sort_order,source_type,taxable)
  values (p_invoice_id,inv.work_order_id,p_line_type,btrim(p_description),p_quantity,p_unit_price,2000 + coalesce((select max(sort_order) from public.invoice_items where invoice_id=p_invoice_id),0),'manual',coalesce(p_taxable,true))
  returning id into new_line_id;

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (p_invoice_id,'manual_charge_added',jsonb_build_object('invoice_item_id',new_line_id,'line_type',p_line_type,'description',btrim(p_description)),auth.uid());
  return jsonb_build_object('invoice_item_id', new_line_id);
end;
$$;

-- ============================================================
-- INVOICE STATUS WORKFLOW
-- ============================================================

create or replace function public.fieldops_set_invoice_status(p_invoice_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_status not in ('approved','sent') then raise exception 'Unsupported invoice status transition.'; end if;
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  perform private.fieldops_recalculate_invoice(p_invoice_id);
  select * into inv from public.invoices where id = p_invoice_id for update;

  if p_status = 'approved' then
    if inv.status <> 'draft' then raise exception 'Only a Draft invoice can be approved.'; end if;
    if inv.total <= 0 then raise exception 'Invoice total must be greater than zero before approval.'; end if;
    update public.invoices set status='approved',approved_by=auth.uid(),approved_at=pg_catalog.now(),issued_date=coalesce(issued_date,current_date),updated_at=pg_catalog.now() where id=p_invoice_id;
    if inv.work_order_id is not null then
      update public.work_orders set billing_status='billed',billed_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=inv.work_order_id;
    end if;
    insert into public.invoice_events(invoice_id,event_type,details,created_by) values (p_invoice_id,'invoice_approved',null,auth.uid());
  else
    if inv.status not in ('approved','ready') then raise exception 'Only an Approved invoice can be marked Sent.'; end if;
    update public.invoices set status='sent',sent_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=p_invoice_id;
    insert into public.invoice_events(invoice_id,event_type,details,created_by) values (p_invoice_id,'invoice_sent',jsonb_build_object('billing_email',inv.billing_email_snapshot),auth.uid());
  end if;
  return jsonb_build_object('invoice_id',p_invoice_id,'status',p_status);
end;
$$;

create or replace function public.fieldops_void_invoice(p_invoice_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then raise exception 'Void reason must be at least 3 characters.'; end if;
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status='void' then raise exception 'Invoice is already void.'; end if;
  if exists (select 1 from public.payments where invoice_id=p_invoice_id and status='posted') then raise exception 'Reverse posted payments before voiding this invoice.'; end if;

  update public.invoices set status='void',voided_at=pg_catalog.now(),voided_by=auth.uid(),void_reason=btrim(p_reason),updated_at=pg_catalog.now() where id=p_invoice_id;
  if inv.work_order_id is not null then
    update public.work_orders set billing_status='ready',billing_ready_at=coalesce(billing_ready_at,pg_catalog.now()),billed_at=null,updated_at=pg_catalog.now() where id=inv.work_order_id;
  end if;
  insert into public.invoice_events(invoice_id,event_type,details,created_by) values (p_invoice_id,'invoice_voided',jsonb_build_object('reason',btrim(p_reason)),auth.uid());
  return jsonb_build_object('invoice_id',p_invoice_id,'status','void');
end;
$$;

-- ============================================================
-- CASH + TAP PAYMENTS, PARTIAL / SPLIT PAYMENTS, REVERSALS
-- ============================================================

create or replace function public.fieldops_record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_received_at timestamptz,
  p_reference text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  payment_id uuid;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_payment_method not in ('cash','tap') then raise exception 'FieldOps payments must be recorded as Cash or Tap.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero.'; end if;
  if p_received_at is null then raise exception 'Payment date and time are required.'; end if;
  if p_received_at > pg_catalog.now() + interval '5 minutes' then raise exception 'Payment time cannot be in the future.'; end if;

  perform private.fieldops_recalculate_invoice(p_invoice_id);
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status not in ('approved','ready','sent','partial','overdue') then raise exception 'Payments can only be recorded against an approved/open invoice.'; end if;
  if p_amount > inv.balance_due + 0.005 then raise exception 'Payment cannot exceed the current balance due.'; end if;

  insert into public.payments(invoice_id,amount,payment_method,status,reference,received_at,notes,created_by)
  values (p_invoice_id,p_amount,p_payment_method,'posted',nullif(btrim(p_reference),''),p_received_at,nullif(btrim(p_notes),''),auth.uid())
  returning id into payment_id;

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (p_invoice_id,'payment_recorded',jsonb_build_object('payment_id',payment_id,'amount',p_amount,'method',p_payment_method,'reference',nullif(btrim(p_reference),'')),auth.uid());
  return jsonb_build_object('payment_id',payment_id,'invoice_id',p_invoice_id);
end;
$$;

create or replace function public.fieldops_void_invoice_payment(p_payment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then raise exception 'Reversal reason must be at least 3 characters.'; end if;
  select * into pay from public.payments where id=p_payment_id for update;
  if not found then raise exception 'Payment not found.'; end if;
  if pay.status <> 'posted' then raise exception 'Only a posted payment can be reversed.'; end if;

  update public.payments set status='void',voided_at=pg_catalog.now(),voided_by=auth.uid(),void_reason=btrim(p_reason) where id=p_payment_id;
  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (pay.invoice_id,'payment_reversed',jsonb_build_object('payment_id',pay.id,'amount',pay.amount,'method',pay.payment_method,'reason',btrim(p_reason)),auth.uid());
  return jsonb_build_object('payment_id',p_payment_id,'status','void');
end;
$$;

-- ============================================================
-- CREDIT NOTES / POST-APPROVAL ADJUSTMENTS
-- ============================================================

create or replace function public.fieldops_post_invoice_adjustment(
  p_invoice_id uuid,
  p_adjustment_type text,
  p_amount numeric,
  p_reason text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  signed_amount numeric(12,2);
  adjustment_id uuid;
begin
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then raise exception 'Billing permission required.'; end if;
  if p_adjustment_type not in ('credit','charge') then raise exception 'Adjustment must be Credit or Charge.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Adjustment amount must be greater than zero.'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then raise exception 'Adjustment reason must be at least 3 characters.'; end if;

  perform private.fieldops_recalculate_invoice(p_invoice_id);
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.status in ('draft','void') then raise exception 'Use draft charges before approval; a void invoice cannot be adjusted.'; end if;
  if p_adjustment_type='credit' and p_amount > inv.balance_due + 0.005 then
    raise exception 'Credit cannot exceed the unpaid balance. Reverse/refund payments first if a larger credit is required.';
  end if;

  signed_amount := case when p_adjustment_type='credit' then -abs(p_amount) else abs(p_amount) end;
  insert into public.invoice_adjustments(invoice_id,adjustment_type,amount,reason,notes,status,created_by)
  values (p_invoice_id,p_adjustment_type,signed_amount,btrim(p_reason),nullif(btrim(p_notes),''),'posted',auth.uid())
  returning id into adjustment_id;

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (p_invoice_id,case when p_adjustment_type='credit' then 'credit_note_posted' else 'invoice_charge_adjustment_posted' end,jsonb_build_object('adjustment_id',adjustment_id,'amount',signed_amount,'reason',btrim(p_reason)),auth.uid());
  return jsonb_build_object('adjustment_id',adjustment_id,'invoice_id',p_invoice_id);
end;
$$;

-- ============================================================
-- RLS / GRANTS / REALTIME
-- ============================================================

alter table public.invoice_adjustments enable row level security;
alter table public.invoice_events enable row level security;

-- Existing invoice/payment policies remain authoritative. These new tables
-- mirror the same read/write role split.
drop policy if exists billing_adjustments_select on public.invoice_adjustments;
create policy billing_adjustments_select on public.invoice_adjustments for select to authenticated
using (private.has_any_role(array['admin','manager','billing','dispatcher']::text[]));

drop policy if exists billing_adjustments_manage on public.invoice_adjustments;
create policy billing_adjustments_manage on public.invoice_adjustments for all to authenticated
using (private.has_any_role(array['admin','manager','billing']::text[]))
with check (private.has_any_role(array['admin','manager','billing']::text[]));

drop policy if exists billing_events_select on public.invoice_events;
create policy billing_events_select on public.invoice_events for select to authenticated
using (private.has_any_role(array['admin','manager','billing','dispatcher']::text[]));

drop policy if exists billing_events_insert on public.invoice_events;
create policy billing_events_insert on public.invoice_events for insert to authenticated
with check (private.has_any_role(array['admin','manager','billing']::text[]));

grant select,insert,update on public.invoice_adjustments to authenticated;
grant select,insert on public.invoice_events to authenticated;

revoke all on function public.fieldops_create_invoice_from_work_order(uuid) from public;
revoke all on function public.fieldops_update_invoice_terms(uuid,date,date,numeric,numeric,text,text) from public;
revoke all on function public.fieldops_add_invoice_charge(uuid,text,text,numeric,numeric,boolean) from public;
revoke all on function public.fieldops_set_invoice_status(uuid,text) from public;
revoke all on function public.fieldops_void_invoice(uuid,text) from public;
revoke all on function public.fieldops_record_invoice_payment(uuid,numeric,text,timestamptz,text,text) from public;
revoke all on function public.fieldops_void_invoice_payment(uuid,text) from public;
revoke all on function public.fieldops_post_invoice_adjustment(uuid,text,numeric,text,text) from public;

grant execute on function public.fieldops_create_invoice_from_work_order(uuid) to authenticated;
grant execute on function public.fieldops_update_invoice_terms(uuid,date,date,numeric,numeric,text,text) to authenticated;
grant execute on function public.fieldops_add_invoice_charge(uuid,text,text,numeric,numeric,boolean) to authenticated;
grant execute on function public.fieldops_set_invoice_status(uuid,text) to authenticated;
grant execute on function public.fieldops_void_invoice(uuid,text) to authenticated;
grant execute on function public.fieldops_record_invoice_payment(uuid,numeric,text,timestamptz,text,text) to authenticated;
grant execute on function public.fieldops_void_invoice_payment(uuid,text) to authenticated;
grant execute on function public.fieldops_post_invoice_adjustment(uuid,text,numeric,text,text) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='invoice_adjustments') then
      execute 'alter publication supabase_realtime add table public.invoice_adjustments';
    end if;
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='invoice_events') then
      execute 'alter publication supabase_realtime add table public.invoice_events';
    end if;
  end if;
end
$$;

alter table public.invoices replica identity full;
alter table public.invoice_items replica identity full;
alter table public.payments replica identity full;
alter table public.invoice_adjustments replica identity full;
alter table public.invoice_events replica identity full;

commit;
