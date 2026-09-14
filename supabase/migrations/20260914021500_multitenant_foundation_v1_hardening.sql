-- FIELDOPS MULTI-TENANT FOUNDATION V1 - HARDENING
-- Must run immediately after 20260914020000_multitenant_foundation_v1.sql.

begin;

-- ============================================================
-- KEEP SETTINGS BACKWARD COMPATIBLE: id=1 INSIDE EACH COMPANY
-- Existing UI can continue querying .eq('id',1); RLS supplies tenant isolation.
-- ============================================================

alter table public.fieldops_settings drop constraint if exists fieldops_settings_pkey;
alter table public.fieldops_settings alter column id drop default;
drop sequence if exists public.fieldops_settings_id_seq;

update public.fieldops_settings set id=1 where id<>1;

alter table public.fieldops_settings
  add constraint fieldops_settings_pkey primary key (organization_id,id);

alter table public.fieldops_settings
  drop constraint if exists fieldops_settings_id_check;
alter table public.fieldops_settings
  add constraint fieldops_settings_id_check check (id=1);

alter table public.fieldops_settings
  alter column id set default 1;

create unique index if not exists uq_fieldops_settings_organization
  on public.fieldops_settings(organization_id);

create or replace function private.fieldops_create_organization_settings()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.fieldops_settings(id,organization_id,company_name,legal_name)
  values(1,new.id,new.name,new.legal_name)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

-- Profile provisioning is special: a new auth profile can exist briefly before
-- it has an organization. Do not use the generic tenant write guard on profiles.
drop trigger if exists a_fieldops_tenant_guard on public.profiles;

-- ============================================================
-- PER-COMPANY HUMAN READABLE NUMBERING
-- Companies can independently use WO-001001, INV-001001, PO-001001, etc.
-- ============================================================

create table if not exists private.organization_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  counter_key text not null,
  next_value bigint not null,
  primary key(organization_id,counter_key)
);

create or replace function private.next_organization_number(
  p_organization_id uuid,
  p_counter_key text,
  p_prefix text,
  p_pad integer,
  p_start bigint default 1001
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  allocated bigint;
begin
  if p_organization_id is null then
    raise exception 'Organization is required for numbering.';
  end if;

  insert into private.organization_counters(organization_id,counter_key,next_value)
  values(p_organization_id,p_counter_key,p_start+1)
  on conflict(organization_id,counter_key)
  do update set next_value=private.organization_counters.next_value+1
  returning next_value-1 into allocated;

  return p_prefix||lpad(allocated::text,p_pad,'0');
end;
$$;

revoke all on function private.next_organization_number(uuid,text,text,integer,bigint) from public;

-- Existing iTBest counters start no lower than 1001 even if demo identifiers
-- contain smaller numbers such as DEMO-AST-008.
insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'work_order',greatest(coalesce(max(nullif(regexp_replace(work_order_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.work_orders group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'invoice',greatest(coalesce(max(nullif(regexp_replace(invoice_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.invoices group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'asset',greatest(coalesce(max(nullif(regexp_replace(asset_tag,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.assets group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'supplier',greatest(coalesce(max(nullif(regexp_replace(supplier_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.inventory_suppliers group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'purchase_order',greatest(coalesce(max(nullif(regexp_replace(po_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.inventory_purchase_orders group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'receipt',greatest(coalesce(max(nullif(regexp_replace(receipt_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.inventory_receipts group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'return',greatest(coalesce(max(nullif(regexp_replace(return_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.inventory_returns group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

insert into private.organization_counters(organization_id,counter_key,next_value)
select organization_id,'reconciliation',greatest(coalesce(max(nullif(regexp_replace(reconciliation_number,'[^0-9]','','g'),'')::bigint),0),1000)+1
from public.inventory_reconciliations group by organization_id
on conflict(organization_id,counter_key) do update set next_value=greatest(private.organization_counters.next_value,excluded.next_value);

alter table public.work_orders alter column work_order_number drop default;
alter table public.invoices alter column invoice_number drop default;
alter table public.assets alter column asset_tag drop default;
alter table public.inventory_suppliers alter column supplier_number drop default;
alter table public.inventory_purchase_orders alter column po_number drop default;
alter table public.inventory_receipts alter column receipt_number drop default;
alter table public.inventory_returns alter column return_number drop default;
alter table public.inventory_reconciliations alter column reconciliation_number drop default;

create or replace function private.fieldops_assign_tenant_number()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.organization_id is null then
    new.organization_id:=private.current_organization_id();
  end if;

  case tg_table_name
    when 'work_orders' then
      if new.work_order_number is null or btrim(new.work_order_number)='' then
        new.work_order_number:=private.next_organization_number(new.organization_id,'work_order','WO-',6,1001);
      end if;
    when 'invoices' then
      if new.invoice_number is null or btrim(new.invoice_number)='' then
        new.invoice_number:=private.next_organization_number(new.organization_id,'invoice','INV-',6,1001);
      end if;
    when 'assets' then
      if new.asset_tag is null or btrim(new.asset_tag)='' then
        new.asset_tag:=private.next_organization_number(new.organization_id,'asset','AST-',6,1001);
      end if;
    when 'inventory_suppliers' then
      if new.supplier_number is null or btrim(new.supplier_number)='' then
        new.supplier_number:=private.next_organization_number(new.organization_id,'supplier','SUP-',5,1001);
      end if;
    when 'inventory_purchase_orders' then
      if new.po_number is null or btrim(new.po_number)='' then
        new.po_number:=private.next_organization_number(new.organization_id,'purchase_order','PO-',6,1001);
      end if;
    when 'inventory_receipts' then
      if new.receipt_number is null or btrim(new.receipt_number)='' then
        new.receipt_number:=private.next_organization_number(new.organization_id,'receipt','RCV-',6,1001);
      end if;
    when 'inventory_returns' then
      if new.return_number is null or btrim(new.return_number)='' then
        new.return_number:=private.next_organization_number(new.organization_id,'return','RTN-',6,1001);
      end if;
    when 'inventory_reconciliations' then
      if new.reconciliation_number is null or btrim(new.reconciliation_number)='' then
        new.reconciliation_number:=private.next_organization_number(new.organization_id,'reconciliation','REC-',6,1001);
      end if;
  end case;

  return new;
end;
$$;

revoke all on function private.fieldops_assign_tenant_number() from public;

-- Tenant guard is named a_* and runs first; numbering b_* runs second.
drop trigger if exists b_fieldops_number_work_orders on public.work_orders;
create trigger b_fieldops_number_work_orders before insert on public.work_orders for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_invoices on public.invoices;
create trigger b_fieldops_number_invoices before insert on public.invoices for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_assets on public.assets;
create trigger b_fieldops_number_assets before insert on public.assets for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_suppliers on public.inventory_suppliers;
create trigger b_fieldops_number_suppliers before insert on public.inventory_suppliers for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_purchase_orders on public.inventory_purchase_orders;
create trigger b_fieldops_number_purchase_orders before insert on public.inventory_purchase_orders for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_receipts on public.inventory_receipts;
create trigger b_fieldops_number_receipts before insert on public.inventory_receipts for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_returns on public.inventory_returns;
create trigger b_fieldops_number_returns before insert on public.inventory_returns for each row execute function private.fieldops_assign_tenant_number();
drop trigger if exists b_fieldops_number_reconciliations on public.inventory_reconciliations;
create trigger b_fieldops_number_reconciliations before insert on public.inventory_reconciliations for each row execute function private.fieldops_assign_tenant_number();

-- ============================================================
-- SERVICE-ROLE-ONLY COMPANY / USER PROVISIONING
-- Normal company admins cannot create or move organizations.
-- ============================================================

create or replace function public.fieldops_provision_organization(
  p_slug text,
  p_name text,
  p_legal_name text,
  p_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  org_id uuid;
  auth_user auth.users%rowtype;
begin
  if coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Service role required.';
  end if;
  if btrim(coalesce(p_slug,''))='' or btrim(coalesce(p_name,''))='' then
    raise exception 'Organization slug and name are required.';
  end if;

  select * into auth_user from auth.users where id=p_owner_user_id;
  if not found then raise exception 'Owner auth user not found.'; end if;

  if exists(
    select 1 from public.organization_memberships m
    where m.user_id=p_owner_user_id
  ) then
    raise exception 'Owner user is already assigned to a FieldOps organization.';
  end if;

  insert into public.organizations(slug,name,legal_name,status,plan)
  values(lower(btrim(p_slug)),btrim(p_name),nullif(btrim(p_legal_name),''),'active','standard')
  returning id into org_id;

  insert into public.profiles(id,full_name,email,active,organization_id)
  values(
    auth_user.id,
    nullif(btrim(coalesce(auth_user.raw_user_meta_data->>'full_name','')),''),
    auth_user.email,
    true,
    org_id
  )
  on conflict(id) do update set
    email=excluded.email,
    active=true,
    organization_id=org_id,
    updated_at=now();

  insert into public.organization_memberships(organization_id,user_id,active,is_owner)
  values(org_id,p_owner_user_id,true,true);

  insert into public.user_roles(user_id,role,organization_id)
  values(p_owner_user_id,'admin',org_id)
  on conflict(user_id,role) do update set organization_id=excluded.organization_id;

  return jsonb_build_object('organization_id',org_id,'slug',lower(btrim(p_slug)),'owner_user_id',p_owner_user_id);
end;
$$;

create or replace function public.fieldops_attach_user_to_organization(
  p_organization_id uuid,
  p_user_id uuid,
  p_roles text[] default array['technician']::text[]
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  auth_user auth.users%rowtype;
  role_name text;
  allowed constant text[]:=array['admin','manager','dispatcher','technician','billing','inventory']::text[];
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required.'; end if;
  if not exists(select 1 from public.organizations o where o.id=p_organization_id and o.status='active') then
    raise exception 'Active organization not found.';
  end if;

  select * into auth_user from auth.users where id=p_user_id;
  if not found then raise exception 'Auth user not found.'; end if;

  if exists(select 1 from public.organization_memberships m where m.user_id=p_user_id and m.organization_id<>p_organization_id) then
    raise exception 'User is already assigned to another FieldOps organization.';
  end if;

  if cardinality(coalesce(p_roles,'{}'::text[]))=0 then raise exception 'At least one role is required.'; end if;
  if exists(select 1 from unnest(p_roles) r(role) where lower(btrim(role))<>all(allowed)) then
    raise exception 'Unsupported FieldOps role.';
  end if;

  insert into public.profiles(id,full_name,email,active,organization_id)
  values(
    auth_user.id,
    nullif(btrim(coalesce(auth_user.raw_user_meta_data->>'full_name','')),''),
    auth_user.email,
    true,
    p_organization_id
  )
  on conflict(id) do update set
    email=excluded.email,
    active=true,
    organization_id=p_organization_id,
    updated_at=now();

  insert into public.organization_memberships(organization_id,user_id,active,is_owner)
  values(p_organization_id,p_user_id,true,false)
  on conflict(user_id) do update set organization_id=excluded.organization_id,active=true,updated_at=now();

  delete from public.user_roles where user_id=p_user_id;
  foreach role_name in array p_roles loop
    insert into public.user_roles(user_id,role,organization_id)
    values(p_user_id,lower(btrim(role_name)),p_organization_id)
    on conflict(user_id,role) do update set organization_id=excluded.organization_id;
  end loop;

  return jsonb_build_object('organization_id',p_organization_id,'user_id',p_user_id,'roles',p_roles);
end;
$$;

-- ============================================================
-- RPC EXECUTION HARDENING
-- PUBLIC previously inherited EXECUTE on many SECURITY DEFINER functions.
-- FieldOps RPCs are authenticated-only unless explicitly service-role-only.
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
    execute format('revoke execute on function %I.%I(%s) from public, anon',r.nspname,r.proname,r.args);
    execute format('grant execute on function %I.%I(%s) to authenticated',r.nspname,r.proname,r.args);
  end loop;
end
$$;

revoke execute on function public.fieldops_reset_it_demo_data() from authenticated;
revoke execute on function public.fieldops_provision_organization(text,text,text,uuid) from authenticated,anon,public;
revoke execute on function public.fieldops_attach_user_to_organization(uuid,uuid,text[]) from authenticated,anon,public;
grant execute on function public.fieldops_provision_organization(text,text,text,uuid) to service_role;
grant execute on function public.fieldops_attach_user_to_organization(uuid,uuid,text[]) to service_role;

commit;
