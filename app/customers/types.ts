export type CustomerStatus = "active" | "inactive" | "prospect" | "on_hold";
export type CustomerType = "business" | "residential" | "nonprofit" | "government" | "other";

export type DbCustomer = {
  id: string;
  name: string;
  account_number: string | null;
  status: CustomerStatus;
  customer_type: CustomerType;
  phone: string | null;
  email: string | null;
  website: string | null;
  billing_email: string | null;
  billing_terms_days: number;
  tax_exempt: boolean;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  phone: string | null;
  instructions: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type DbCustomerContact = {
  id: string;
  customer_id: string;
  site_id: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  receives_billing: boolean;
  receives_service_updates: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCustomerNote = {
  id: string;
  customer_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  requested_at: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  closed_at: string | null;
  billing_status: string | null;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type DbRole = {
  user_id: string;
  role: string;
};

export type CustomerDetailTab = "overview" | "contacts" | "sites" | "work_orders" | "notes";
export type CustomerSummaryView = "all" | "active" | "open_work" | "sites";

export type CustomerForm = {
  name: string;
  accountNumber: string;
  status: CustomerStatus;
  customerType: CustomerType;
  phone: string;
  email: string;
  website: string;
  billingEmail: string;
  billingTermsDays: string;
  taxExempt: boolean;
  address1: string;
  address2: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  tags: string;
  notes: string;
  primaryFirstName: string;
  primaryLastName: string;
  primaryTitle: string;
  primaryEmail: string;
  primaryPhone: string;
};

export type SiteForm = {
  name: string;
  address1: string;
  address2: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  phone: string;
  instructions: string;
  active: boolean;
};

export type ContactForm = {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  siteId: string;
  isPrimary: boolean;
  receivesBilling: boolean;
  receivesServiceUpdates: boolean;
  active: boolean;
};
