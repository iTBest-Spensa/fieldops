export type BillingSection = "ready" | "invoices" | "payments";
export type BillingSummaryView = "ready" | "draft" | "outstanding" | "overdue";
export type InvoiceTab = "overview" | "edit" | "activity";

export type DbCustomer = {
  id: string;
  name: string;
  billing_email: string | null;
  billing_terms_days: number;
  tax_exempt: boolean;
  status: string;
};

export type DbSite = {
  id: string;
  customer_id: string;
  name: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string | null;
};

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  title: string;
  status: string;
  billing_status: string | null;
  billing_ready_at: string | null;
  billed_at: string | null;
  customer_po: string | null;
  completed_at: string | null;
  closed_at: string | null;
  travel_distance_km: number;
};


export type DbBillingSettings = {
  company_name: string;
  legal_name: string | null;
  logo_path: string | null;
  business_number: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string;
  invoice_footer: string | null;
  minimum_billable_minutes: number;
  travel_billing_mode: "time" | "distance" | "none";
  travel_hourly_rate: number | null;
  travel_per_km_rate: number;
};

export type DbInventoryItem = { id:string; name:string; sku:string|null; unit:string; unit_cost:number; unit_price:number; active:boolean; };
export type DbInventoryLocation = { id:string; name:string; location_type:string; active:boolean; };
export type DbMaterialUsage = { id:string; work_order_id:string; inventory_item_id:string|null; description:string; quantity:number; quantity_returned:number; unit_cost:number; unit_price:number; billable:boolean; recorded_by:string|null; created_at:string; };

export type DbInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  site_id: string | null;
  work_order_id: string | null;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  tax_rate: number;
  discount_amount: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  currency: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  billing_email_snapshot: string | null;
  customer_name_snapshot: string | null;
  site_address_snapshot: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbInvoiceItem = {
  id: string;
  invoice_id: string;
  work_order_id: string | null;
  line_type: "labour" | "material" | "service" | "travel" | "equipment" | "other";
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  source_type: string | null;
  source_id: string | null;
  taxable: boolean;
  created_at: string;
};

export type DbPayment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string | null;
  received_at: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
};

export type DbInvoiceAdjustment = {
  id: string;
  invoice_id: string;
  adjustment_type: "credit" | "charge";
  amount: number;
  reason: string;
  notes: string | null;
  status: "posted" | "void";
  created_by: string | null;
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
};

export type DbInvoiceEvent = {
  id: string;
  invoice_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type DbRole = { user_id: string; role: string };

export type PaymentForm = {
  amount: string;
  method: "cash" | "tap";
  receivedAt: string;
  reference: string;
  notes: string;
};

export type InvoiceTermsForm = {
  issuedDate: string;
  dueDate: string;
  taxRatePercent: string;
  discountAmount: string;
  billingEmail: string;
  notes: string;
};

export type ManualChargeForm = {
  lineType: "service" | "travel" | "equipment" | "other";
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
};

export type AdjustmentForm = {
  adjustmentType: "credit" | "charge";
  amount: string;
  reason: string;
  notes: string;
};

export type DbInventoryTransaction = { inventory_item_id:string; location_id:string|null; quantity:number; };
