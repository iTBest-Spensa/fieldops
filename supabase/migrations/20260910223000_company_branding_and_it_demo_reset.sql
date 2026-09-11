-- FIELDOPS COMPANY BRANDING + SAFE IT DEMO RESET V1
-- Adds dynamic company logo storage and an Admin-only, explicitly invoked
-- reset/seed function. The migration itself DOES NOT delete operational data.
-- Data is only reset when an authenticated Admin calls fieldops_reset_it_demo_data().

begin;

-- ============================================================
-- COMPANY BRANDING
-- ============================================================

alter table public.fieldops_settings
  add column if not exists logo_path text;

-- Public branding assets: logos are intended to appear on user-facing pages
-- and printable documents. Write access remains Admin/Manager only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-branding',
  'company-branding',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Make company-name/logo changes propagate immediately to open pages.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'fieldops_settings'
     ) then
    execute 'alter publication supabase_realtime add table public.fieldops_settings';
  end if;
end
$$;

alter table public.fieldops_settings replica identity full;

drop policy if exists fieldops_company_branding_public_read on storage.objects;
create policy fieldops_company_branding_public_read
on storage.objects for select
to public
using (bucket_id = 'company-branding');

drop policy if exists fieldops_company_branding_management_insert on storage.objects;
create policy fieldops_company_branding_management_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-branding'
  and (select private.has_any_role(array['admin','manager']::text[]))
);

drop policy if exists fieldops_company_branding_management_update on storage.objects;
create policy fieldops_company_branding_management_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-branding'
  and (select private.has_any_role(array['admin','manager']::text[]))
)
with check (
  bucket_id = 'company-branding'
  and (select private.has_any_role(array['admin','manager']::text[]))
);

drop policy if exists fieldops_company_branding_management_delete on storage.objects;
create policy fieldops_company_branding_management_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-branding'
  and (select private.has_any_role(array['admin','manager']::text[]))
);

-- ============================================================
-- ADMIN-ONLY DEVELOPMENT RESET + IT DEMO SEED
-- ============================================================

create or replace function public.fieldops_reset_it_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();

  customer_1 uuid := gen_random_uuid();
  customer_2 uuid := gen_random_uuid();
  customer_3 uuid := gen_random_uuid();
  customer_4 uuid := gen_random_uuid();

  site_1 uuid := gen_random_uuid();
  site_2 uuid := gen_random_uuid();
  site_3 uuid := gen_random_uuid();
  site_4 uuid := gen_random_uuid();

  supplier_1 uuid := gen_random_uuid();
  supplier_2 uuid := gen_random_uuid();

  warehouse uuid := gen_random_uuid();
  service_bench uuid := gen_random_uuid();
  tech_van uuid := gen_random_uuid();

  item_cat6 uuid := gen_random_uuid();
  item_keystone uuid := gen_random_uuid();
  item_hdmi uuid := gen_random_uuid();
  item_usbc uuid := gen_random_uuid();
  item_nvme uuid := gen_random_uuid();
  item_ram uuid := gen_random_uuid();
  item_patchpanel uuid := gen_random_uuid();
  item_faceplate uuid := gen_random_uuid();
  item_poe uuid := gen_random_uuid();
  item_adapter uuid := gen_random_uuid();

  asset_service_laptop uuid := gen_random_uuid();
  asset_network_tester uuid := gen_random_uuid();
  asset_tablet uuid := gen_random_uuid();
  asset_label_printer uuid := gen_random_uuid();
  asset_loaner uuid := gen_random_uuid();
  asset_firewall uuid := gen_random_uuid();
  asset_customer_firewall uuid := gen_random_uuid();
  asset_customer_workstation uuid := gen_random_uuid();

  tech record;
  tech_count integer := 0;
  customer_count integer := 0;
  inventory_count integer := 0;
  asset_count integer := 0;
begin
  if actor is null then
    raise exception 'Authentication required.';
  end if;

  if not (select private.has_any_role(array['admin']::text[])) then
    raise exception 'Only an Admin can reset and seed IT demo data.';
  end if;

  -- Preserve auth.users, profiles, user_roles, fieldops_settings and its audit.
  -- Everything below is operational/demo data.
  truncate table
    public.invoice_events,
    public.invoice_adjustments,
    public.payments,
    public.invoice_items,
    public.invoices,
    public.material_usage,
    public.time_entry_corrections,
    public.time_entries,
    public.work_order_notes,
    public.work_order_events,
    public.work_order_assignments,
    public.technician_schedule_events,
    public.work_orders,
    public.asset_documents,
    public.asset_maintenance,
    public.asset_notes,
    public.asset_history,
    public.assets,
    public.inventory_return_items,
    public.inventory_returns,
    public.inventory_receipt_items,
    public.inventory_receipts,
    public.inventory_purchase_order_items,
    public.inventory_purchase_orders,
    public.inventory_reconciliation_lines,
    public.inventory_reconciliations,
    public.inventory_item_notes,
    public.inventory_item_suppliers,
    public.inventory_transactions,
    public.inventory_items,
    public.inventory_suppliers,
    public.inventory_locations,
    public.customer_notes,
    public.customer_contacts,
    public.contacts,
    public.sites,
    public.customers,
    public.technician_skills,
    public.technician_certifications,
    public.technician_notes,
    public.technician_compensation,
    public.technician_profiles
  restart identity;

  -- Reset human-readable numbers so the user's first new test WO is WO-001001.
  perform pg_catalog.setval('public.work_order_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.invoice_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.asset_tag_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.inventory_supplier_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.inventory_po_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.inventory_receipt_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.inventory_return_number_seq'::regclass, 1000, true);
  perform pg_catalog.setval('public.inventory_reconciliation_number_seq'::regclass, 1000, true);

  -- ----------------------------------------------------------
  -- CUSTOMERS + SITES + CONTACTS
  -- ----------------------------------------------------------

  insert into public.customers (
    id, name, account_code, account_number, customer_type, phone, email, website,
    billing_email, payment_terms_days, billing_terms_days, tax_exempt, status,
    address1, city, province_state, postal_code, country, tags, notes
  ) values
    (customer_1, 'Summit Professional Centre', 'CUS-1001', 'CUS-1001', 'business',
     '250-555-0101', 'office@summit.example.com', 'https://summit.example.com',
     'accounts@summit.example.com', 30, 30, false, 'active',
     '100 Summit Drive', 'Kamloops', 'British Columbia', 'V2C 1A1', 'Canada',
     array['managed-services','network'], 'Demo managed-services customer with a small office network.'),
    (customer_2, 'North Valley Accounting', 'CUS-1002', 'CUS-1002', 'business',
     '250-555-0102', 'admin@northvalley.example.com', 'https://northvalley.example.com',
     'billing@northvalley.example.com', 30, 30, false, 'active',
     '220 Valley Street', 'Kamloops', 'British Columbia', 'V2C 2B2', 'Canada',
     array['microsoft-365','endpoints'], 'Demo professional-services customer.'),
    (customer_3, 'Cedar Health Group', 'CUS-1003', 'CUS-1003', 'nonprofit',
     '250-555-0103', 'it@cedarhealth.example.com', 'https://cedarhealth.example.com',
     'finance@cedarhealth.example.com', 45, 45, false, 'active',
     '315 Cedar Avenue', 'Kamloops', 'British Columbia', 'V2C 3C3', 'Canada',
     array['healthcare','wifi'], 'Demo healthcare/nonprofit customer.'),
    (customer_4, 'Thompson Ridge Engineering', 'CUS-1004', 'CUS-1004', 'business',
     '250-555-0104', 'support@thompsonridge.example.com', 'https://thompsonridge.example.com',
     'ap@thompsonridge.example.com', 30, 30, false, 'active',
     '480 Ridge Road', 'Kamloops', 'British Columbia', 'V2C 4D4', 'Canada',
     array['engineering','workstations'], 'Demo engineering customer with high-performance workstations.');

  insert into public.sites (
    id, customer_id, name, address1, city, province_state, postal_code, country,
    timezone, phone, instructions, active, notes
  ) values
    (site_1, customer_1, 'Summit Main Office', '100 Summit Drive', 'Kamloops', 'British Columbia', 'V2C 1A1', 'Canada', 'America/Vancouver', '250-555-0101', 'Check in with reception before entering the server room.', true, 'Primary managed-services site.'),
    (site_2, customer_2, 'North Valley Downtown', '220 Valley Street', 'Kamloops', 'British Columbia', 'V2C 2B2', 'Canada', 'America/Vancouver', '250-555-0102', 'Visitor parking is available behind the building.', true, 'Accounting office.'),
    (site_3, customer_3, 'Cedar Clinic', '315 Cedar Avenue', 'Kamloops', 'British Columbia', 'V2C 3C3', 'Canada', 'America/Vancouver', '250-555-0103', 'Coordinate disruptive network work with the clinic manager.', true, 'Clinic and administration site.'),
    (site_4, customer_4, 'Thompson Ridge Office', '480 Ridge Road', 'Kamloops', 'British Columbia', 'V2C 4D4', 'Canada', 'America/Vancouver', '250-555-0104', 'Call the engineering administrator on arrival.', true, 'Engineering design office.');

  insert into public.customer_contacts (
    customer_id, site_id, first_name, last_name, title, email, phone, mobile,
    is_primary, receives_billing, receives_service_updates, active
  ) values
    (customer_1, site_1, 'Jordan', 'Lee', 'Office Manager', 'jordan.lee@summit.example.com', '250-555-1101', '250-555-2101', true, false, true, true),
    (customer_1, site_1, 'Morgan', 'Reid', 'Accounts Payable', 'accounts@summit.example.com', '250-555-1102', null, false, true, false, true),
    (customer_2, site_2, 'Avery', 'Chen', 'Managing Partner', 'avery.chen@northvalley.example.com', '250-555-1201', '250-555-2201', true, true, true, true),
    (customer_3, site_3, 'Taylor', 'Singh', 'Clinic Manager', 'taylor.singh@cedarhealth.example.com', '250-555-1301', '250-555-2301', true, false, true, true),
    (customer_4, site_4, 'Casey', 'Martin', 'Engineering Administrator', 'casey.martin@thompsonridge.example.com', '250-555-1401', '250-555-2401', true, true, true, true);

  -- Keep the legacy contacts table aligned for older contracts that still read it.
  insert into public.contacts (
    customer_id, site_id, first_name, last_name, email, phone, title, is_primary, active
  ) values
    (customer_1, site_1, 'Jordan', 'Lee', 'jordan.lee@summit.example.com', '250-555-1101', 'Office Manager', true, true),
    (customer_2, site_2, 'Avery', 'Chen', 'avery.chen@northvalley.example.com', '250-555-1201', 'Managing Partner', true, true),
    (customer_3, site_3, 'Taylor', 'Singh', 'taylor.singh@cedarhealth.example.com', '250-555-1301', 'Clinic Manager', true, true),
    (customer_4, site_4, 'Casey', 'Martin', 'casey.martin@thompsonridge.example.com', '250-555-1401', 'Engineering Administrator', true, true);

  insert into public.customer_notes(customer_id, note, created_by) values
    (customer_1, 'Demo account: managed network, firewall and Microsoft 365 support.', actor),
    (customer_2, 'Demo account: tax-season support is business critical.', actor),
    (customer_3, 'Demo account: coordinate outages around clinic hours.', actor),
    (customer_4, 'Demo account: CAD and engineering workstations require high-performance replacement parts.', actor);

  -- ----------------------------------------------------------
  -- FIELD TEAM
  -- Field Team is intentionally auth-backed. Existing active technician users
  -- remain usable; the current Admin is also made a technician for testing.
  -- ----------------------------------------------------------

  insert into public.user_roles(user_id, role)
  values (actor, 'technician')
  on conflict (user_id, role) do nothing;

  for tech in
    select p.id, p.full_name, p.email
    from public.profiles p
    where p.active = true
      and (
        p.id = actor
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = p.id and ur.role = 'technician'
        )
      )
    order by case when p.id = actor then 0 else 1 end, p.created_at
  loop
    tech_count := tech_count + 1;

    insert into public.technician_profiles (
      technician_id, specialty, skill_tags, service_area, shift_start, shift_end,
      employee_number, job_title, employment_type, hire_date, home_base
    ) values (
      tech.id,
      'IT Systems Support',
      array['Network Troubleshooting','Microsoft 365','Hardware & Endpoint Support','Wi-Fi'],
      'Kamloops',
      '07:00',
      '17:00',
      'IT-' || lpad(tech_count::text, 3, '0'),
      case when tech.id = actor then 'Senior IT Systems Technician' else 'IT Support Technician' end,
      'full_time',
      current_date - (365 + tech_count * 45),
      'Kamloops'
    );

    insert into public.technician_compensation (
      technician_id, billing_rate, pay_rate, currency, updated_by
    ) values (
      tech.id,
      case when tech.id = actor then 145.00 else 125.00 end,
      case when tech.id = actor then 42.00 else 35.00 end,
      'CAD',
      actor
    );

    insert into public.technician_skills (
      technician_id, skill_name, proficiency, active, notes, created_by
    ) values
      (tech.id, 'Network Troubleshooting', 'expert', true, 'Demo skill for routing, switching and connectivity incidents.', actor),
      (tech.id, 'Microsoft 365', 'advanced', true, 'Demo skill for Microsoft 365 administration and support.', actor),
      (tech.id, 'Hardware & Endpoint Support', 'advanced', true, 'Demo skill for laptops, desktops, docks and peripherals.', actor),
      (tech.id, 'Wi-Fi', 'advanced', true, 'Demo skill for wireless diagnostics and access-point deployment.', actor);

    insert into public.technician_certifications (
      technician_id, certification_name, issuer, credential_number,
      issued_on, expires_on, active, notes, created_by
    ) values (
      tech.id,
      'CompTIA Network+ (Demo)',
      'CompTIA',
      'DEMO-NET-' || lpad(tech_count::text, 3, '0'),
      current_date - 180,
      current_date + 545,
      true,
      'Demonstration certification only.',
      actor
    );
  end loop;

  -- ----------------------------------------------------------
  -- INVENTORY LOCATIONS + SUPPLIERS + STOCK
  -- ----------------------------------------------------------

  insert into public.inventory_locations (
    id, name, code, location_type, technician_id, vehicle_identifier, active, notes
  ) values
    (warehouse, 'Main IT Warehouse', 'WH-01', 'warehouse', null, null, true, 'Primary parts and consumables stock.'),
    (service_bench, 'Service Bench', 'BENCH-01', 'office', null, null, true, 'Bench stock for repairs and staging.'),
    (tech_van, 'Technician Vehicle 01', 'VAN-01', 'vehicle', actor, 'SERVICE-01', true, 'Mobile stock assigned to the primary test technician.');

  insert into public.inventory_suppliers (
    id, supplier_number, name, contact_name, email, phone, website,
    city, province_state, country, payment_terms_days, notes, active
  ) values
    (supplier_1, 'SUP-DEMO-01', 'Pacific IT Distribution (Demo)', 'Sales Desk', 'sales@pacificit.example.com', '604-555-3001', 'https://pacificit.example.com', 'Vancouver', 'British Columbia', 'Canada', 30, 'Demo technology distributor.', true),
    (supplier_2, 'SUP-DEMO-02', 'Interior Network Supply (Demo)', 'Order Desk', 'orders@interiornetwork.example.com', '250-555-3002', 'https://interiornetwork.example.com', 'Kamloops', 'British Columbia', 'Canada', 30, 'Demo cabling and network supplier.', true);

  insert into public.inventory_items (
    id, sku, part_number, barcode, name, description, category, manufacturer,
    unit, unit_cost, unit_price, reorder_level, reorder_quantity, taxable,
    track_stock, preferred_supplier_id, notes, active
  ) values
    (item_cat6, 'CAB-CAT6-2M', 'CAT6-2M-BLU', '900000000001', 'Cat6 Patch Cable - 2 m', '2 metre Cat6 Ethernet patch cable.', 'Cabling', 'Generic', 'each', 4.50, 12.00, 15, 30, true, true, supplier_2, 'Common field replacement cable.', true),
    (item_keystone, 'NET-KEY-CAT6', 'KEY-CAT6', '900000000002', 'Cat6 Keystone Jack', 'Tool-less Cat6 keystone jack.', 'Cabling', 'Generic', 'each', 3.10, 9.50, 12, 24, true, true, supplier_2, 'Structured cabling stock.', true),
    (item_hdmi, 'CAB-HDMI-2M', 'HDMI-2M', '900000000003', 'HDMI Cable - 2 m', 'High-speed HDMI cable.', 'Cabling', 'Generic', 'each', 8.00, 19.00, 8, 16, true, true, supplier_1, 'Display and meeting-room stock.', true),
    (item_usbc, 'ADP-USBC-HDMI', 'USBC-HDMI', '900000000004', 'USB-C to HDMI Adapter', 'USB-C display adapter.', 'Adapters', 'Generic', 'each', 22.00, 45.00, 4, 8, true, true, supplier_1, 'Laptop display adapter.', true),
    (item_nvme, 'SSD-NVME-1TB', 'NVME-1TB', '900000000005', '1 TB NVMe SSD', '1 TB PCIe NVMe replacement SSD.', 'Storage', 'Kingston', 'each', 95.00, 159.00, 3, 6, true, true, supplier_1, 'Endpoint replacement storage.', true),
    (item_ram, 'RAM-DDR5-16', 'DDR5-SODIMM-16', '900000000006', '16 GB DDR5 SODIMM', '16 GB laptop DDR5 memory module.', 'Memory', 'Crucial', 'each', 55.00, 95.00, 4, 8, true, true, supplier_1, 'Laptop memory upgrade stock.', true),
    (item_patchpanel, 'NET-PANEL-24', 'PP-CAT6-24', '900000000007', '24-Port Cat6 Patch Panel', 'Rack-mount 24-port Cat6 patch panel.', 'Network', 'Generic', 'each', 68.00, 119.00, 2, 4, true, true, supplier_2, 'Network cabinet deployment stock.', true),
    (item_faceplate, 'CAB-FACE-2P', 'FACE-2P', '900000000008', '2-Port Network Faceplate', 'Two-port wall faceplate.', 'Cabling', 'Generic', 'each', 2.40, 7.50, 10, 20, true, true, supplier_2, 'Structured cabling finishing stock.', true),
    (item_poe, 'PWR-POE-30W', 'POE-30W', '900000000009', '30W PoE Injector', 'Gigabit 30W Power-over-Ethernet injector.', 'Network', 'Ubiquiti', 'each', 24.00, 49.00, 3, 6, true, true, supplier_1, 'AP and camera power replacement.', true),
    (item_adapter, 'PWR-USBC-65W', 'USBC-65W', '900000000010', '65W USB-C Power Adapter', '65W USB-C laptop power adapter.', 'Power', 'Generic', 'each', 28.00, 59.00, 5, 10, true, true, supplier_1, 'Universal field replacement charger.', true);

  insert into public.inventory_item_suppliers (
    inventory_item_id, supplier_id, supplier_sku, last_unit_cost, lead_time_days, preferred, active
  ) values
    (item_cat6, supplier_2, 'INS-CAT6-2M', 4.50, 2, true, true),
    (item_keystone, supplier_2, 'INS-KEY-CAT6', 3.10, 2, true, true),
    (item_hdmi, supplier_1, 'PIT-HDMI-2', 8.00, 3, true, true),
    (item_usbc, supplier_1, 'PIT-USBC-HDMI', 22.00, 3, true, true),
    (item_nvme, supplier_1, 'PIT-NVME-1TB', 95.00, 3, true, true),
    (item_ram, supplier_1, 'PIT-DDR5-16', 55.00, 3, true, true),
    (item_patchpanel, supplier_2, 'INS-PP24', 68.00, 2, true, true),
    (item_faceplate, supplier_2, 'INS-FACE2', 2.40, 2, true, true),
    (item_poe, supplier_1, 'PIT-POE30', 24.00, 3, true, true),
    (item_adapter, supplier_1, 'PIT-USBC65', 28.00, 3, true, true);

  -- Positive adjustment entries establish opening stock without creating a PO.
  insert into public.inventory_transactions (
    inventory_item_id, location_id, transaction_type, quantity, unit_cost,
    reference, notes, created_by
  ) values
    (item_cat6, warehouse, 'adjustment', 50, 4.50, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_keystone, warehouse, 'adjustment', 40, 3.10, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_hdmi, warehouse, 'adjustment', 20, 8.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_usbc, warehouse, 'adjustment', 10, 22.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_nvme, warehouse, 'adjustment', 6, 95.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_ram, warehouse, 'adjustment', 8, 55.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_patchpanel, warehouse, 'adjustment', 4, 68.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_faceplate, warehouse, 'adjustment', 24, 2.40, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_poe, warehouse, 'adjustment', 6, 24.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_adapter, warehouse, 'adjustment', 12, 28.00, 'DEMO-OPENING', 'Opening IT demo stock.', actor),
    (item_cat6, tech_van, 'adjustment', 10, 4.50, 'DEMO-VAN', 'Opening mobile demo stock.', actor),
    (item_hdmi, tech_van, 'adjustment', 3, 8.00, 'DEMO-VAN', 'Opening mobile demo stock.', actor),
    (item_usbc, tech_van, 'adjustment', 2, 22.00, 'DEMO-VAN', 'Opening mobile demo stock.', actor),
    (item_adapter, tech_van, 'adjustment', 2, 28.00, 'DEMO-VAN', 'Opening mobile demo stock.', actor);

  -- ----------------------------------------------------------
  -- SERIALIZED ASSETS
  -- ----------------------------------------------------------

  insert into public.assets (
    id, asset_tag, asset_name, serial_number, asset_type, category, manufacturer,
    model, description, ownership, customer_id, site_id, assigned_to,
    inventory_location_id, status, condition, purchase_date, purchase_cost,
    replacement_cost, purchase_vendor, warranty_expires_on, in_service_date,
    next_service_date, notes
  ) values
    (asset_service_laptop, 'DEMO-AST-001', 'Service Laptop 01', 'DEMO-DL5550-001', 'laptop', 'Computer', 'Dell', 'Latitude 5550', 'Primary field-service laptop.', 'company', null, null, actor, tech_van, 'assigned', 'excellent', current_date - 120, 1650, 1900, 'Pacific IT Distribution (Demo)', current_date + 975, current_date - 110, current_date + 250, 'Assigned to the primary test technician.'),
    (asset_network_tester, 'DEMO-AST-002', 'Network Tester 01', 'DEMO-LIQ-002', 'network_tester', 'Diagnostic Tool', 'Fluke Networks', 'LinkIQ', 'Cable and network qualification tester.', 'company', null, null, actor, tech_van, 'assigned', 'excellent', current_date - 240, 2850, 3200, 'Interior Network Supply (Demo)', current_date + 490, current_date - 230, current_date + 120, 'Field diagnostic tool.'),
    (asset_tablet, 'DEMO-AST-003', 'Diagnostic Tablet 01', 'DEMO-TAB-003', 'tablet', 'Computer', 'Samsung', 'Galaxy Tab Active', 'Rugged service tablet.', 'company', null, null, null, warehouse, 'available', 'good', current_date - 300, 950, 1100, 'Pacific IT Distribution (Demo)', current_date + 430, current_date - 290, current_date + 180, 'Available for field assignment.'),
    (asset_label_printer, 'DEMO-AST-004', 'Network Label Printer 01', 'DEMO-PTE550-004', 'label_printer', 'Tool', 'Brother', 'PT-E550W', 'Portable network and cable label printer.', 'company', null, null, null, service_bench, 'available', 'good', current_date - 420, 475, 525, 'Interior Network Supply (Demo)', null, current_date - 410, current_date + 90, 'Stored at service bench.'),
    (asset_loaner, 'DEMO-AST-005', 'Loaner Laptop 01', 'DEMO-TP-E16-005', 'laptop', 'Loaner', 'Lenovo', 'ThinkPad E16', 'Customer loaner laptop.', 'company', null, null, null, warehouse, 'available', 'excellent', current_date - 75, 1350, 1550, 'Pacific IT Distribution (Demo)', current_date + 1020, current_date - 70, null, 'Available loaner device.'),
    (asset_firewall, 'DEMO-AST-006', 'Spare Firewall Appliance 01', 'DEMO-FG60F-006', 'firewall', 'Network Appliance', 'Fortinet', 'FortiGate 60F', 'Spare managed firewall appliance.', 'company', null, null, null, warehouse, 'available', 'good', current_date - 500, 980, 1200, 'Pacific IT Distribution (Demo)', null, current_date - 490, current_date + 150, 'Spare network appliance.'),
    (asset_customer_firewall, 'DEMO-AST-007', 'Summit Main Firewall', 'DEMO-SUM-FW-007', 'firewall', 'Customer Network', 'Fortinet', 'FortiGate 60F', 'Customer-owned production firewall.', 'customer', customer_1, site_1, null, null, 'in_use', 'good', current_date - 700, null, 1200, null, null, current_date - 690, current_date + 60, 'Managed customer asset.'),
    (asset_customer_workstation, 'DEMO-AST-008', 'Engineering Workstation 01', 'DEMO-TR-WKS-008', 'workstation', 'Customer Computer', 'Dell', 'Precision 3680', 'Customer-owned CAD workstation.', 'customer', customer_4, site_4, null, null, 'in_use', 'excellent', current_date - 210, null, 3200, null, null, current_date - 200, null, 'Managed customer endpoint.');

  insert into public.asset_history (
    asset_id, event_type, to_user_id, to_customer_id, to_site_id, to_location_id,
    to_status, notes, details, created_by
  ) values
    (asset_service_laptop, 'assigned', actor, null, null, tech_van, 'assigned', 'Initial IT demo assignment.', jsonb_build_object('seed','it_demo'), actor),
    (asset_network_tester, 'assigned', actor, null, null, tech_van, 'assigned', 'Initial IT demo assignment.', jsonb_build_object('seed','it_demo'), actor),
    (asset_customer_firewall, 'customer_asset_registered', null, customer_1, site_1, null, 'in_use', 'Initial managed customer asset.', jsonb_build_object('seed','it_demo'), actor),
    (asset_customer_workstation, 'customer_asset_registered', null, customer_4, site_4, null, 'in_use', 'Initial managed customer asset.', jsonb_build_object('seed','it_demo'), actor);

  insert into public.asset_maintenance (
    asset_id, maintenance_type, status, title, description, provider,
    scheduled_date, notes, created_by
  ) values
    (asset_network_tester, 'calibration', 'planned', 'Annual calibration check', 'Verify tester calibration and firmware.', 'Internal IT', current_date + 120, 'Demo planned maintenance.', actor),
    (asset_customer_firewall, 'inspection', 'planned', 'Quarterly firewall health review', 'Review firmware, backup and security status.', 'Internal IT', current_date + 60, 'Demo customer asset maintenance.', actor);

  select count(*)::integer into customer_count from public.customers;
  select count(*)::integer into inventory_count from public.inventory_items;
  select count(*)::integer into asset_count from public.assets;

  insert into public.fieldops_settings_audit(event_type, details, created_by)
  values (
    'it_demo_data_reset',
    jsonb_build_object(
      'customers', customer_count,
      'inventory_items', inventory_count,
      'assets', asset_count,
      'technicians', tech_count,
      'work_orders', 0,
      'invoices', 0
    ),
    actor
  );

  return jsonb_build_object(
    'customers', customer_count,
    'inventory_items', inventory_count,
    'assets', asset_count,
    'technicians', tech_count,
    'work_orders', 0,
    'invoices', 0
  );
end;
$$;

revoke all on function public.fieldops_reset_it_demo_data() from public;
grant execute on function public.fieldops_reset_it_demo_data() to authenticated;

commit;
