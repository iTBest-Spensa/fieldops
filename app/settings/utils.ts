import type { DbSettings, SettingsForm } from "./types";

export function settingsToForm(settings: DbSettings): SettingsForm {
  return {
    companyName: settings.company_name ?? "FieldOps",
    legalName: settings.legal_name ?? "",
    businessNumber: settings.business_number ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    website: settings.website ?? "",
    address1: settings.address1 ?? "",
    address2: settings.address2 ?? "",
    city: settings.city ?? "",
    provinceState: settings.province_state ?? "",
    postalCode: settings.postal_code ?? "",
    country: settings.country ?? "Canada",
    timezone: settings.timezone ?? "America/Vancouver",
    currency: settings.currency ?? "CAD",
    locale: settings.locale ?? "en-CA",
    dateFormat: settings.date_format ?? "yyyy-mm-dd",
    timeFormat: settings.time_format ?? "12h",
    defaultWorkOrderDurationMinutes: String(settings.default_work_order_duration_minutes ?? 60),
    defaultPaymentTermsDays: String(settings.default_payment_terms_days ?? 30),
    defaultTaxRatePercent: String(Number(settings.default_tax_rate ?? 0) * 100),
    invoiceFooter: settings.invoice_footer ?? "",
    poApprovalRequired: settings.po_approval_required ?? false,
    lowStockMonitoringEnabled: settings.low_stock_monitoring_enabled ?? true,
    reconciliationReasonRequired: settings.reconciliation_reason_required ?? true,
    certificationAlertDays: String(settings.certification_alert_days ?? 30),
    assetWarrantyAlertDays: String(settings.asset_warranty_alert_days ?? 30),
    unassignedWorkOrderAlertEnabled: settings.unassigned_work_order_alert_enabled ?? true,
    overdueInvoiceAlertEnabled: settings.overdue_invoice_alert_enabled ?? true,
  };
}

export function cleanNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}
