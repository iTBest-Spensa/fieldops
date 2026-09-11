-- Preserve selected material lines when the picker location changes.
-- Each selected line carries the stock location it was chosen from, so one
-- Consume & Add action can safely consume items from multiple locations.

create or replace function public.fieldops_add_work_order_materials(
  p_work_order_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_row jsonb;
  line_count integer := 0;
  line_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one inventory item.';
  end if;

  for item_row in
    select value from jsonb_array_elements(p_items)
  loop
    line_location_id := coalesce(
      nullif(item_row->>'location_id','')::uuid,
      p_location_id
    );

    if line_location_id is null then
      raise exception 'Every selected inventory item must have a stock location.';
    end if;

    perform public.fieldops_add_work_order_material(
      p_work_order_id,
      (item_row->>'inventory_item_id')::uuid,
      line_location_id,
      (item_row->>'quantity')::numeric,
      (item_row->>'unit_price')::numeric,
      coalesce((item_row->>'billable')::boolean,true),
      p_notes
    );

    line_count := line_count + 1;
  end loop;

  return jsonb_build_object(
    'added', true,
    'line_count', line_count
  );
end;
$$;

revoke all on function public.fieldops_add_work_order_materials(uuid,uuid,jsonb,text) from public;
grant execute on function public.fieldops_add_work_order_materials(uuid,uuid,jsonb,text) to authenticated;
