-- FIELDOPS TIME CORRECTION + BILLING RECOVERY V1
-- Migration: 20260909123500_time_correction_billing_recovery.sql
--
-- Admin is the full-access role.
-- Manager may correct historical technician time.
-- Billing may recover closed work orders into the billing queue.
-- Every time correction preserves an immutable before/after audit record.

begin;
-- ============================================================
-- BILLING RECOVERY STATE
-- Operational work-order status remains separate from billing state.
-- ============================================================

alter table public.work_orders
  add column if not exists billing_status text not null default 'not_billed',
  add column if not exists billing_ready_at timestamptz,
  add column if not exists billed_at timestamptz;
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'work_orders_billing_status_check'
      and conrelid = 'public.work_orders'::regclass
  ) then
    alter table public.work_orders
      add constraint work_orders_billing_status_check
      check (
        billing_status in (
          'not_billed',
          'ready',
          'billed',
          'review_required',
          'waived'
        )
      );
  end if;
end
$$;
update public.work_orders
set
  billing_status = 'ready',
  billing_ready_at = coalesce(billing_ready_at, updated_at)
where status = 'billing_ready'
  and billing_status = 'not_billed';
create index if not exists idx_work_orders_billing_status
  on public.work_orders(billing_status);
-- ============================================================
-- IMMUTABLE TIME-CORRECTION AUDIT
-- ============================================================

create table if not exists public.time_entry_corrections (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid references public.time_entries(id) on delete set null,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null,
  original_values jsonb,
  corrected_values jsonb not null,
  reason text not null,
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  corrected_at timestamptz not null default pg_catalog.now(),
  constraint time_entry_corrections_operation_check
    check (operation in ('added','corrected'))
);
create index if not exists idx_time_entry_corrections_work_order
  on public.time_entry_corrections(work_order_id, corrected_at desc);
create index if not exists idx_time_entry_corrections_time_entry
  on public.time_entry_corrections(time_entry_id, corrected_at desc);
alter table public.time_entry_corrections enable row level security;
drop policy if exists time_entry_corrections_select_privileged
  on public.time_entry_corrections;
create policy time_entry_corrections_select_privileged
on public.time_entry_corrections
for select
to authenticated
using (
  (select private.has_any_role(
    array['admin','manager','billing']::text[]
  ))
);
grant select on public.time_entry_corrections to authenticated;
-- ============================================================
-- CORRECT AN EXISTING TIME ENTRY
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
  corrected_by_id uuid;
begin
  corrected_by_id := (select auth.uid());

  if corrected_by_id is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    select private.has_any_role(
      array['admin','manager']::text[]
    )
  ) then
    raise exception 'Only Admin or Manager may correct historical technician time.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A correction reason of at least 5 characters is required.';
  end if;

  if p_activity_type not in (
    'travel','on_site','work','waiting','break','other'
  ) then
    raise exception 'Unsupported activity type.';
  end if;

  if p_started_at is null then
    raise exception 'Actual start time is required.';
  end if;

  if p_ended_at is not null and p_ended_at <= p_started_at then
    raise exception 'Actual end time must be later than actual start time.';
  end if;

  if p_billing_rate is not null and p_billing_rate < 0 then
    raise exception 'Billing rate cannot be negative.';
  end if;

  if p_pay_rate is not null and p_pay_rate < 0 then
    raise exception 'Pay rate cannot be negative.';
  end if;

  select *
  into old_entry
  from public.time_entries
  where id = p_time_entry_id
  for update;

  if not found then
    raise exception 'Time entry not found.';
  end if;

  select wo.status, wo.billing_status
  into work_status, old_billing_status
  from public.work_orders wo
  where wo.id = old_entry.work_order_id
  for update;

  if work_status in ('finished','billing_ready','closed','cancelled')
     and p_ended_at is null then
    raise exception 'A finished or closed work order cannot keep an open technician clock.';
  end if;

  if p_ended_at is null and exists (
    select 1
    from public.time_entries other_entry
    where other_entry.technician_id = old_entry.technician_id
      and other_entry.ended_at is null
      and other_entry.id <> old_entry.id
  ) then
    raise exception 'This technician already has another open actual-time entry.';
  end if;

  if p_ended_at is not null and exists (
    select 1
    from public.time_entries other_entry
    where other_entry.technician_id = old_entry.technician_id
      and other_entry.id <> old_entry.id
      and other_entry.started_at < p_ended_at
      and coalesce(other_entry.ended_at, 'infinity'::timestamptz) > p_started_at
  ) then
    raise exception 'This correction overlaps another technician time entry. Adjust the surrounding segments first.';
  end if;

  insert into public.time_entry_corrections (
    time_entry_id,
    work_order_id,
    technician_id,
    operation,
    original_values,
    corrected_values,
    reason,
    corrected_by
  ) values (
    old_entry.id,
    old_entry.work_order_id,
    old_entry.technician_id,
    'corrected',
    jsonb_build_object(
      'started_at', old_entry.started_at,
      'ended_at', old_entry.ended_at,
      'activity_type', old_entry.activity_type,
      'billable', old_entry.billable,
      'billing_rate', old_entry.billing_rate,
      'pay_rate', old_entry.pay_rate,
      'approval_status', old_entry.approval_status
    ),
    jsonb_build_object(
      'started_at', p_started_at,
      'ended_at', p_ended_at,
      'activity_type', p_activity_type,
      'billable', p_billable,
      'billing_rate', p_billing_rate,
      'pay_rate', p_pay_rate,
      'approval_status', 'approved'
    ),
    trim(p_reason),
    corrected_by_id
  )
  returning id into correction_id;

  update public.time_entries
  set
    started_at = p_started_at,
    ended_at = p_ended_at,
    activity_type = p_activity_type,
    billable = p_billable,
    billing_rate = p_billing_rate,
    pay_rate = p_pay_rate,
    approval_status = 'approved',
    approved_by = corrected_by_id,
    approved_at = pg_catalog.now(),
    ended_reason = case
      when p_ended_at is null then null
      else coalesce(ended_reason, 'authorized_time_correction')
    end
  where id = old_entry.id;

  -- If already billed labour changes, never silently leave billing as final.
  if old_billing_status = 'billed' then
    update public.work_orders
    set billing_status = 'review_required'
    where id = old_entry.work_order_id;
  end if;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    old_entry.work_order_id,
    'time_entry_corrected',
    work_status,
    work_status,
    jsonb_build_object(
      'time_entry_id', old_entry.id,
      'correction_id', correction_id,
      'technician_id', old_entry.technician_id,
      'reason', trim(p_reason),
      'corrected_by', corrected_by_id,
      'original', jsonb_build_object(
        'started_at', old_entry.started_at,
        'ended_at', old_entry.ended_at,
        'activity_type', old_entry.activity_type,
        'billable', old_entry.billable,
        'billing_rate', old_entry.billing_rate,
        'pay_rate', old_entry.pay_rate
      ),
      'corrected', jsonb_build_object(
        'started_at', p_started_at,
        'ended_at', p_ended_at,
        'activity_type', p_activity_type,
        'billable', p_billable,
        'billing_rate', p_billing_rate,
        'pay_rate', p_pay_rate
      )
    )
  );

  return jsonb_build_object(
    'time_entry_id', old_entry.id,
    'correction_id', correction_id,
    'corrected', true
  );
end;
$$;
-- ============================================================
-- ADD MISSING HISTORICAL TIME
-- ============================================================

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
  corrected_by_id uuid;
begin
  corrected_by_id := (select auth.uid());

  if corrected_by_id is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    select private.has_any_role(
      array['admin','manager']::text[]
    )
  ) then
    raise exception 'Only Admin or Manager may add historical technician time.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A reason of at least 5 characters is required.';
  end if;

  if p_activity_type not in (
    'travel','on_site','work','waiting','break','other'
  ) then
    raise exception 'Unsupported activity type.';
  end if;

  if p_started_at is null then
    raise exception 'Actual start time is required.';
  end if;

  if p_ended_at is not null and p_ended_at <= p_started_at then
    raise exception 'Actual end time must be later than actual start time.';
  end if;

  if p_billing_rate is not null and p_billing_rate < 0 then
    raise exception 'Billing rate cannot be negative.';
  end if;

  if p_pay_rate is not null and p_pay_rate < 0 then
    raise exception 'Pay rate cannot be negative.';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_technician_id
      and ur.role = 'technician'
  ) then
    raise exception 'Selected user does not have the Technician role.';
  end if;

  select wo.status, wo.billing_status
  into work_status, old_billing_status
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'Work order not found.';
  end if;

  if work_status in ('finished','billing_ready','closed','cancelled')
     and p_ended_at is null then
    raise exception 'A finished or closed work order requires an actual end time.';
  end if;

  if p_ended_at is null and exists (
    select 1
    from public.time_entries te
    where te.technician_id = p_technician_id
      and te.ended_at is null
  ) then
    raise exception 'This technician already has an open actual-time entry.';
  end if;

  -- Historical segments must not overlap. A break must replace work time,
  -- not sit on top of it and double-count payroll/billing.
  if p_ended_at is not null and exists (
    select 1
    from public.time_entries te
    where te.technician_id = p_technician_id
      and te.started_at < p_ended_at
      and coalesce(te.ended_at, 'infinity'::timestamptz) > p_started_at
  ) then
    raise exception 'This time segment overlaps another technician time entry. Split the surrounding work segment before adding a break or other activity.';
  end if;

  resolved_assignment_id := p_assignment_id;

  if resolved_assignment_id is not null and not exists (
    select 1
    from public.work_order_assignments a
    where a.id = resolved_assignment_id
      and a.work_order_id = p_work_order_id
      and a.technician_id = p_technician_id
  ) then
    raise exception 'The selected assignment does not belong to this technician/work order.';
  end if;

  if resolved_assignment_id is null then
    select a.id
    into resolved_assignment_id
    from public.work_order_assignments a
    where a.work_order_id = p_work_order_id
      and a.technician_id = p_technician_id
    order by a.assigned_at desc
    limit 1;
  end if;

  insert into public.time_entries (
    work_order_id,
    technician_id,
    assignment_id,
    started_at,
    ended_at,
    activity_type,
    billable,
    billing_rate,
    pay_rate,
    approval_status,
    source,
    approved_by,
    approved_at,
    ended_reason,
    notes
  ) values (
    p_work_order_id,
    p_technician_id,
    resolved_assignment_id,
    p_started_at,
    p_ended_at,
    p_activity_type,
    p_billable,
    p_billing_rate,
    p_pay_rate,
    'approved',
    'authorized_manual_correction',
    corrected_by_id,
    pg_catalog.now(),
    case
      when p_ended_at is null then null
      else 'authorized_manual_entry'
    end,
    'Historical actual time added by an authorized user.'
  )
  returning id into new_time_entry_id;

  insert into public.time_entry_corrections (
    time_entry_id,
    work_order_id,
    technician_id,
    operation,
    original_values,
    corrected_values,
    reason,
    corrected_by
  ) values (
    new_time_entry_id,
    p_work_order_id,
    p_technician_id,
    'added',
    null,
    jsonb_build_object(
      'started_at', p_started_at,
      'ended_at', p_ended_at,
      'activity_type', p_activity_type,
      'billable', p_billable,
      'billing_rate', p_billing_rate,
      'pay_rate', p_pay_rate,
      'approval_status', 'approved'
    ),
    trim(p_reason),
    corrected_by_id
  )
  returning id into correction_id;

  -- A closed/finished job with a technician who forgot to accept is repaired
  -- as historical completed ownership, not left "awaiting acceptance".
  if resolved_assignment_id is not null
     and work_status in ('finished','billing_ready','closed') then
    update public.work_order_assignments
    set
      assignment_status = 'completed',
      accepted_at = coalesce(accepted_at, p_started_at),
      released_at = coalesce(released_at, p_ended_at, p_started_at),
      pending_activity_type = null
    where id = resolved_assignment_id;
  end if;

  if old_billing_status = 'billed' then
    update public.work_orders
    set billing_status = 'review_required'
    where id = p_work_order_id;
  end if;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    'missing_time_added',
    work_status,
    work_status,
    jsonb_build_object(
      'time_entry_id', new_time_entry_id,
      'correction_id', correction_id,
      'technician_id', p_technician_id,
      'reason', trim(p_reason),
      'corrected_by', corrected_by_id,
      'started_at', p_started_at,
      'ended_at', p_ended_at,
      'activity_type', p_activity_type,
      'billable', p_billable
    )
  );

  return jsonb_build_object(
    'time_entry_id', new_time_entry_id,
    'correction_id', correction_id,
    'added', true
  );
end;
$$;
-- ============================================================
-- BILLING RECOVERY
-- ============================================================

create or replace function public.fieldops_recover_billing(
  p_work_order_id uuid,
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
  recovered_by_id uuid;
begin
  recovered_by_id := (select auth.uid());

  if recovered_by_id is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    select private.has_any_role(
      array['admin','manager','billing']::text[]
    )
  ) then
    raise exception 'Only Admin, Manager, or Billing may recover billing.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A billing recovery reason of at least 5 characters is required.';
  end if;

  select wo.status, wo.billing_status
  into work_status, old_billing_status
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'Work order not found.';
  end if;

  if old_billing_status = 'billed' then
    raise exception 'This work order is already marked Billed.';
  end if;

  update public.work_orders
  set
    billing_status = 'ready',
    billing_ready_at = pg_catalog.now()
  where id = p_work_order_id;

  insert into public.work_order_events (
    work_order_id,
    event_type,
    old_status,
    new_status,
    details
  ) values (
    p_work_order_id,
    'billing_recovered',
    work_status,
    work_status,
    jsonb_build_object(
      'old_billing_status', old_billing_status,
      'new_billing_status', 'ready',
      'reason', trim(p_reason),
      'recovered_by', recovered_by_id,
      'recovered_at', pg_catalog.now()
    )
  );

  return jsonb_build_object(
    'billing_status', 'ready',
    'recovered', true
  );
end;
$$;
revoke all on function public.fieldops_correct_time_entry(
  uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text
) from public;
revoke all on function public.fieldops_add_time_entry(
  uuid,uuid,uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text
) from public;
revoke all on function public.fieldops_recover_billing(
  uuid,text
) from public;
grant execute on function public.fieldops_correct_time_entry(
  uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text
) to authenticated;
grant execute on function public.fieldops_add_time_entry(
  uuid,uuid,uuid,timestamptz,timestamptz,text,boolean,numeric,numeric,text
) to authenticated;
grant execute on function public.fieldops_recover_billing(
  uuid,text
) to authenticated;
commit;
