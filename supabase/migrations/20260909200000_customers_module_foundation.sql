-- FIELDOPS CUSTOMERS MODULE FOUNDATION V1
begin;

alter table public.customers
  add column if not exists account_number text,
  add column if not exists status text not null default 'active',
  add column if not exists customer_type text not null default 'business',
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists billing_email text,
  add column if not exists billing_terms_days integer not null default 30,
  add column if not exists tax_exempt boolean not null default false,
  add column if not exists address1 text,
  add column if not exists address2 text,
  add column if not exists city text,
  add column if not exists province_state text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='customers_status_check' and conrelid='public.customers'::regclass) then
    alter table public.customers add constraint customers_status_check check (status in ('active','inactive','prospect','on_hold'));
  end if;
  if not exists (select 1 from pg_constraint where conname='customers_type_check' and conrelid='public.customers'::regclass) then
    alter table public.customers add constraint customers_type_check check (customer_type in ('business','residential','nonprofit','government','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname='customers_billing_terms_check' and conrelid='public.customers'::regclass) then
    alter table public.customers add constraint customers_billing_terms_check check (billing_terms_days between 0 and 365);
  end if;
end $$;

create unique index if not exists uq_customers_account_number on public.customers(lower(account_number)) where account_number is not null;

alter table public.sites
  add column if not exists address2 text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists phone text,
  add column if not exists instructions text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  first_name text not null,
  last_name text not null,
  title text,
  email text,
  phone text,
  mobile text,
  is_primary boolean not null default false,
  receives_billing boolean not null default false,
  receives_service_updates boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_contacts_first_name_check check(length(btrim(first_name)) > 0),
  constraint customer_contacts_last_name_check check(length(btrim(last_name)) > 0)
);

create index if not exists idx_customer_contacts_customer on public.customer_contacts(customer_id);
create index if not exists idx_customer_contacts_site on public.customer_contacts(site_id) where site_id is not null;
create unique index if not exists uq_customer_primary_contact on public.customer_contacts(customer_id) where is_primary=true and active=true;

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_notes_note_check check(length(btrim(note)) >= 3)
);

create index if not exists idx_customer_notes_customer_created on public.customer_notes(customer_id,created_at desc);

create or replace function private.fieldops_customer_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists trg_fieldops_customer_updated_at on public.customers;
create trigger trg_fieldops_customer_updated_at before update on public.customers for each row execute function private.fieldops_customer_touch_updated_at();

drop trigger if exists trg_fieldops_site_updated_at on public.sites;
create trigger trg_fieldops_site_updated_at before update on public.sites for each row execute function private.fieldops_customer_touch_updated_at();

drop trigger if exists trg_fieldops_customer_contact_updated_at on public.customer_contacts;
create trigger trg_fieldops_customer_contact_updated_at before update on public.customer_contacts for each row execute function private.fieldops_customer_touch_updated_at();

alter table public.customer_contacts enable row level security;
alter table public.customer_notes enable row level security;

drop policy if exists fieldops_customer_contacts_read on public.customer_contacts;
create policy fieldops_customer_contacts_read on public.customer_contacts for select to authenticated using (true);

drop policy if exists fieldops_customer_contacts_write on public.customer_contacts;
create policy fieldops_customer_contacts_write on public.customer_contacts for all to authenticated
using (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]))
with check (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]));

drop policy if exists fieldops_customer_notes_read on public.customer_notes;
create policy fieldops_customer_notes_read on public.customer_notes for select to authenticated using (true);

drop policy if exists fieldops_customer_notes_write on public.customer_notes;
create policy fieldops_customer_notes_write on public.customer_notes for all to authenticated
using (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]))
with check (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]));

drop policy if exists fieldops_customer_module_customer_write on public.customers;
create policy fieldops_customer_module_customer_write on public.customers for all to authenticated
using (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]))
with check (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]));

drop policy if exists fieldops_customer_module_site_write on public.sites;
create policy fieldops_customer_module_site_write on public.sites for all to authenticated
using (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]))
with check (private.has_any_role(array['admin','manager','dispatcher','billing']::text[]));

grant select,insert,update,delete on public.customer_contacts to authenticated;
grant select,insert,update,delete on public.customer_notes to authenticated;

commit;
