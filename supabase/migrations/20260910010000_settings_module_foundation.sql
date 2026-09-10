-- FIELDOPS SETTINGS MODULE FOUNDATION V1
-- Central system/business settings plus audited user role and activation changes.
-- Does not replace existing operational tables or historical records.

begin;

create table if not exists public.fieldops_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'FieldOps' check (btrim(company_name) <> ''),
  legal_name text,
  business_number text,
  phone text,
  email text,
  website text,
  address1 text,
  address2 text,
  city text,
  province_state text,
  postal_code text,
  country text not null default 'Canada',
  timezone text not null default 'America/Vancouver',
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  locale text not null default 'en-CA',
  date_format text not null default 'yyyy-mm-dd'
    check (date_format in ('yyyy-mm-dd','dd/mm/yyyy','mm/dd/yyyy')),
  time_format text not null default '12h'
    check (time_format in ('12h','24h')),
  default_work_order_duration_minutes integer not null default 60
    check (default_work_order_duration_minutes between 15 and 1440),
  default_payment_terms_days integer not null default 30
    check (default_payment_terms_days between 0 and 365),
  default_tax_rate numeric(8,6) not null default 0
    check (default_tax_rate between 0 and 1),
  invoice_footer text,
  po_approval_required boolean not null default false,
  low_stock_monitoring_enabled boolean not null default true,
  reconciliation_reason_required boolean not null default true,
  certification_alert_days integer not null default 30
    check (certification_alert_days between 0 and 3650),
  asset_warranty_alert_days integer not null default 30
    check (asset_warranty_alert_days between 0 and 3650),
  unassigned_work_order_alert_enabled boolean not null default true,
  overdue_invoice_alert_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fieldops_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists trg_fieldops_settings_updated_at on public.fieldops_settings;
create trigger trg_fieldops_settings_updated_at
before update on public.fieldops_settings
for each row execute function private.set_updated_at();

create table if not exists public.fieldops_settings_audit (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fieldops_settings_audit_created
  on public.fieldops_settings_audit(created_at desc);
create index if not exists idx_fieldops_settings_audit_target
  on public.fieldops_settings_audit(target_user_id, created_at desc)
  where target_user_id is not null;

create or replace function private.fieldops_audit_settings_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.fieldops_settings_audit(event_type, details, created_by)
  values (
    'settings_updated',
    jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)),
    auth.uid()
  );
  return new;
end;
$$;

revoke all on function private.fieldops_audit_settings_update() from public;

drop trigger if exists trg_fieldops_audit_settings_update on public.fieldops_settings;
create trigger trg_fieldops_audit_settings_update
after update on public.fieldops_settings
for each row execute function private.fieldops_audit_settings_update();

-- Admin-only audited role changes. The function prevents removal of the last
-- active Admin and prevents active users from being left with zero roles.
create or replace function public.fieldops_set_user_roles(
  p_user_id uuid,
  p_roles text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed constant text[] := array['admin','manager','dispatcher','technician','billing','inventory']::text[];
  clean_roles text[];
  target_is_admin boolean;
  other_active_admins integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin']::text[])) then
    raise exception 'Only an Admin can change user roles.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'User profile not found.';
  end if;

  select coalesce(array_agg(distinct lower(btrim(role))) filter (where btrim(role) <> ''), '{}'::text[])
  into clean_roles
  from unnest(coalesce(p_roles, '{}'::text[])) as r(role);

  if cardinality(clean_roles) = 0 then
    raise exception 'An active user must have at least one role.';
  end if;
  if exists (select 1 from unnest(clean_roles) as rr(role) where not (role = any(allowed))) then
    raise exception 'One or more roles are not supported by FieldOps.';
  end if;

  select exists(select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin')
  into target_is_admin;

  if target_is_admin and not ('admin' = any(clean_roles)) then
    select count(*)::integer into other_active_admins
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.active = true
    where ur.role = 'admin' and ur.user_id <> p_user_id;
    if other_active_admins = 0 then
      raise exception 'FieldOps must keep at least one active Admin.';
    end if;
  end if;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles(user_id, role)
  select p_user_id, role from unnest(clean_roles) as r(role);

  insert into public.fieldops_settings_audit(event_type, target_user_id, details, created_by)
  values ('user_roles_changed', p_user_id, jsonb_build_object('roles', clean_roles), auth.uid());

  return jsonb_build_object('user_id', p_user_id, 'roles', clean_roles);
end;
$$;

create or replace function public.fieldops_set_user_active(
  p_user_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_is_admin boolean;
  other_active_admins integer;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin']::text[])) then
    raise exception 'Only an Admin can change account activation.';
  end if;
  if p_user_id = auth.uid() and p_active = false then
    raise exception 'You cannot deactivate your own FieldOps account.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'User profile not found.';
  end if;

  select exists(select 1 from public.user_roles ur where ur.user_id = p_user_id and ur.role = 'admin')
  into target_is_admin;

  if target_is_admin and p_active = false then
    select count(*)::integer into other_active_admins
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.active = true
    where ur.role = 'admin' and ur.user_id <> p_user_id;
    if other_active_admins = 0 then
      raise exception 'FieldOps must keep at least one active Admin.';
    end if;
  end if;

  update public.profiles
  set active = p_active, updated_at = now()
  where id = p_user_id;

  insert into public.fieldops_settings_audit(event_type, target_user_id, details, created_by)
  values (
    case when p_active then 'user_reactivated' else 'user_deactivated' end,
    p_user_id,
    jsonb_build_object('active', p_active),
    auth.uid()
  );

  return jsonb_build_object('user_id', p_user_id, 'active', p_active);
end;
$$;

-- Make selected Inventory settings operational without changing the Inventory page.
-- When PO approval is required, Draft -> Ordered is no longer allowed.
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
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can change a purchase order.'; end if;
  select status into current_status from public.inventory_purchase_orders where id = p_purchase_order_id for update;
  if current_status is null then raise exception 'Purchase order not found.'; end if;
  if p_status not in ('approved','ordered','closed','cancelled') then raise exception 'Invalid purchase-order status change.'; end if;
  if current_status in ('received','closed','cancelled') then raise exception 'This purchase order can no longer be changed.'; end if;
  if p_status = 'approved' and current_status <> 'draft' then raise exception 'Only a Draft purchase order can be approved.'; end if;

  select coalesce(s.po_approval_required, false) into approval_required
  from public.fieldops_settings s where s.id = 1;

  if p_status = 'ordered' then
    if approval_required and current_status <> 'approved' then
      raise exception 'This FieldOps configuration requires PO approval before ordering.';
    end if;
    if not approval_required and current_status not in ('draft','approved') then
      raise exception 'Only Draft or Approved purchase orders can be ordered.';
    end if;
  end if;
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

-- Reconciliation reason enforcement is also applied at the database workflow level.
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
  current_qty numeric;
  require_reason boolean;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory']::text[])) then raise exception 'Only Admin, Manager or Inventory can post reconciliation.'; end if;

  select * into rec from public.inventory_reconciliations where id = p_reconciliation_id for update;
  if not found then raise exception 'Reconciliation not found.'; end if;
  if rec.status <> 'counting' then raise exception 'Only a Counting reconciliation can be posted.'; end if;
  if exists (select 1 from public.inventory_reconciliation_lines l where l.reconciliation_id = rec.id and l.counted_quantity is null) then raise exception 'Every inventory item must have a physical count before posting.'; end if;

  select coalesce(s.reconciliation_reason_required, true) into require_reason
  from public.fieldops_settings s where s.id = 1;

  if require_reason and exists (
    select 1 from public.inventory_reconciliation_lines l
    where l.reconciliation_id = rec.id
      and l.counted_quantity is distinct from l.system_quantity
      and coalesce(btrim(l.reason), '') = ''
  ) then
    raise exception 'A reason is required for every reconciliation variance.';
  end if;

  if exists (
    select 1 from public.inventory_transactions t
    where t.location_id = rec.location_id and t.created_at > rec.started_at
  ) then
    raise exception 'Stock changed after this reconciliation started. Cancel it and start a fresh count.';
  end if;

  for line in select * from public.inventory_reconciliation_lines where reconciliation_id = rec.id
  loop
    current_qty := line.counted_quantity - line.system_quantity;
    if current_qty <> 0 then
      insert into public.inventory_transactions (
        inventory_item_id, location_id, reconciliation_id, transaction_type, quantity,
        unit_cost, reference, notes, created_by
      ) values (
        line.inventory_item_id, rec.location_id, rec.id, 'adjustment', current_qty,
        line.unit_cost, rec.reconciliation_number,
        concat('Physical reconciliation variance. ', coalesce(line.reason, '')), auth.uid()
      );
    end if;
  end loop;

  update public.inventory_reconciliations
  set status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  where id = rec.id;

  return jsonb_build_object('reconciliation_id', rec.id, 'status', 'posted');
end;
$$;


-- Billing defaults are applied to NEW invoices without changing the Billing page.
-- Customer-specific terms still take priority. Historical invoices are untouched.
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
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then
    raise exception 'Only Admin, Manager or Billing can create invoices.';
  end if;

  select * into wo from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;

  if not (wo.billing_status in ('ready','review_required') or wo.status = 'billing_ready') then
    raise exception 'This work order is not ready for billing.';
  end if;

  if exists (select 1 from public.invoices i where i.work_order_id = wo.id and i.status <> 'void') then
    raise exception 'This work order already has an active invoice.';
  end if;

  select * into cust from public.customers where id = wo.customer_id;
  if not found then raise exception 'Customer not found.'; end if;
  select * into defaults from public.fieldops_settings where id = 1;

  if wo.site_id is not null then
    select * into st from public.sites where id = wo.site_id;
    if found then
      site_snapshot := concat_ws(', ', nullif(st.address1,''), nullif(st.address2,''), nullif(st.city,''), nullif(st.province_state,''), nullif(st.postal_code,''), nullif(st.country,''));
    end if;
  end if;

  terms_days := greatest(coalesce(cust.billing_terms_days, cust.payment_terms_days, defaults.default_payment_terms_days, 30), 0);

  insert into public.invoices (
    customer_id, site_id, work_order_id, status,
    issued_date, due_date, tax_rate, discount_amount,
    notes, currency, billing_email_snapshot, customer_name_snapshot,
    site_address_snapshot, created_by
  ) values (
    wo.customer_id, wo.site_id, wo.id, 'draft',
    current_date, current_date + terms_days,
    case when cust.tax_exempt then 0 else coalesce(defaults.default_tax_rate, 0) end,
    0, null, coalesce(defaults.currency, 'CAD'), cust.billing_email, cust.name,
    nullif(site_snapshot, ''), auth.uid()
  ) returning * into inv;

  insert into public.invoice_items (
    invoice_id, work_order_id, line_type, description,
    quantity, unit_price, sort_order, source_type, source_id, taxable
  )
  select
    inv.id, wo.id,
    case when coalesce(te.activity_type, 'work') = 'travel' then 'travel' else 'labour' end,
    concat(
      case coalesce(te.activity_type, 'work')
        when 'travel' then 'Travel' when 'on_site' then 'On Site' when 'waiting' then 'Waiting'
        when 'break' then 'Break / Lunch' when 'other' then 'Other labour' else 'Labour'
      end,
      ' · ', coalesce(p.full_name, p.email, 'Technician')
    ),
    greatest(coalesce(te.duration_minutes, round(extract(epoch from (te.ended_at - te.started_at)) / 60.0)::integer), 0)::numeric / 60.0,
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
  select inv.id, wo.id, 'material', mu.description, mu.quantity, mu.unit_price,
    1000 + row_number() over (order by mu.created_at)::integer,
    'material_usage', mu.id, true
  from public.material_usage mu
  where mu.work_order_id = wo.id and mu.billable = true;

  perform private.fieldops_recalculate_invoice(inv.id);

  insert into public.invoice_events(invoice_id, event_type, details, created_by)
  values (inv.id, 'invoice_created_from_work_order', jsonb_build_object('work_order_id', wo.id, 'work_order_number', wo.work_order_number), auth.uid());

  return jsonb_build_object('invoice_id', inv.id, 'invoice_number', inv.invoice_number);
end;
$$;

-- RLS
alter table public.fieldops_settings enable row level security;
alter table public.fieldops_settings_audit enable row level security;

revoke all on table public.fieldops_settings, public.fieldops_settings_audit from anon;
grant select, insert, update on table public.fieldops_settings to authenticated;
grant select on table public.fieldops_settings_audit to authenticated;

drop policy if exists fieldops_settings_staff_select on public.fieldops_settings;
create policy fieldops_settings_staff_select on public.fieldops_settings for select to authenticated
using ((select private.is_active_user()));

drop policy if exists fieldops_settings_management_insert on public.fieldops_settings;
create policy fieldops_settings_management_insert on public.fieldops_settings for insert to authenticated
with check ((select private.has_any_role(array['admin','manager']::text[])));

drop policy if exists fieldops_settings_management_update on public.fieldops_settings;
create policy fieldops_settings_management_update on public.fieldops_settings for update to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])))
with check ((select private.has_any_role(array['admin','manager']::text[])));

drop policy if exists fieldops_settings_audit_management_select on public.fieldops_settings_audit;
create policy fieldops_settings_audit_management_select on public.fieldops_settings_audit for select to authenticated
using ((select private.has_any_role(array['admin','manager']::text[])));

revoke all on function public.fieldops_set_user_roles(uuid,text[]) from public;
revoke all on function public.fieldops_set_user_active(uuid,boolean) from public;
revoke all on function public.fieldops_set_purchase_order_status(uuid,text) from public;
revoke all on function public.fieldops_post_inventory_reconciliation(uuid) from public;

grant execute on function public.fieldops_set_user_roles(uuid,text[]) to authenticated;
grant execute on function public.fieldops_set_user_active(uuid,boolean) to authenticated;
grant execute on function public.fieldops_set_purchase_order_status(uuid,text) to authenticated;
grant execute on function public.fieldops_post_inventory_reconciliation(uuid) to authenticated;

commit;
