import type { SettingsForm } from "./types";

export const allowedRoles = [
  "admin",
  "manager",
  "dispatcher",
  "technician",
  "billing",
  "inventory",
] as const;

export const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  dispatcher: "Dispatcher",
  technician: "Technician",
  billing: "Billing",
  inventory: "Inventory",
};

export const timezones = [
  "America/Vancouver",
  "America/Edmonton",
  "America/Regina",
  "America/Winnipeg",
  "America/Toronto",
  "America/Halifax",
  "America/St_Johns",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Africa/Dar_es_Salaam",
  "UTC",
];

export const currencies = ["CAD", "USD", "TZS", "EUR", "GBP"];

export const emptySettingsForm: SettingsForm = {
  companyName: "FieldOps",
  legalName: "",
  businessNumber: "",
  phone: "",
  email: "",
  website: "",
  address1: "",
  address2: "",
  city: "",
  provinceState: "",
  postalCode: "",
  country: "Canada",
  timezone: "America/Vancouver",
  currency: "CAD",
  locale: "en-CA",
  dateFormat: "yyyy-mm-dd",
  timeFormat: "12h",
  defaultWorkOrderDurationMinutes: "60",
  defaultPaymentTermsDays: "30",
  defaultTaxRatePercent: "0",
  invoiceFooter: "",
  poApprovalRequired: false,
  lowStockMonitoringEnabled: true,
  reconciliationReasonRequired: true,
  certificationAlertDays: "30",
  assetWarrantyAlertDays: "30",
  unassignedWorkOrderAlertEnabled: true,
  overdueInvoiceAlertEnabled: true,
};
