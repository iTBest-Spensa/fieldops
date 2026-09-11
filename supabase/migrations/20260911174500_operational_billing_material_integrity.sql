-- FIELDOPS OPERATIONAL + BILLING + MATERIAL INTEGRITY V1
-- Keeps Finished -> Billing Ready automatic while tightening actual-time editing,
-- exact invoice math, configurable labour/travel charging and work-order materials.

begin;

-- ============================================================
-- BILLING DEFAULTS + WORK-ORDER TRAVEL INPUT
-- ============================================================

alter table public.fieldops_settings
  add column if not exists minimum_billable_minutes integer not null default 0,
  add column if not exists travel_billing_mode text not null default 'time',
  add column if not exists travel_hourly_rate numeric(12,2),
  add column if not exists travel_per_km_rate numeric(12,2) not null default 0;

alter table public.fieldops_settings
  drop constraint if exists fieldops_settings_minimum_billable_minutes_check,
  add constraint fieldops_settings_minimum_billable_minutes_check
    check (minimum_billable_minutes between 0 and 1440),
  drop constraint if exists fieldops_settings_travel_billing_mode_check,
  add constraint fieldops_settings_travel_billing_mode_check
    check (travel_billing_mode in ('time','distance','none')),
  drop constraint if exists fieldops_settings_travel_hourly_rate_check,
  add constraint fieldops_settings_travel_hourly_rate_check
    check (travel_hourly_rate is null or travel_hourly_rate >= 0),
  drop constraint if exists fieldops_settings_travel_per_km_rate_check,
  add constraint fieldops_settings_travel_per_km_rate_check
    check (travel_per_km_rate >= 0);

alter table public.work_orders
  add column if not exists travel_distance_km numeric(10,2) not null default 0;

alter table public.work_orders
  drop constraint if exists work_orders_travel_distance_km_check,
  add constraint work_orders_travel_distance_km_check
    check (travel_distance_km >= 0);

-- Preserve exact fractional hours. The old NUMERIC(12,2) quantity rounded each
-- time line before money was calculated (e.g. 32 min -> .53 h).
-- line_total is a generated column that depends on quantity, so PostgreSQL will
-- not let quantity change type while that dependency exists. Rebuild only that
-- generated column around the type change; its values are deterministically
-- recalculated from quantity * unit_price.
alter table public.invoice_items
  drop column line_total;

alter table public.invoice_items
  alter column quantity type numeric(14,6) using quantity::numeric(14,6);

alter table public.invoice_items
  add column line_total numeric(12,2)
  generated always as (round(quantity * unit_price, 2)) stored;

alter table public.invoice_items
  drop constraint if exists invoice_items_source_type_check;
alter table public.invoice_items
  add constraint invoice_items_source_type_check
  check (
    source_type is null
    or source_type in (
      'time_entry','material_usage','manual','travel_setting','billing_rule'
    )
  );

-- ============================================================
-- SOURCE-LINE SYNCHRONIZATION
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
  defaults public.fieldops_settings%rowtype;
  actual_work_minutes integer := 0;
  minimum_minutes integer := 0;
  minimum_rate numeric(12,2) := 0;
  minimum_extra_minutes integer := 0;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found.'; end if;
  if inv.work_order_id is null then return; end if;

  select * into wo from public.work_orders where id = inv.work_order_id;
  if not found then raise exception 'Work order not found.'; end if;

  select * into defaults from public.fieldops_settings where id = 1;

  delete from public.invoice_items
  where invoice_id = inv.id
    and source_type in ('time_entry','material_usage','travel_setting','billing_rule');

  -- Actual technician time. Display may round hours, but stored quantity keeps
  -- six decimals so financial totals are based on the exact recorded minutes.
  insert into public.invoice_items(
    invoice_id,work_order_id,line_type,description,quantity,unit_price,
    sort_order,source_type,source_id,taxable
  )
  select
    inv.id,
    wo.id,
    case when coalesce(te.activity_type,'work') = 'travel' then 'travel' else 'labour' end,
    concat(
      case coalesce(te.activity_type,'work')
        when 'travel' then 'Travel'
        when 'on_site' then 'On Site'
        when 'waiting' then 'Waiting'
        when 'break' then 'Break / Lunch'
        when 'other' then 'Other labour'
        else 'Labour'
      end,
      ' · ',coalesce(p.full_name,p.email,'Technician')
    ),
    (
      greatest(
        coalesce(
          te.duration_minutes,
          round(extract(epoch from (te.ended_at-te.started_at))/60.0)::integer
        ),
        0
      )::numeric / 60.0
    )::numeric(14,6),
    case
      when te.activity_type = 'travel'
        then coalesce(defaults.travel_hourly_rate,te.billing_rate,te.hourly_rate,0)
      else coalesce(te.billing_rate,te.hourly_rate,0)
    end,
    row_number() over(order by te.started_at)::integer,
    'time_entry',te.id,true
  from public.time_entries te
  left join public.profiles p on p.id = te.technician_id
  where te.work_order_id = wo.id
    and te.billable = true
    and te.ended_at is not null
    and coalesce(te.approval_status,'approved') = 'approved'
    and coalesce(
      te.duration_minutes,
      round(extract(epoch from (te.ended_at-te.started_at))/60.0)::integer,
      0
    ) > 0
    and (
      coalesce(te.activity_type,'work') <> 'travel'
      or coalesce(defaults.travel_billing_mode,'time') = 'time'
    );

  -- Distance travel replaces time-based travel when configured. Distance is a
  -- Work Order value today and can later be populated by the vehicle/GPS layer.
  if coalesce(defaults.travel_billing_mode,'time') = 'distance'
     and coalesce(wo.travel_distance_km,0) > 0
     and coalesce(defaults.travel_per_km_rate,0) > 0 then
    insert into public.invoice_items(
      invoice_id,work_order_id,line_type,description,quantity,unit_price,
      sort_order,source_type,source_id,taxable
    ) values (
      inv.id,wo.id,'travel',
      concat('Travel distance · ',trim(to_char(wo.travel_distance_km,'FM999999990.00')),' km'),
      wo.travel_distance_km::numeric(14,6),defaults.travel_per_km_rate,
      900,'travel_setting',wo.id,true
    );
  end if;

  -- Net consumed materials only. Returned stock reduces billable quantity.
  insert into public.invoice_items(
    invoice_id,work_order_id,line_type,description,quantity,unit_price,
    sort_order,source_type,source_id,taxable
  )
  select
    inv.id,wo.id,'material',mu.description,
    (mu.quantity-coalesce(mu.quantity_returned,0))::numeric(14,6),mu.unit_price,
    1000+row_number() over(order by mu.created_at)::integer,
    'material_usage',mu.id,coalesce(ii.taxable,true)
  from public.material_usage mu
  left join public.inventory_items ii on ii.id = mu.inventory_item_id
  where mu.work_order_id = wo.id
    and mu.billable = true
    and (mu.quantity-coalesce(mu.quantity_returned,0)) > 0;

  -- Optional minimum labour charge. Actual labour stays visible and the extra
  -- minimum is shown as its own transparent line rather than falsifying time.
  minimum_minutes := greatest(coalesce(defaults.minimum_billable_minutes,0),0);

  select
    coalesce(sum(
      greatest(
        coalesce(
          te.duration_minutes,
          round(extract(epoch from (te.ended_at-te.started_at))/60.0)::integer
        ),0
      )
    ),0)::integer
  into actual_work_minutes
  from public.time_entries te
  where te.work_order_id = wo.id
    and te.activity_type = 'work'
    and te.billable = true
    and te.ended_at is not null
    and coalesce(te.approval_status,'approved')='approved';

  if minimum_minutes > 0 and actual_work_minutes > 0 and actual_work_minutes < minimum_minutes then
    select coalesce(te.billing_rate,te.hourly_rate,0)
    into minimum_rate
    from public.time_entries te
    where te.work_order_id = wo.id
      and te.activity_type = 'work'
      and te.billable = true
      and te.ended_at is not null
      and coalesce(te.approval_status,'approved')='approved'
    order by te.started_at
    limit 1;

    minimum_extra_minutes := minimum_minutes - actual_work_minutes;

    if coalesce(minimum_rate,0) > 0 then
      insert into public.invoice_items(
        invoice_id,work_order_id,line_type,description,quantity,unit_price,
        sort_order,source_type,source_id,taxable
      ) values (
        inv.id,wo.id,'service',
        concat('Minimum labour charge · ',minimum_minutes,' min minimum'),
        (minimum_extra_minutes::numeric/60.0)::numeric(14,6),minimum_rate,
        950,'billing_rule',wo.id,true
      );
    end if;
  end if;

  perform private.fieldops_recalculate_invoice(inv.id);
end;
$$;

revoke all on function private.fieldops_sync_invoice_source_lines(uuid) from public;

-- ============================================================
-- ACTUAL-TIME CORRECTION WITH ACTIONABLE CONFLICT GUIDANCE
-- ============================================================

create or replace function public.fieldops_correct_time_entry(
  p_time_entry_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_activity_type text,
  p_billable boolean,
  p_billing_rate numeric,
  p_pay_rate numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_entry public.time_entries%rowtype;
  work_status text;
  old_billing_status text;
  correction_id uuid;
  corrected_by_id uuid := auth.uid();
  conflict_entry public.time_entries%rowtype;
  conflict_wo_number text;
  next_approval text;
  draft_invoice_id uuid;
begin
  if corrected_by_id is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager']::text[])) then
    raise exception 'Only Admin or Manager may correct historical technician time.';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A correction reason of at least 5 characters is required.';
  end if;
  if p_activity_type not in ('travel','on_site','work','waiting','break','other') then
    raise exception 'Unsupported activity type.';
  end if;
  if p_started_at is null then raise exception 'Actual start time is required.'; end if;
  if p_ended_at is not null and p_ended_at <= p_started_at then
    raise exception 'Actual end time must be later than actual start time.';
  end if;
  if p_billing_rate is not null and p_billing_rate < 0 then raise exception 'Billing rate cannot be negative.'; end if;
  if p_pay_rate is not null and p_pay_rate < 0 then raise exception 'Pay rate cannot be negative.'; end if;

  select * into old_entry from public.time_entries where id=p_time_entry_id for update;
  if not found then raise exception 'Time entry not found.'; end if;

  select wo.status,wo.billing_status into work_status,old_billing_status
  from public.work_orders wo where wo.id=old_entry.work_order_id for update;

  if work_status in ('finished','billing_ready','closed','cancelled') and p_ended_at is null then
    raise exception 'A finished or closed work order cannot keep an open technician clock.';
  end if;

  if p_ended_at is null and exists(
    select 1 from public.time_entries te
    where te.technician_id=old_entry.technician_id
      and te.ended_at is null
      and te.id<>old_entry.id
  ) then
    raise exception 'This technician already has another open actual-time entry. Correct or close that active segment first.';
  end if;

  if p_ended_at is not null then
    select te.* into conflict_entry
    from public.time_entries te
    where te.technician_id=old_entry.technician_id
      and te.id<>old_entry.id
      and te.started_at < p_ended_at
      and coalesce(te.ended_at,'infinity'::timestamptz) > p_started_at
    order by te.started_at
    limit 1;

    if found then
      select wo.work_order_number into conflict_wo_number
      from public.work_orders wo where wo.id=conflict_entry.work_order_id;

      if conflict_entry.started_at <= p_started_at then
        raise exception 'Time conflict with previous segment: % % (% to %). Correct the END of that segment first, then return to this segment.',
          coalesce(conflict_wo_number,'Work Order'),
          initcap(replace(conflict_entry.activity_type,'_',' ')),
          conflict_entry.started_at,
          coalesce(conflict_entry.ended_at,pg_catalog.now());
      else
        raise exception 'Time conflict with next segment: % % (% to %). Correct the START of that segment first, then return to this segment.',
          coalesce(conflict_wo_number,'Work Order'),
          initcap(replace(conflict_entry.activity_type,'_',' ')),
          conflict_entry.started_at,
          coalesce(conflict_entry.ended_at,pg_catalog.now());
      end if;
    end if;
  end if;

  -- Active operational records remain pending until Finished. Corrections made
  -- after the Finished/Billing handoff remain approved and force Billing review
  -- where appropriate.
  next_approval := case
    when work_status in ('finished','billing_ready','closed') then 'approved'
    else 'pending'
  end;

  insert into public.time_entry_corrections(
    time_entry_id,work_order_id,technician_id,operation,
    original_values,corrected_values,reason,corrected_by
  ) values (
    old_entry.id,old_entry.work_order_id,old_entry.technician_id,'corrected',
    jsonb_build_object(
      'started_at',old_entry.started_at,'ended_at',old_entry.ended_at,
      'activity_type',old_entry.activity_type,'billable',old_entry.billable,
      'billing_rate',old_entry.billing_rate,'pay_rate',old_entry.pay_rate,
      'approval_status',old_entry.approval_status
    ),
    jsonb_build_object(
      'started_at',p_started_at,'ended_at',p_ended_at,
      'activity_type',p_activity_type,'billable',p_billable,
      'billing_rate',p_billing_rate,'pay_rate',p_pay_rate,
      'approval_status',next_approval
    ),trim(p_reason),corrected_by_id
  ) returning id into correction_id;

  update public.time_entries
  set started_at=p_started_at,
      ended_at=p_ended_at,
      activity_type=p_activity_type,
      billable=p_billable,
      billing_rate=p_billing_rate,
      pay_rate=p_pay_rate,
      approval_status=next_approval,
      approved_by=case when next_approval='approved' then corrected_by_id else null end,
      approved_at=case when next_approval='approved' then pg_catalog.now() else null end,
      ended_reason=case
        when p_ended_at is null then null
        else 'authorized_time_correction'
      end
  where id=old_entry.id;

  if old_billing_status='billed' then
    update public.work_orders set billing_status='review_required' where id=old_entry.work_order_id;
  end if;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(
    old_entry.work_order_id,'time_entry_corrected',work_status,work_status,
    jsonb_build_object(
      'time_entry_id',old_entry.id,'correction_id',correction_id,
      'technician_id',old_entry.technician_id,'reason',trim(p_reason),
      'corrected_by',corrected_by_id,'approval_status',next_approval,
      'original',jsonb_build_object(
        'started_at',old_entry.started_at,'ended_at',old_entry.ended_at,
        'activity_type',old_entry.activity_type,'billable',old_entry.billable,
        'billing_rate',old_entry.billing_rate,'pay_rate',old_entry.pay_rate
      ),
      'corrected',jsonb_build_object(
        'started_at',p_started_at,'ended_at',p_ended_at,
        'activity_type',p_activity_type,'billable',p_billable,
        'billing_rate',p_billing_rate,'pay_rate',p_pay_rate
      )
    )
  );

  if next_approval='approved' then
    for draft_invoice_id in
      select i.id from public.invoices i
      where i.work_order_id=old_entry.work_order_id and i.status='draft'
    loop
      perform private.fieldops_sync_invoice_source_lines(draft_invoice_id);
    end loop;
  end if;

  return jsonb_build_object(
    'time_entry_id',old_entry.id,'correction_id',correction_id,
    'corrected',true,'approval_status',next_approval
  );
end;
$$;

create or replace function public.fieldops_add_time_entry(
  p_work_order_id uuid,
  p_technician_id uuid,
  p_assignment_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_activity_type text,
  p_billable boolean,
  p_billing_rate numeric,
  p_pay_rate numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_status text;
  old_billing_status text;
  resolved_assignment_id uuid;
  new_time_entry_id uuid;
  correction_id uuid;
  corrected_by_id uuid := auth.uid();
  conflict_entry public.time_entries%rowtype;
  conflict_wo_number text;
  next_approval text;
  draft_invoice_id uuid;
begin
  if corrected_by_id is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager']::text[])) then
    raise exception 'Only Admin or Manager may add historical technician time.';
  end if;
  if p_reason is null or length(trim(p_reason))<5 then raise exception 'A reason of at least 5 characters is required.'; end if;
  if p_activity_type not in ('travel','on_site','work','waiting','break','other') then raise exception 'Unsupported activity type.'; end if;
  if p_started_at is null then raise exception 'Actual start time is required.'; end if;
  if p_ended_at is not null and p_ended_at<=p_started_at then raise exception 'Actual end time must be later than actual start time.'; end if;
  if p_billing_rate is not null and p_billing_rate<0 then raise exception 'Billing rate cannot be negative.'; end if;
  if p_pay_rate is not null and p_pay_rate<0 then raise exception 'Pay rate cannot be negative.'; end if;
  if not exists(select 1 from public.user_roles ur where ur.user_id=p_technician_id and ur.role='technician') then
    raise exception 'Selected user does not have the Technician role.';
  end if;

  select wo.status,wo.billing_status into work_status,old_billing_status
  from public.work_orders wo where wo.id=p_work_order_id for update;
  if not found then raise exception 'Work order not found.'; end if;
  if work_status in ('finished','billing_ready','closed','cancelled') and p_ended_at is null then
    raise exception 'A finished or closed work order requires an actual end time.';
  end if;

  if p_ended_at is not null then
    select te.* into conflict_entry
    from public.time_entries te
    where te.technician_id=p_technician_id
      and te.started_at<p_ended_at
      and coalesce(te.ended_at,'infinity'::timestamptz)>p_started_at
    order by te.started_at limit 1;
    if found then
      select wo.work_order_number into conflict_wo_number from public.work_orders wo where wo.id=conflict_entry.work_order_id;
      raise exception 'Time conflict: this new segment overlaps % % (% to %). Correct that existing segment first, then add this one.',
        coalesce(conflict_wo_number,'Work Order'),
        initcap(replace(conflict_entry.activity_type,'_',' ')),
        conflict_entry.started_at,
        coalesce(conflict_entry.ended_at,pg_catalog.now());
    end if;
  elsif exists(select 1 from public.time_entries te where te.technician_id=p_technician_id and te.ended_at is null) then
    raise exception 'This technician already has an open actual-time entry. Correct or close that active segment first.';
  end if;

  resolved_assignment_id:=p_assignment_id;
  if resolved_assignment_id is not null and not exists(
    select 1 from public.work_order_assignments a
    where a.id=resolved_assignment_id and a.work_order_id=p_work_order_id and a.technician_id=p_technician_id
  ) then raise exception 'The selected assignment does not belong to this technician/work order.'; end if;
  if resolved_assignment_id is null then
    select a.id into resolved_assignment_id
    from public.work_order_assignments a
    where a.work_order_id=p_work_order_id and a.technician_id=p_technician_id
    order by a.assigned_at desc limit 1;
  end if;

  next_approval := case when work_status in ('finished','billing_ready','closed') then 'approved' else 'pending' end;

  insert into public.time_entries(
    work_order_id,technician_id,assignment_id,started_at,ended_at,
    activity_type,billable,billing_rate,pay_rate,approval_status,source,
    approved_by,approved_at,ended_reason,notes
  ) values (
    p_work_order_id,p_technician_id,resolved_assignment_id,p_started_at,p_ended_at,
    p_activity_type,p_billable,p_billing_rate,p_pay_rate,next_approval,
    'authorized_manual_correction',
    case when next_approval='approved' then corrected_by_id else null end,
    case when next_approval='approved' then pg_catalog.now() else null end,
    case when p_ended_at is null then null else 'authorized_manual_entry' end,
    'Historical actual time added by an authorized user.'
  ) returning id into new_time_entry_id;

  insert into public.time_entry_corrections(
    time_entry_id,work_order_id,technician_id,operation,original_values,
    corrected_values,reason,corrected_by
  ) values (
    new_time_entry_id,p_work_order_id,p_technician_id,'added',null,
    jsonb_build_object(
      'started_at',p_started_at,'ended_at',p_ended_at,'activity_type',p_activity_type,
      'billable',p_billable,'billing_rate',p_billing_rate,'pay_rate',p_pay_rate,
      'approval_status',next_approval
    ),trim(p_reason),corrected_by_id
  ) returning id into correction_id;

  if resolved_assignment_id is not null and work_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set assignment_status='completed',
        accepted_at=coalesce(accepted_at,p_started_at),
        released_at=coalesce(released_at,p_ended_at,p_started_at),
        pending_activity_type=null
    where id=resolved_assignment_id;
  end if;

  if old_billing_status='billed' then
    update public.work_orders set billing_status='review_required' where id=p_work_order_id;
  end if;

  insert into public.work_order_events(work_order_id,event_type,old_status,new_status,details)
  values(
    p_work_order_id,'missing_time_added',work_status,work_status,
    jsonb_build_object(
      'time_entry_id',new_time_entry_id,'correction_id',correction_id,
      'technician_id',p_technician_id,'reason',trim(p_reason),
      'corrected_by',corrected_by_id,'started_at',p_started_at,'ended_at',p_ended_at,
      'activity_type',p_activity_type,'billable',p_billable,'approval_status',next_approval
    )
  );

  if next_approval='approved' then
    for draft_invoice_id in select i.id from public.invoices i where i.work_order_id=p_work_order_id and i.status='draft'
    loop perform private.fieldops_sync_invoice_source_lines(draft_invoice_id); end loop;
  end if;

  return jsonb_build_object(
    'time_entry_id',new_time_entry_id,'correction_id',correction_id,
    'added',true,'approval_status',next_approval
  );
end;
$$;

revoke all on function public.fieldops_correct_time_entry(uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text) from public;
revoke all on function public.fieldops_add_time_entry(uuid,uuid,uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text) from public;
grant execute on function public.fieldops_correct_time_entry(uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text) to authenticated;
grant execute on function public.fieldops_add_time_entry(uuid,uuid,uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text) to authenticated;

-- ============================================================
-- WORK-ORDER MATERIALS
-- ============================================================

create or replace function public.fieldops_add_work_order_material(
  p_work_order_id uuid,
  p_inventory_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_billable boolean,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  wo public.work_orders%rowtype;
  item public.inventory_items%rowtype;
  available_qty numeric;
  movement_id uuid;
  usage_id uuid;
  technician_id uuid;
  draft_invoice_id uuid;
begin
  if actor is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician','billing']::text[])) then
    raise exception 'You do not have permission to add Work Order materials.';
  end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Material quantity must be greater than zero.'; end if;
  if p_unit_price is null or p_unit_price<0 then raise exception 'Material sell price cannot be negative.'; end if;

  select * into wo from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Work Order not found.'; end if;
  select * into item from public.inventory_items where id=p_inventory_item_id and active=true;
  if not found then raise exception 'Choose an active inventory item.'; end if;
  if not exists(select 1 from public.inventory_locations l where l.id=p_location_id and l.active=true) then
    raise exception 'Choose an active inventory location.';
  end if;

  if (select private.has_any_role(array['technician']::text[]))
     and not (select private.has_any_role(array['admin','manager','inventory','dispatcher','billing']::text[])) then
    if not (select private.is_assigned_to_work_order(p_work_order_id)) then
      raise exception 'Technician must be assigned to this Work Order before consuming material.';
    end if;
    if wo.status not in ('working','waiting','on_site') then
      raise exception 'Technicians can add material while the Work Order is Working or Waiting.';
    end if;
  end if;

  if (select private.has_any_role(array['billing']::text[]))
     and not (select private.has_any_role(array['admin','manager']::text[]))
     and wo.status not in ('billing_ready','closed') then
    raise exception 'Billing can add material after the Work Order reaches Billing Ready.';
  end if;

  if item.track_stock then
    available_qty := private.fieldops_inventory_location_quantity(item.id,p_location_id);
    if available_qty < p_quantity then
      raise exception 'Insufficient stock at the selected location. Available: %, requested: %.',available_qty,p_quantity;
    end if;
  end if;

  select a.technician_id into technician_id
  from public.work_order_assignments a
  where a.work_order_id=wo.id and a.assignment_role='primary'
  order by a.assigned_at desc limit 1;

  insert into public.inventory_transactions(
    inventory_item_id,location_id,work_order_id,technician_id,transaction_type,
    quantity,unit_cost,reference,notes,created_by
  ) values (
    item.id,p_location_id,wo.id,technician_id,'consume',-abs(p_quantity),item.unit_cost,
    wo.work_order_number,nullif(btrim(p_notes),''),actor
  ) returning id into movement_id;

  insert into public.material_usage(
    work_order_id,inventory_item_id,description,quantity,unit_cost,unit_price,billable,recorded_by
  ) values (
    wo.id,item.id,item.name,abs(p_quantity),item.unit_cost,p_unit_price,coalesce(p_billable,true),actor
  ) returning id into usage_id;

  for draft_invoice_id in select i.id from public.invoices i where i.work_order_id=wo.id and i.status='draft'
  loop perform private.fieldops_sync_invoice_source_lines(draft_invoice_id); end loop;

  return jsonb_build_object('material_usage_id',usage_id,'transaction_id',movement_id);
end;
$$;

create or replace function public.fieldops_return_work_order_material(
  p_material_usage_id uuid,
  p_quantity numeric,
  p_location_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  usage public.material_usage%rowtype;
  item public.inventory_items%rowtype;
  wo public.work_orders%rowtype;
  remaining numeric;
  ret public.inventory_returns%rowtype;
  draft_invoice_id uuid;
begin
  if actor is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','inventory','dispatcher','technician','billing']::text[])) then
    raise exception 'You do not have permission to return Work Order material.';
  end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Return quantity must be greater than zero.'; end if;
  if p_reason is null or length(btrim(p_reason))<3 then raise exception 'Return reason must be at least 3 characters.'; end if;

  select * into usage from public.material_usage where id=p_material_usage_id for update;
  if not found then raise exception 'Material usage record not found.'; end if;
  select * into wo from public.work_orders where id=usage.work_order_id for update;
  select * into item from public.inventory_items where id=usage.inventory_item_id;
  if not found then raise exception 'Inventory item not found.'; end if;
  if not exists(select 1 from public.inventory_locations l where l.id=p_location_id and l.active=true) then
    raise exception 'Choose an active return location.';
  end if;

  remaining := usage.quantity-coalesce(usage.quantity_returned,0);
  if p_quantity>remaining then raise exception 'Return quantity exceeds the % still consumed on this Work Order.',remaining; end if;

  if (select private.has_any_role(array['technician']::text[]))
     and not (select private.has_any_role(array['admin','manager','inventory','dispatcher','billing']::text[]))
     and not (select private.is_assigned_to_work_order(usage.work_order_id)) then
    raise exception 'Technician must be assigned to this Work Order to return its material.';
  end if;

  insert into public.inventory_returns(
    return_type,work_order_id,location_id,reason,notes,created_by
  ) values (
    'work_order',usage.work_order_id,p_location_id,btrim(p_reason),
    concat('Return against material usage ',usage.id),actor
  ) returning * into ret;

  insert into public.inventory_return_items(return_id,inventory_item_id,quantity,condition,unit_cost)
  values(ret.id,item.id,p_quantity,'restockable',usage.unit_cost);

  update public.material_usage
  set quantity_returned=coalesce(quantity_returned,0)+p_quantity
  where id=usage.id;

  insert into public.inventory_transactions(
    inventory_item_id,location_id,work_order_id,return_id,transaction_type,
    quantity,unit_cost,reference,notes,created_by
  ) values (
    item.id,p_location_id,usage.work_order_id,ret.id,'return',abs(p_quantity),usage.unit_cost,
    ret.return_number,btrim(p_reason),actor
  );

  for draft_invoice_id in select i.id from public.invoices i where i.work_order_id=usage.work_order_id and i.status='draft'
  loop perform private.fieldops_sync_invoice_source_lines(draft_invoice_id); end loop;

  return jsonb_build_object('return_id',ret.id,'material_usage_id',usage.id,'returned_quantity',p_quantity);
end;
$$;

create or replace function public.fieldops_set_work_order_material_billable(
  p_material_usage_id uuid,
  p_billable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  usage public.material_usage%rowtype;
  draft_invoice_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','billing']::text[])) then
    raise exception 'Only Admin, Manager or Billing can change whether a material is billed.';
  end if;
  select * into usage from public.material_usage where id=p_material_usage_id for update;
  if not found then raise exception 'Material usage record not found.'; end if;
  if exists(
    select 1 from public.invoices i
    where i.work_order_id=usage.work_order_id and i.status not in ('draft','void')
  ) then
    raise exception 'The invoice is no longer Draft. Use a Credit / Charge adjustment instead of changing source material.';
  end if;
  update public.material_usage set billable=coalesce(p_billable,true) where id=usage.id;
  for draft_invoice_id in select i.id from public.invoices i where i.work_order_id=usage.work_order_id and i.status='draft'
  loop perform private.fieldops_sync_invoice_source_lines(draft_invoice_id); end loop;
  return jsonb_build_object('material_usage_id',usage.id,'billable',coalesce(p_billable,true));
end;
$$;

create or replace function public.fieldops_set_work_order_travel_distance(
  p_work_order_id uuid,
  p_distance_km numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft_invoice_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if not (select private.has_any_role(array['admin','manager','dispatcher','billing']::text[])) then
    raise exception 'Admin, Manager, Dispatcher or Billing permission is required.';
  end if;
  if p_distance_km is null or p_distance_km<0 then raise exception 'Travel distance cannot be negative.'; end if;
  update public.work_orders set travel_distance_km=p_distance_km,updated_at=pg_catalog.now() where id=p_work_order_id;
  if not found then raise exception 'Work Order not found.'; end if;
  for draft_invoice_id in select i.id from public.invoices i where i.work_order_id=p_work_order_id and i.status='draft'
  loop perform private.fieldops_sync_invoice_source_lines(draft_invoice_id); end loop;
  return jsonb_build_object('work_order_id',p_work_order_id,'travel_distance_km',p_distance_km);
end;
$$;

revoke all on function public.fieldops_add_work_order_material(uuid,uuid,uuid,numeric,numeric,boolean,text) from public;
revoke all on function public.fieldops_return_work_order_material(uuid,numeric,uuid,text) from public;
revoke all on function public.fieldops_set_work_order_material_billable(uuid,boolean) from public;
revoke all on function public.fieldops_set_work_order_travel_distance(uuid,numeric) from public;
grant execute on function public.fieldops_add_work_order_material(uuid,uuid,uuid,numeric,numeric,boolean,text) to authenticated;
grant execute on function public.fieldops_return_work_order_material(uuid,numeric,uuid,text) to authenticated;
grant execute on function public.fieldops_set_work_order_material_billable(uuid,boolean) to authenticated;
grant execute on function public.fieldops_set_work_order_travel_distance(uuid,numeric) to authenticated;

-- Refresh current drafts once so exact-hour math and the new source rules take
-- effect immediately after this migration is applied.
do $$
declare r record;
begin
  for r in select id from public.invoices where status='draft'
  loop
    perform private.fieldops_sync_invoice_source_lines(r.id);
  end loop;
end;
$$;

commit;
