-- FieldOps follow-up: global time-rate defaults + atomic multi-material consume.

alter table public.fieldops_settings
  add column if not exists default_customer_billing_rate numeric(12,2) not null default 0,
  add column if not exists default_technician_pay_rate numeric(12,2) not null default 0;

alter table public.fieldops_settings
  drop constraint if exists fieldops_settings_default_customer_billing_rate_check,
  add constraint fieldops_settings_default_customer_billing_rate_check check (default_customer_billing_rate >= 0),
  drop constraint if exists fieldops_settings_default_technician_pay_rate_check,
  add constraint fieldops_settings_default_technician_pay_rate_check check (default_technician_pay_rate >= 0);

update public.fieldops_settings s
set default_customer_billing_rate = coalesce((select tc.billing_rate from public.technician_compensation tc where tc.billing_rate is not null group by tc.billing_rate order by count(*) desc,tc.billing_rate desc limit 1),s.default_customer_billing_rate),
    default_technician_pay_rate = coalesce((select tc.pay_rate from public.technician_compensation tc where tc.pay_rate is not null group by tc.pay_rate order by count(*) desc,tc.pay_rate desc limit 1),s.default_technician_pay_rate)
where s.id=1 and s.default_customer_billing_rate=0 and s.default_technician_pay_rate=0;

create or replace function private.fieldops_apply_default_time_rates() returns trigger language plpgsql security definer set search_path='' as $$
declare cfg public.fieldops_settings%rowtype;
begin
  if new.billing_rate is null or new.pay_rate is null then
    select * into cfg from public.fieldops_settings where id=1;
    if new.billing_rate is null then new.billing_rate:=coalesce(cfg.default_customer_billing_rate,0); end if;
    if new.pay_rate is null then new.pay_rate:=coalesce(cfg.default_technician_pay_rate,0); end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_fieldops_default_time_rates on public.time_entries;
create trigger trg_fieldops_default_time_rates before insert or update of billing_rate,pay_rate on public.time_entries for each row execute function private.fieldops_apply_default_time_rates();

create or replace function public.fieldops_add_work_order_materials(p_work_order_id uuid,p_location_id uuid,p_items jsonb,p_notes text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare item_row jsonb; line_count integer:=0;
begin
 if auth.uid() is null then raise exception 'Authentication required.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Select at least one inventory item.'; end if;
 for item_row in select value from jsonb_array_elements(p_items) loop
   perform public.fieldops_add_work_order_material(p_work_order_id,(item_row->>'inventory_item_id')::uuid,p_location_id,(item_row->>'quantity')::numeric,(item_row->>'unit_price')::numeric,coalesce((item_row->>'billable')::boolean,true),p_notes);
   line_count:=line_count+1;
 end loop;
 return jsonb_build_object('added',true,'line_count',line_count);
end;$$;
revoke all on function public.fieldops_add_work_order_materials(uuid,uuid,jsonb,text) from public;
grant execute on function public.fieldops_add_work_order_materials(uuid,uuid,jsonb,text) to authenticated;
