-- ============================================================
-- FIELDOPS DEMO DISPATCH DATA
-- Development/demo seed only.
--
-- Creates five NON-LOGIN dummy technician Auth rows only so the
-- existing profiles foreign key can be satisfied. These dummy
-- users have @fieldops.demo email addresses, no usable password
-- and no auth identity, so they are not real login accounts.
--
-- Also creates demo customers, sites, work orders, assignments
-- and schedule events for the current Vancouver date.
-- ============================================================

do $$
declare
  v_day date := (now() at time zone 'America/Vancouver')::date;

  alex uuid := '10000000-0000-4000-8000-000000000001';
  jordan uuid := '10000000-0000-4000-8000-000000000002';
  nina uuid := '10000000-0000-4000-8000-000000000003';
  daniel uuid := '10000000-0000-4000-8000-000000000004';
  ethan uuid := '10000000-0000-4000-8000-000000000005';

  c_summit uuid := '20000000-0000-4000-8000-000000000001';
  c_northvalley uuid := '20000000-0000-4000-8000-000000000002';
  c_cedar uuid := '20000000-0000-4000-8000-000000000003';

  s_summit uuid := '30000000-0000-4000-8000-000000000001';
  s_northvalley uuid := '30000000-0000-4000-8000-000000000002';
  s_cedar uuid := '30000000-0000-4000-8000-000000000003';

  wo_alex_1 uuid := '40000000-0000-4000-8000-000000000001';
  wo_alex_2 uuid := '40000000-0000-4000-8000-000000000002';
  wo_alex_3 uuid := '40000000-0000-4000-8000-000000000003';

  wo_jordan_1 uuid := '40000000-0000-4000-8000-000000000011';
  wo_jordan_2 uuid := '40000000-0000-4000-8000-000000000012';
  wo_jordan_3 uuid := '40000000-0000-4000-8000-000000000013';

  wo_nina_1 uuid := '40000000-0000-4000-8000-000000000021';
  wo_nina_2 uuid := '40000000-0000-4000-8000-000000000022';

  wo_daniel_1 uuid := '40000000-0000-4000-8000-000000000031';
  wo_daniel_2 uuid := '40000000-0000-4000-8000-000000000032';
  wo_daniel_3 uuid := '40000000-0000-4000-8000-000000000033';

  wo_ethan_1 uuid := '40000000-0000-4000-8000-000000000041';
  wo_ethan_2 uuid := '40000000-0000-4000-8000-000000000042';

  wo_wait_1 uuid := '40000000-0000-4000-8000-000000000101';
  wo_wait_2 uuid := '40000000-0000-4000-8000-000000000102';
  wo_wait_3 uuid := '40000000-0000-4000-8000-000000000103';

  wo_week_1 uuid := '40000000-0000-4000-8000-000000000201';
  wo_week_2 uuid := '40000000-0000-4000-8000-000000000202';
  wo_week_3 uuid := '40000000-0000-4000-8000-000000000203';
  wo_week_4 uuid := '40000000-0000-4000-8000-000000000204';
  wo_week_5 uuid := '40000000-0000-4000-8000-000000000205';

begin
  -- ----------------------------------------------------------
  -- DEMO TECHNICIAN USERS
  -- ----------------------------------------------------------
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values
    (
      alex, 'authenticated', 'authenticated', 'alex.morgan@fieldops.demo', '',
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
      '{"full_name":"Alex Morgan","demo":true}'::jsonb,
      now(), now()
    ),
    (
      jordan, 'authenticated', 'authenticated', 'jordan.singh@fieldops.demo', '',
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
      '{"full_name":"Jordan Singh","demo":true}'::jsonb,
      now(), now()
    ),
    (
      nina, 'authenticated', 'authenticated', 'nina.patel@fieldops.demo', '',
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
      '{"full_name":"Nina Patel","demo":true}'::jsonb,
      now(), now()
    ),
    (
      daniel, 'authenticated', 'authenticated', 'daniel.kim@fieldops.demo', '',
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
      '{"full_name":"Daniel Kim","demo":true}'::jsonb,
      now(), now()
    ),
    (
      ethan, 'authenticated', 'authenticated', 'ethan.lee@fieldops.demo', '',
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb,
      '{"full_name":"Ethan Lee","demo":true}'::jsonb,
      now(), now()
    )
  on conflict (id) do update
  set raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

  insert into public.profiles (id, full_name, email, active)
  values
    (alex, 'Alex Morgan', 'alex.morgan@fieldops.demo', true),
    (jordan, 'Jordan Singh', 'jordan.singh@fieldops.demo', true),
    (nina, 'Nina Patel', 'nina.patel@fieldops.demo', true),
    (daniel, 'Daniel Kim', 'daniel.kim@fieldops.demo', true),
    (ethan, 'Ethan Lee', 'ethan.lee@fieldops.demo', true)
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      active = true,
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values
    (alex, 'technician'),
    (jordan, 'technician'),
    (nina, 'technician'),
    (daniel, 'technician'),
    (ethan, 'technician')
  on conflict (user_id, role) do nothing;

  insert into public.technician_profiles (
    technician_id, specialty, skill_tags, service_area, shift_start, shift_end
  )
  values
    (alex, 'Network', array['network','firewall','wifi'], 'North Kamloops', '08:00', '17:00'),
    (jordan, 'Desktop', array['desktop','workstation','windows'], 'Downtown', '08:00', '17:00'),
    (nina, 'Deployment', array['deployment','onboarding','laptop'], 'South Shore', '08:00', '17:00'),
    (daniel, 'Security', array['security','firewall','network'], 'North Kamloops', '08:00', '17:00'),
    (ethan, 'Projects', array['project','cabling','deployment'], 'Downtown', '08:00', '17:00')
  on conflict (technician_id) do update
  set specialty = excluded.specialty,
      skill_tags = excluded.skill_tags,
      service_area = excluded.service_area,
      shift_start = excluded.shift_start,
      shift_end = excluded.shift_end,
      updated_at = now();

  -- ----------------------------------------------------------
  -- DEMO CUSTOMERS
  -- ----------------------------------------------------------
  insert into public.customers (
    id, name, account_code, billing_email, phone, status, notes
  )
  values
    (c_summit, 'Summit Professional Centre', 'DEMO-SUMMIT', 'accounts@summit.demo', '250-555-0101', 'active', 'FieldOps demo customer'),
    (c_northvalley, 'North Valley Accounting', 'DEMO-NVA', 'billing@northvalley.demo', '250-555-0102', 'active', 'FieldOps demo customer'),
    (c_cedar, 'Cedar Health Group', 'DEMO-CEDAR', 'finance@cedarhealth.demo', '250-555-0103', 'active', 'FieldOps demo customer')
  on conflict (id) do update
  set name = excluded.name,
      billing_email = excluded.billing_email,
      phone = excluded.phone,
      status = excluded.status,
      notes = excluded.notes,
      updated_at = now();

  insert into public.sites (
    id, customer_id, name, address1, city, province_state,
    postal_code, country, timezone, active, notes
  )
  values
    (s_summit, c_summit, 'Summit Professional Centre', '100 Summit Drive', 'North Kamloops', 'BC', 'V2B 0A1', 'Canada', 'America/Vancouver', true, 'Demo site'),
    (s_northvalley, c_northvalley, 'North Valley Accounting', '250 Victoria Street', 'Downtown', 'BC', 'V2C 2A2', 'Canada', 'America/Vancouver', true, 'Demo site'),
    (s_cedar, c_cedar, 'Cedar Health Group', '700 Columbia Street', 'South Shore', 'BC', 'V2C 2V4', 'Canada', 'America/Vancouver', true, 'Demo site')
  on conflict (id) do update
  set customer_id = excluded.customer_id,
      name = excluded.name,
      address1 = excluded.address1,
      city = excluded.city,
      province_state = excluded.province_state,
      postal_code = excluded.postal_code,
      timezone = excluded.timezone,
      active = true,
      notes = excluded.notes,
      updated_at = now();

  -- ----------------------------------------------------------
  -- TODAY'S DEMO WORK
  -- ----------------------------------------------------------
  insert into public.work_orders (
    id, work_order_number, customer_id, site_id,
    title, description, job_type, priority, status, source,
    requested_at, scheduled_start, scheduled_end,
    estimated_duration_minutes, required_skills, service_area
  )
  values
    -- Alex
    (wo_alex_1, 'DEMO-WO-001032', c_summit, s_summit,
     'Firewall service', 'Routine firewall service completed successfully.', 'Network Service',
     'normal', 'finished', 'office',
     now() - interval '1 day',
     (v_day + time '08:30') at time zone 'America/Vancouver',
     (v_day + time '10:00') at time zone 'America/Vancouver',
     90, array['network','firewall'], 'North Kamloops'),

    (wo_alex_2, 'DEMO-WO-001037', c_summit, s_summit,
     'Network outage', 'Investigate intermittent network outage on site.', 'Network Incident',
     'urgent', 'on_site', 'phone',
     now() - interval '5 hours',
     (v_day + time '10:30') at time zone 'America/Vancouver',
     (v_day + time '13:45') at time zone 'America/Vancouver',
     195, array['network'], 'North Kamloops'),

    (wo_alex_3, 'DEMO-WO-001052', c_cedar, s_cedar,
     'Wi-Fi survey', 'Wireless coverage survey for new office area.', 'Network Survey',
     'normal', 'assigned', 'office',
     now() - interval '2 hours',
     (v_day + time '14:15') at time zone 'America/Vancouver',
     (v_day + time '15:30') at time zone 'America/Vancouver',
     75, array['wifi','network'], 'South Shore'),

    -- Jordan
    (wo_jordan_1, 'DEMO-WO-001036', c_northvalley, s_northvalley,
     'Server check', 'Morning server health check.', 'Desktop / Server',
     'normal', 'finished', 'office',
     now() - interval '1 day',
     (v_day + time '09:00') at time zone 'America/Vancouver',
     (v_day + time '10:15') at time zone 'America/Vancouver',
     75, array['desktop'], 'Downtown'),

    (wo_jordan_2, 'DEMO-WO-001043', c_northvalley, s_northvalley,
     'Workstation issue', 'Troubleshoot workstation performance and profile issue.', 'Desktop Support',
     'high', 'working', 'phone',
     now() - interval '4 hours',
     (v_day + time '11:00') at time zone 'America/Vancouver',
     (v_day + time '13:30') at time zone 'America/Vancouver',
     150, array['desktop','workstation'], 'Downtown'),

    (wo_jordan_3, 'DEMO-WO-001059', c_cedar, s_cedar,
     'Desktop support', 'Scheduled desktop support visit.', 'Desktop Support',
     'normal', 'assigned', 'office',
     now() - interval '2 hours',
     (v_day + time '15:00') at time zone 'America/Vancouver',
     (v_day + time '16:30') at time zone 'America/Vancouver',
     90, array['desktop'], 'South Shore'),

    -- Nina
    (wo_nina_1, 'DEMO-WO-001035', c_cedar, s_cedar,
     'Laptop setup', 'Prepare and configure new staff laptop.', 'Deployment',
     'normal', 'finished', 'office',
     now() - interval '1 day',
     (v_day + time '08:00') at time zone 'America/Vancouver',
     (v_day + time '09:45') at time zone 'America/Vancouver',
     105, array['laptop','deployment'], 'South Shore'),

    (wo_nina_2, 'DEMO-WO-001057', c_cedar, s_cedar,
     'User onboarding', 'New employee device and account onboarding.', 'Deployment',
     'normal', 'assigned', 'office',
     now() - interval '2 hours',
     (v_day + time '15:30') at time zone 'America/Vancouver',
     (v_day + time '16:30') at time zone 'America/Vancouver',
     60, array['onboarding','deployment'], 'South Shore'),

    -- Daniel
    (wo_daniel_1, 'DEMO-WO-001030', c_summit, s_summit,
     'Router swap', 'Replace failed edge router.', 'Network / Security',
     'high', 'finished', 'phone',
     now() - interval '1 day',
     (v_day + time '08:00') at time zone 'America/Vancouver',
     (v_day + time '09:00') at time zone 'America/Vancouver',
     60, array['network','security'], 'North Kamloops'),

    (wo_daniel_2, 'DEMO-WO-001039', c_summit, s_summit,
     'Switch replacement', 'Replace access switch and validate uplinks.', 'Network / Security',
     'high', 'working', 'office',
     now() - interval '5 hours',
     (v_day + time '09:30') at time zone 'America/Vancouver',
     (v_day + time '14:30') at time zone 'America/Vancouver',
     300, array['network','security'], 'North Kamloops'),

    (wo_daniel_3, 'DEMO-WO-001061', c_northvalley, s_northvalley,
     'Security review', 'Review endpoint and network security controls.', 'Security',
     'normal', 'assigned', 'office',
     now() - interval '2 hours',
     (v_day + time '15:00') at time zone 'America/Vancouver',
     (v_day + time '16:30') at time zone 'America/Vancouver',
     90, array['security'], 'Downtown'),

    -- Ethan
    (wo_ethan_1, 'DEMO-WO-001028', c_northvalley, s_northvalley,
     'Office deployment', 'Complete office workstation and network deployment.', 'Project',
     'normal', 'finished', 'office',
     now() - interval '1 day',
     (v_day + time '08:30') at time zone 'America/Vancouver',
     (v_day + time '11:00') at time zone 'America/Vancouver',
     150, array['deployment','project'], 'Downtown'),

    (wo_ethan_2, 'DEMO-WO-001060', c_northvalley, s_northvalley,
     'Rack cleanup', 'Organize rack cabling and document patching.', 'Project',
     'normal', 'assigned', 'office',
     now() - interval '2 hours',
     (v_day + time '14:45') at time zone 'America/Vancouver',
     (v_day + time '16:30') at time zone 'America/Vancouver',
     105, array['cabling','project'], 'Downtown'),

    -- Waiting work: intentionally NOT assigned
    (wo_wait_1, 'DEMO-WO-001041', c_summit, s_summit,
     'Network outage', 'Urgent outage reported by the customer.', 'Network Incident',
     'emergency', 'requested', 'phone',
     now() - interval '25 minutes',
     null, null,
     90, array['network'], 'North Kamloops'),

    (wo_wait_2, 'DEMO-WO-001044', c_northvalley, s_northvalley,
     'Replace damaged workstation', 'Workstation damaged and requires replacement.', 'Desktop Support',
     'high', 'planned', 'office',
     now() - interval '1 hour',
     (v_day + time '13:00') at time zone 'America/Vancouver',
     null,
     90, array['desktop','workstation'], 'Downtown'),

    (wo_wait_3, 'DEMO-WO-001048', c_cedar, s_cedar,
     'New employee setup', 'Prepare laptop, accounts and basic onboarding.', 'Deployment',
     'normal', 'requested', 'email',
     now() - interval '2 hours',
     (v_day + time '14:30') at time zone 'America/Vancouver',
     null,
     75, array['deployment','onboarding'], 'South Shore'),

    -- Tomorrow so the Week drawer is visibly live
    (wo_week_1, 'DEMO-WO-001064', c_summit, s_summit,
     'Network assessment', 'Planned network health assessment.', 'Network Service',
     'normal', 'assigned', 'office',
     now(),
     ((v_day + 1) + time '09:00') at time zone 'America/Vancouver',
     ((v_day + 1) + time '11:30') at time zone 'America/Vancouver',
     150, array['network'], 'North Kamloops'),

    (wo_week_2, 'DEMO-WO-001065', c_northvalley, s_northvalley,
     'User setup', 'Prepare desktop profile and applications.', 'Desktop Support',
     'normal', 'assigned', 'office',
     now(),
     ((v_day + 1) + time '10:00') at time zone 'America/Vancouver',
     ((v_day + 1) + time '12:00') at time zone 'America/Vancouver',
     120, array['desktop'], 'Downtown'),

    (wo_week_3, 'DEMO-WO-001063', c_cedar, s_cedar,
     'Laptop rollout', 'Deploy laptops for new staff group.', 'Deployment',
     'normal', 'assigned', 'office',
     now(),
     ((v_day + 1) + time '08:30') at time zone 'America/Vancouver',
     ((v_day + 1) + time '11:30') at time zone 'America/Vancouver',
     180, array['deployment','laptop'], 'South Shore'),

    (wo_week_4, 'DEMO-WO-001066', c_summit, s_summit,
     'Firewall audit', 'Review firewall policy and change history.', 'Security',
     'normal', 'assigned', 'office',
     now(),
     ((v_day + 1) + time '13:00') at time zone 'America/Vancouver',
     ((v_day + 1) + time '15:30') at time zone 'America/Vancouver',
     150, array['security','firewall'], 'North Kamloops'),

    (wo_week_5, 'DEMO-WO-001062', c_northvalley, s_northvalley,
     'Cabling project', 'Complete structured cabling punch-list.', 'Project',
     'normal', 'assigned', 'office',
     now(),
     ((v_day + 1) + time '08:00') at time zone 'America/Vancouver',
     ((v_day + 1) + time '12:00') at time zone 'America/Vancouver',
     240, array['cabling','project'], 'Downtown')
  on conflict (id) do update
  set customer_id = excluded.customer_id,
      site_id = excluded.site_id,
      title = excluded.title,
      description = excluded.description,
      job_type = excluded.job_type,
      priority = excluded.priority,
      status = excluded.status,
      source = excluded.source,
      requested_at = excluded.requested_at,
      scheduled_start = excluded.scheduled_start,
      scheduled_end = excluded.scheduled_end,
      estimated_duration_minutes = excluded.estimated_duration_minutes,
      required_skills = excluded.required_skills,
      service_area = excluded.service_area,
      updated_at = now();

  -- ----------------------------------------------------------
  -- TODAY + TOMORROW ASSIGNMENTS
  -- ----------------------------------------------------------
  insert into public.work_order_assignments (
    id, work_order_id, technician_id,
    assignment_role, assignment_status,
    scheduled_start, scheduled_end
  )
  values
    ('50000000-0000-4000-8000-000000000001', wo_alex_1, alex, 'primary', 'completed',
      (v_day + time '08:30') at time zone 'America/Vancouver',
      (v_day + time '10:00') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000002', wo_alex_2, alex, 'primary', 'accepted',
      (v_day + time '10:30') at time zone 'America/Vancouver',
      (v_day + time '13:45') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000003', wo_alex_3, alex, 'primary', 'assigned',
      (v_day + time '14:15') at time zone 'America/Vancouver',
      (v_day + time '15:30') at time zone 'America/Vancouver'),

    ('50000000-0000-4000-8000-000000000011', wo_jordan_1, jordan, 'primary', 'completed',
      (v_day + time '09:00') at time zone 'America/Vancouver',
      (v_day + time '10:15') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000012', wo_jordan_2, jordan, 'primary', 'accepted',
      (v_day + time '11:00') at time zone 'America/Vancouver',
      (v_day + time '13:30') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000013', wo_jordan_3, jordan, 'primary', 'assigned',
      (v_day + time '15:00') at time zone 'America/Vancouver',
      (v_day + time '16:30') at time zone 'America/Vancouver'),

    ('50000000-0000-4000-8000-000000000021', wo_nina_1, nina, 'primary', 'completed',
      (v_day + time '08:00') at time zone 'America/Vancouver',
      (v_day + time '09:45') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000022', wo_nina_2, nina, 'primary', 'assigned',
      (v_day + time '15:30') at time zone 'America/Vancouver',
      (v_day + time '16:30') at time zone 'America/Vancouver'),

    ('50000000-0000-4000-8000-000000000031', wo_daniel_1, daniel, 'primary', 'completed',
      (v_day + time '08:00') at time zone 'America/Vancouver',
      (v_day + time '09:00') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000032', wo_daniel_2, daniel, 'primary', 'accepted',
      (v_day + time '09:30') at time zone 'America/Vancouver',
      (v_day + time '14:30') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000033', wo_daniel_3, daniel, 'primary', 'assigned',
      (v_day + time '15:00') at time zone 'America/Vancouver',
      (v_day + time '16:30') at time zone 'America/Vancouver'),

    ('50000000-0000-4000-8000-000000000041', wo_ethan_1, ethan, 'primary', 'completed',
      (v_day + time '08:30') at time zone 'America/Vancouver',
      (v_day + time '11:00') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000042', wo_ethan_2, ethan, 'primary', 'assigned',
      (v_day + time '14:45') at time zone 'America/Vancouver',
      (v_day + time '16:30') at time zone 'America/Vancouver'),

    ('50000000-0000-4000-8000-000000000201', wo_week_1, alex, 'primary', 'assigned',
      ((v_day + 1) + time '09:00') at time zone 'America/Vancouver',
      ((v_day + 1) + time '11:30') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000202', wo_week_2, jordan, 'primary', 'assigned',
      ((v_day + 1) + time '10:00') at time zone 'America/Vancouver',
      ((v_day + 1) + time '12:00') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000203', wo_week_3, nina, 'primary', 'assigned',
      ((v_day + 1) + time '08:30') at time zone 'America/Vancouver',
      ((v_day + 1) + time '11:30') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000204', wo_week_4, daniel, 'primary', 'assigned',
      ((v_day + 1) + time '13:00') at time zone 'America/Vancouver',
      ((v_day + 1) + time '15:30') at time zone 'America/Vancouver'),
    ('50000000-0000-4000-8000-000000000205', wo_week_5, ethan, 'primary', 'assigned',
      ((v_day + 1) + time '08:00') at time zone 'America/Vancouver',
      ((v_day + 1) + time '12:00') at time zone 'America/Vancouver')
  on conflict (work_order_id, technician_id) do update
  set assignment_status = excluded.assignment_status,
      scheduled_start = excluded.scheduled_start,
      scheduled_end = excluded.scheduled_end,
      updated_at = now();

  -- ----------------------------------------------------------
  -- NON-JOB ACTIVITIES
  -- ----------------------------------------------------------
  insert into public.technician_schedule_events (
    id, technician_id, event_type, title,
    starts_at, ends_at, notes
  )
  values
    ('60000000-0000-4000-8000-000000000001', alex, 'lunch', 'Lunch',
      (v_day + time '13:45') at time zone 'America/Vancouver',
      (v_day + time '14:10') at time zone 'America/Vancouver',
      'Demo lunch break'),

    ('60000000-0000-4000-8000-000000000011', jordan, 'travel', 'Travelling',
      (v_day + time '10:25') at time zone 'America/Vancouver',
      (v_day + time '11:00') at time zone 'America/Vancouver',
      'Travel to North Valley Accounting'),

    ('60000000-0000-4000-8000-000000000012', jordan, 'lunch', 'Lunch',
      (v_day + time '13:30') at time zone 'America/Vancouver',
      (v_day + time '14:00') at time zone 'America/Vancouver',
      'Demo lunch break'),

    ('60000000-0000-4000-8000-000000000021', nina, 'lunch', 'Lunch',
      (v_day + time '12:00') at time zone 'America/Vancouver',
      (v_day + time '12:30') at time zone 'America/Vancouver',
      'Demo lunch break'),

    ('60000000-0000-4000-8000-000000000031', daniel, 'lunch', 'Lunch',
      (v_day + time '14:30') at time zone 'America/Vancouver',
      (v_day + time '15:00') at time zone 'America/Vancouver',
      'Demo lunch break'),

    ('60000000-0000-4000-8000-000000000041', ethan, 'lunch', 'Lunch',
      (v_day + time '12:30') at time zone 'America/Vancouver',
      (v_day + time '13:00') at time zone 'America/Vancouver',
      'Demo lunch break')
  on conflict (id) do update
  set technician_id = excluded.technician_id,
      event_type = excluded.event_type,
      title = excluded.title,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      notes = excluded.notes,
      updated_at = now();
end
$$;
