import type { CustomerStatus, DbCustomer, DbCustomerContact, DbWorkOrder } from "./types";

export function capitalize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function customerStatusTone(status: CustomerStatus) {
  switch (status) {
    case "active":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "prospect":
      return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    case "on_hold":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-300";
  }
}

export function workOrderStatusTone(status: string) {
  if (status === "closed") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (status === "cancelled") return "border-slate-500/40 bg-slate-500/10 text-slate-500";
  if (["working", "on_site", "travelling"].includes(status)) {
    return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400";
  }
  if (status === "billing_ready") {
    return "border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
  }
  return "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400";
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function fullContactName(contact: DbCustomerContact) {
  return `${contact.first_name} ${contact.last_name}`.trim();
}

export function customerLocation(customer: DbCustomer) {
  return [customer.city, customer.province_state, customer.country].filter(Boolean).join(", ") || "No billing location";
}

export function customerAddress(customer: DbCustomer) {
  return [
    customer.address1, customer.address2, customer.city, customer.province_state,
    customer.postal_code, customer.country,
  ].filter(Boolean).join(", ") || "No billing address";
}

export function workOrderSortTime(order: DbWorkOrder) {
  return new Date(
    order.closed_at ?? order.completed_at ?? order.scheduled_start ?? order.requested_at
  ).getTime();
}

export function parseTags(value: string) {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean)));
}

export function customerAccountLabel(customer: DbCustomer) {
  return customer.account_number ?? `CUS-${customer.id.slice(0, 8).toUpperCase()}`;
}
