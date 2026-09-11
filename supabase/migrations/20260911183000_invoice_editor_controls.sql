-- FIELDOPS INVOICE EDITOR CONTROLS
-- Adds an audited way to remove manual Draft invoice lines.

begin;

create or replace function public.fieldops_remove_invoice_charge(p_invoice_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  line public.invoice_items%rowtype;
  inv public.invoices%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then
    raise exception 'Billing permission required.';
  end if;

  select * into line
  from public.invoice_items
  where id = p_invoice_item_id
  for update;

  if not found then
    raise exception 'Invoice line not found.';
  end if;

  select * into inv
  from public.invoices
  where id = line.invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found.';
  end if;

  if inv.status <> 'draft' then
    raise exception 'Only Draft invoice lines can be removed.';
  end if;

  if coalesce(line.source_type,'') <> 'manual' then
    raise exception 'Only manually added service/charge lines can be removed here. Work Order source lines must be changed at their source.';
  end if;

  delete from public.invoice_items where id = line.id;

  insert into public.invoice_events(invoice_id,event_type,details,created_by)
  values (
    inv.id,
    'manual_charge_removed',
    jsonb_build_object(
      'invoice_item_id',line.id,
      'line_type',line.line_type,
      'description',line.description,
      'quantity',line.quantity,
      'unit_price',line.unit_price,
      'line_total',line.line_total
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'invoice_id',inv.id,
    'invoice_item_id',line.id,
    'removed',true
  );
end;
$$;

revoke all on function public.fieldops_remove_invoice_charge(uuid) from public;
grant execute on function public.fieldops_remove_invoice_charge(uuid) to authenticated;

commit;
