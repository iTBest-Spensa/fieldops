export type SettingsSection =
  | "company"
  | "operations"
  | "billing"
  | "inventory"
  | "access"
  | "appearance"
  | "audit";

export type DbSettings = {
  id: number;
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
  timezone: string;
  currency: string;
  locale: string;
  date_format: string;
  time_format: string;
  default_work_order_duration_minutes: number;
  default_payment_terms_days: number;
  default_tax_rate: number;
  default_customer_billing_rate: number;
  default_technician_pay_rate: number;
  minimum_billable_minutes: number;
  travel_billing_mode: "time" | "distance" | "none";
  travel_hourly_rate: number | null;
  travel_per_km_rate: number;
  invoice_footer: string | null;
  po_approval_required: boolean;
  low_stock_monitoring_enabled: boolean;
  reconciliation_reason_required: boolean;
  certification_alert_days: number;
  asset_warranty_alert_days: number;
  unassigned_work_order_alert_enabled: boolean;
  overdue_invoice_alert_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SettingsForm = {
  companyName: string;
  legalName: string;
  logoPath: string;
  businessNumber: string;
  phone: string;
  email: string;
  website: string;
  address1: string;
  address2: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  timezone: string;
  currency: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  defaultWorkOrderDurationMinutes: string;
  defaultPaymentTermsDays: string;
  defaultTaxRatePercent: string;
  defaultCustomerBillingRate: string;
  defaultTechnicianPayRate: string;
  minimumBillableMinutes: string;
  travelBillingMode: "time" | "distance" | "none";
  travelHourlyRate: string;
  travelPerKmRate: string;
  invoiceFooter: string;
  poApprovalRequired: boolean;
  lowStockMonitoringEnabled: boolean;
  reconciliationReasonRequired: boolean;
  certificationAlertDays: string;
  assetWarrantyAlertDays: string;
  unassignedWorkOrderAlertEnabled: boolean;
  overdueInvoiceAlertEnabled: boolean;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbRole = {
  user_id: string;
  role: string;
  created_at: string;
};

export type DbSettingsAudit = {
  id: string;
  event_type: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
};

export type AccessUser = DbProfile & { roles: string[] };
