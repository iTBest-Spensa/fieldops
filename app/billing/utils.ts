import type { DbInvoice } from "./types";

export function money(value: number | null | undefined, currency = "CAD") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function effectiveInvoiceStatus(invoice: DbInvoice, today: string | null) {
  if (invoice.status === "void" || invoice.status === "paid" || invoice.status === "partial") {
    return invoice.status;
  }
  if (
    today &&
    invoice.due_date &&
    invoice.due_date < today &&
    invoice.balance_due > 0 &&
    ["approved", "ready", "sent", "overdue"].includes(invoice.status)
  ) {
    return "overdue";
  }
  return invoice.status;
}

export function statusTone(status: string) {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "partial") return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (status === "overdue") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (status === "sent") return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  if (status === "approved" || status === "ready") return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
  if (status === "void") return "bg-slate-500/15 text-slate-600 dark:text-slate-300";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

export function numberOrNaN(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

export function localDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
