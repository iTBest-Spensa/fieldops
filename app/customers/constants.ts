import type { ContactForm, CustomerForm, SiteForm } from "./types";

export const customerStatuses = ["active", "inactive", "prospect", "on_hold"] as const;
export const customerTypes = ["business", "residential", "nonprofit", "government", "other"] as const;

export const emptyCustomerForm: CustomerForm = {
  name: "",
  accountNumber: "",
  status: "active",
  customerType: "business",
  phone: "",
  email: "",
  website: "",
  billingEmail: "",
  billingTermsDays: "30",
  taxExempt: false,
  address1: "",
  address2: "",
  city: "",
  provinceState: "",
  postalCode: "",
  country: "Canada",
  tags: "",
  notes: "",
  primaryFirstName: "",
  primaryLastName: "",
  primaryTitle: "",
  primaryEmail: "",
  primaryPhone: "",
};

export const emptySiteForm: SiteForm = {
  name: "",
  address1: "",
  address2: "",
  city: "",
  provinceState: "",
  postalCode: "",
  country: "Canada",
  phone: "",
  instructions: "",
  active: true,
};

export const emptyContactForm: ContactForm = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  mobile: "",
  siteId: "",
  isPrimary: false,
  receivesBilling: false,
  receivesServiceUpdates: true,
  active: true,
};

export const openWorkOrderStatuses = new Set([
  "requested", "planned", "assigned", "travelling", "on_site",
  "working", "waiting", "finished", "billing_ready",
]);
