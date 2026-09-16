begin;

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  normal_balance text not null check (normal_balance in ('debit','credit')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  source_type text,
  source_id uuid,
  status text not null default 'posted' check (status in ('draft','posted','void')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,source_id)
);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.accounting_journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounting_accounts(id) on delete restrict,
  description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table if not exists public.vendor_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null,
  supplier_id uuid not null references public.inventory_suppliers(id) on delete restrict,
  purchase_order_id uuid references public.inventory_purchase_orders(id) on delete set null,
  bill_date date not null default current_date,
  due_date date not null,
  status text not null default 'draft' check (status in ('draft','posted','partial','paid','void')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(14,2) not null default 0 check (tax_amount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) not null default 0 check (balance_due >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_vendor_bills_supplier_number on public.vendor_bills(supplier_id,bill_number);
create index if not exists idx_vendor_bills_due on public.vendor_bills(due_date,status);

create table if not exists public.vendor_bill_items (
  id uuid primary key default gen_random_uuid(),
  vendor_bill_id uuid not null references public.vendor_bills(id) on delete cascade,
  description text not null,
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  line_total numeric(14,2) generated always as (round(quantity * unit_cost,2)) stored,
  expense_account_id uuid references public.accounting_accounts(id) on delete restrict,
  taxable boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_bill_id uuid not null references public.vendor_bills(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null default 'eft',
  reference text,
  paid_at timestamptz not null default now(),
  notes text,
  status text not null default 'posted' check (status in ('posted','void')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.accounting_accounts(code,name,account_type,normal_balance) values
('1000','Cash / Bank','asset','debit'),
('1100','Accounts Receivable','asset','debit'),
('1200','Inventory','asset','debit'),
('2000','Accounts Payable','liability','credit'),
('2100','Sales Tax Payable','liability','credit'),
('3000','Owner Equity','equity','credit'),
('4000','Service Revenue','revenue','credit'),
('4100','Material Revenue','revenue','credit'),
('5000','Cost of Goods Sold','expense','debit'),
('6000','Operating Expense','expense','debit')
on conflict (code) do nothing;

alter table public.accounting_accounts enable row level security;
alter table public.accounting_journal_entries enable row level security;
alter table public.accounting_journal_lines enable row level security;
alter table public.vendor_bills enable row level security;
alter table public.vendor_bill_items enable row level security;
alter table public.vendor_payments enable row level security;

drop policy if exists accounting_accounts_read on public.accounting_accounts;
create policy accounting_accounts_read on public.accounting_accounts for select to authenticated using (private.is_active_user());
drop policy if exists accounting_accounts_manage on public.accounting_accounts;
create policy accounting_accounts_manage on public.accounting_accounts for all to authenticated using (private.has_any_role(array['admin','manager','billing'])) with check (private.has_any_role(array['admin','manager','billing']));

do $$
declare t text;
begin
  foreach t in array array['accounting_journal_entries','accounting_journal_lines','vendor_bills','vendor_bill_items','vendor_payments'] loop
    execute format('drop policy if exists %I on public.%I',t||'_read',t);
    execute format('create policy %I on public.%I for select to authenticated using (private.has_any_role(array[''admin'',''manager'',''billing'']))',t||'_read',t);
    execute format('drop policy if exists %I on public.%I',t||'_manage',t);
    execute format('create policy %I on public.%I for all to authenticated using (private.has_any_role(array[''admin'',''manager'',''billing''])) with check (private.has_any_role(array[''admin'',''manager'',''billing'']))',t||'_manage',t);
  end loop;
end $$;

create or replace function private.account_id(p_code text)
returns uuid language sql stable security definer set search_path='' as $$
  select id from public.accounting_accounts where code=p_code and active=true limit 1;
$$;

create or replace function private.sync_invoice_journal()
returns trigger language plpgsql security definer set search_path='' as $$
declare je uuid; revenue numeric(14,2);
begin
  if new.status in ('approved','sent','partial','paid','overdue') then
    revenue:=greatest(coalesce(new.total,0)-coalesce(new.tax_amount,0),0);
    insert into public.accounting_journal_entries(entry_date,description,source_type,source_id,status,created_by)
    values(coalesce(new.issued_date,current_date),'Customer invoice '||new.invoice_number,'invoice',new.id,'posted',new.created_by)
    on conflict(source_type,source_id) do update set entry_date=excluded.entry_date,description=excluded.description,status='posted',updated_at=now()
    returning id into je;
    delete from public.accounting_journal_lines where journal_entry_id=je;
    if coalesce(new.total,0)>0 then
      insert into public.accounting_journal_lines(journal_entry_id,account_id,description,debit)
      values(je,private.account_id('1100'),'Accounts receivable',new.total);
    end if;
    if revenue>0 then
      insert into public.accounting_journal_lines(journal_entry_id,account_id,description,credit)
      values(je,private.account_id('4000'),'Revenue',revenue);
    end if;
    if coalesce(new.tax_amount,0)>0 then
      insert into public.accounting_journal_lines(journal_entry_id,account_id,description,credit)
      values(je,private.account_id('2100'),'Sales tax',new.tax_amount);
    end if;
  elsif new.status='void' then
    update public.accounting_journal_entries set status='void',updated_at=now() where source_type='invoice' and source_id=new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_invoice_journal on public.invoices;
create trigger trg_sync_invoice_journal after insert or update of status,total,tax_amount,issued_date on public.invoices for each row execute function private.sync_invoice_journal();

create or replace function private.sync_customer_payment_journal()
returns trigger language plpgsql security definer set search_path='' as $$
declare je uuid;
begin
  if new.status='posted' then
    insert into public.accounting_journal_entries(entry_date,description,source_type,source_id,status,created_by)
    values(new.received_at::date,'Customer payment','customer_payment',new.id,'posted',new.created_by)
    on conflict(source_type,source_id) do update set entry_date=excluded.entry_date,status='posted',updated_at=now()
    returning id into je;
    delete from public.accounting_journal_lines where journal_entry_id=je;
    insert into public.accounting_journal_lines(journal_entry_id,account_id,description,debit) values(je,private.account_id('1000'),'Cash received',new.amount);
    insert into public.accounting_journal_lines(journal_entry_id,account_id,description,credit) values(je,private.account_id('1100'),'Reduce receivable',new.amount);
  elsif new.status in ('void','refunded','failed') then
    update public.accounting_journal_entries set status='void',updated_at=now() where source_type='customer_payment' and source_id=new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_customer_payment_journal on public.payments;
create trigger trg_sync_customer_payment_journal after insert or update of status,amount,received_at on public.payments for each row execute function private.sync_customer_payment_journal();

create or replace function private.sync_vendor_bill_balance()
returns trigger language plpgsql security definer set search_path='' as $$
declare paid numeric(14,2);
begin
  select coalesce(sum(amount),0) into paid from public.vendor_payments where vendor_bill_id=new.id and status='posted';
  new.amount_paid:=paid;
  new.balance_due:=greatest(new.total-paid,0);
  if new.status<>'void' and new.status<>'draft' then
    if new.balance_due=0 and new.total>0 then new.status:='paid';
    elsif paid>0 then new.status:='partial';
    else new.status:='posted'; end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_vendor_bill_balance on public.vendor_bills;
create trigger trg_vendor_bill_balance before insert or update of total,status on public.vendor_bills for each row execute function private.sync_vendor_bill_balance();

create or replace function private.sync_vendor_bill_journal()
returns trigger language plpgsql security definer set search_path='' as $$
declare je uuid; expense numeric(14,2);
begin
  if new.status in ('posted','partial','paid') then
    expense:=greatest(coalesce(new.total,0)-coalesce(new.tax_amount,0),0);
    insert into public.accounting_journal_entries(entry_date,description,source_type,source_id,status,created_by)
    values(new.bill_date,'Vendor bill '||new.bill_number,'vendor_bill',new.id,'posted',new.created_by)
    on conflict(source_type,source_id) do update set entry_date=excluded.entry_date,description=excluded.description,status='posted',updated_at=now()
    returning id into je;
    delete from public.accounting_journal_lines where journal_entry_id=je;
    if expense>0 then insert into public.accounting_journal_lines(journal_entry_id,account_id,description,debit) values(je,private.account_id('6000'),'Vendor expense',expense); end if;
    if coalesce(new.tax_amount,0)>0 then insert into public.accounting_journal_lines(journal_entry_id,account_id,description,debit) values(je,private.account_id('6000'),'Recoverable/input tax',new.tax_amount); end if;
    if coalesce(new.total,0)>0 then insert into public.accounting_journal_lines(journal_entry_id,account_id,description,credit) values(je,private.account_id('2000'),'Accounts payable',new.total); end if;
  elsif new.status='void' then
    update public.accounting_journal_entries set status='void',updated_at=now() where source_type='vendor_bill' and source_id=new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_vendor_bill_journal on public.vendor_bills;
create trigger trg_sync_vendor_bill_journal after insert or update of status,total,tax_amount,bill_date on public.vendor_bills for each row execute function private.sync_vendor_bill_journal();

create or replace function private.sync_vendor_payment()
returns trigger language plpgsql security definer set search_path='' as $$
declare je uuid; bill_id uuid;
begin
  bill_id:=coalesce(new.vendor_bill_id,old.vendor_bill_id);
  if tg_op='DELETE' or new.status='void' then
    update public.accounting_journal_entries set status='void',updated_at=now() where source_type='vendor_payment' and source_id=coalesce(new.id,old.id);
  else
    insert into public.accounting_journal_entries(entry_date,description,source_type,source_id,status,created_by)
    values(new.paid_at::date,'Vendor payment','vendor_payment',new.id,'posted',new.created_by)
    on conflict(source_type,source_id) do update set entry_date=excluded.entry_date,status='posted',updated_at=now()
    returning id into je;
    delete from public.accounting_journal_lines where journal_entry_id=je;
    insert into public.accounting_journal_lines(journal_entry_id,account_id,description,debit) values(je,private.account_id('2000'),'Reduce payable',new.amount);
    insert into public.accounting_journal_lines(journal_entry_id,account_id,description,credit) values(je,private.account_id('1000'),'Cash paid',new.amount);
  end if;
  update public.vendor_bills b set updated_at=now() where b.id=bill_id;
  return coalesce(new,old);
end $$;

drop trigger if exists trg_sync_vendor_payment on public.vendor_payments;
create trigger trg_sync_vendor_payment after insert or update or delete on public.vendor_payments for each row execute function private.sync_vendor_payment();

create or replace view public.fieldops_ar_aging with (security_invoker=true) as
select i.id,i.invoice_number,i.customer_id,i.customer_name_snapshot,i.issued_date,i.due_date,i.total,i.amount_paid,i.balance_due,
  case when i.balance_due<=0 then 'paid'
       when coalesce(i.due_date,current_date)>=current_date then 'current'
       when current_date-i.due_date between 1 and 30 then '1-30'
       when current_date-i.due_date between 31 and 60 then '31-60'
       when current_date-i.due_date between 61 and 90 then '61-90'
       else '90+' end as aging_bucket
from public.invoices i where i.status<>'void' and i.balance_due>0;

create or replace view public.fieldops_ap_aging with (security_invoker=true) as
select b.id,b.bill_number,b.supplier_id,s.name supplier_name,b.bill_date,b.due_date,b.total,b.amount_paid,b.balance_due,b.status,
  case when b.balance_due<=0 then 'paid'
       when b.due_date>=current_date then 'current'
       when current_date-b.due_date between 1 and 30 then '1-30'
       when current_date-b.due_date between 31 and 60 then '31-60'
       when current_date-b.due_date between 61 and 90 then '61-90'
       else '90+' end as aging_bucket
from public.vendor_bills b join public.inventory_suppliers s on s.id=b.supplier_id
where b.status<>'void' and b.balance_due>0;

create or replace view public.fieldops_trial_balance with (security_invoker=true) as
select a.id,a.code,a.name,a.account_type,a.normal_balance,
  coalesce(sum(case when e.status='posted' then l.debit else 0 end),0)::numeric(14,2) debit_total,
  coalesce(sum(case when e.status='posted' then l.credit else 0 end),0)::numeric(14,2) credit_total,
  coalesce(sum(case when e.status='posted' then l.debit-l.credit else 0 end),0)::numeric(14,2) net_debit
from public.accounting_accounts a
left join public.accounting_journal_lines l on l.account_id=a.id
left join public.accounting_journal_entries e on e.id=l.journal_entry_id
group by a.id,a.code,a.name,a.account_type,a.normal_balance;

grant select on public.fieldops_ar_aging,public.fieldops_ap_aging,public.fieldops_trial_balance to authenticated;

-- Backfill journals for current non-void invoices and posted payments without changing operational data.
update public.invoices set updated_at=updated_at where status in ('approved','sent','partial','paid','overdue');
update public.payments set received_at=received_at where status='posted';

commit;
