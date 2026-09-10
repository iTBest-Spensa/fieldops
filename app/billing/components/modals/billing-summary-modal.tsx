"use client";
import { ChevronRight } from "lucide-react";
import type { BillingSummaryView, DbCustomer, DbInvoice, DbWorkOrder } from "../../types";
import { invoiceStatusLabels } from "../../constants";
import { effectiveInvoiceStatus, money, statusTone } from "../../utils";
import { ModalShell } from "../modal-shell";

export function BillingSummaryModal({ view, workOrders, invoices, customers, today, onClose, onOpenInvoice }: {
  view: BillingSummaryView | null;
  workOrders: DbWorkOrder[];
  invoices: DbInvoice[];
  customers: DbCustomer[];
  today: string | null;
  onClose: () => void;
  onOpenInvoice: (invoiceId: string) => void;
}) {
  if (!view) return null;
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const title = view === "ready" ? "Billing Ready" : view === "draft" ? "Draft Invoices" : view === "outstanding" ? "Outstanding Balances" : "Overdue Balances";
  const invoiceRows = view === "draft" ? invoices.filter((invoice) => invoice.status === "draft") : view === "outstanding" ? invoices.filter((invoice) => invoice.status !== "void" && invoice.balance_due > 0) : view === "overdue" ? invoices.filter((invoice) => effectiveInvoiceStatus(invoice, today) === "overdue") : [];
  return <ModalShell title={title} eyebrow="Billing summary" onClose={onClose} width="max-w-5xl">
    {view === "ready" ? <div className="divide-y divide-border border border-border">{workOrders.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No work orders are waiting for billing.</div> : workOrders.map((wo) => <div key={wo.id} className="grid gap-2 p-4 md:grid-cols-[150px_1fr_1fr_150px]"><div className="text-xs font-black text-primary">{wo.work_order_number}</div><div><div className="text-sm font-bold">{wo.title}</div><div className="text-xs text-muted-foreground">{customerMap.get(wo.customer_id)?.name ?? "Unknown customer"}</div></div><div className="text-xs text-muted-foreground">{wo.billing_status === "review_required" ? "Previously billed data changed; review required" : "Ready for invoice"}</div><div className="text-right text-xs font-black">{wo.billing_status === "review_required" ? "REVIEW" : "READY"}</div></div>)}</div> : <div className="divide-y divide-border border border-border">{invoiceRows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No invoices are currently in this group.</div> : invoiceRows.map((invoice) => { const status = effectiveInvoiceStatus(invoice, today); return <button key={invoice.id} type="button" onClick={() => onOpenInvoice(invoice.id)} className="grid w-full gap-3 p-4 text-left hover:bg-muted/30 md:grid-cols-[150px_1fr_150px_150px_30px]"><div className="text-sm font-black text-primary">{invoice.invoice_number}</div><div><div className="text-sm font-bold">{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Unknown customer"}</div><div className="text-xs text-muted-foreground">{invoice.billing_email_snapshot || "No billing email"}</div></div><div><span className={`px-2 py-1 text-[10px] font-black uppercase ${statusTone(status)}`}>{invoiceStatusLabels[status] ?? status}</span></div><div className="text-right"><div className="text-sm font-black">{money(view === "outstanding" || view === "overdue" ? invoice.balance_due : invoice.total, invoice.currency)}</div><div className="text-[10px] text-muted-foreground">{view === "outstanding" || view === "overdue" ? "Balance" : "Total"}</div></div><ChevronRight className="mt-1 h-4 w-4 text-primary" /></button>; })}</div>}
  </ModalShell>;
}
