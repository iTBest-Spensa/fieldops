"use client";
import { ChevronRight, FilePlus2 } from "lucide-react";
import type { DbCustomer, DbInvoice, DbSite, DbWorkOrder } from "../types";
import { formatDateTime } from "../utils";

export function BillingReadyTable({ workOrders, customers, sites, invoices, onCreate, onOpenInvoice, canManageBilling }: {
  workOrders: DbWorkOrder[];
  customers: DbCustomer[];
  sites: DbSite[];
  invoices: DbInvoice[];
  onCreate: (workOrder: DbWorkOrder) => void;
  onOpenInvoice: (invoiceId: string) => void;
  canManageBilling: boolean;
}) {
  const customerMap = new Map(customers.map((item) => [item.id, item]));
  const siteMap = new Map(sites.map((item) => [item.id, item]));
  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[920px] text-left">
        <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Work Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Billing State</th><th className="px-4 py-3">Ready Since</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
        <tbody className="divide-y divide-border">
          {workOrders.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No work orders are waiting for billing.</td></tr> : workOrders.map((wo) => {
            const existing = invoices.find((invoice) => invoice.work_order_id === wo.id && invoice.status !== "void");
            const site = wo.site_id ? siteMap.get(wo.site_id) : null;
            return <tr key={wo.id} className="hover:bg-muted/30">
              <td className="px-4 py-3"><div className="text-xs font-black text-primary">{wo.work_order_number}</div><div className="mt-0.5 text-sm font-bold">{wo.title}</div></td>
              <td className="px-4 py-3 text-sm font-semibold">{customerMap.get(wo.customer_id)?.name ?? "Unknown customer"}</td>
              <td className="px-4 py-3 text-sm">{site?.name ?? "—"}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 text-[10px] font-black uppercase ${wo.billing_status === "review_required" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{wo.billing_status === "review_required" ? "Review required" : "Ready"}</span></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(wo.billing_ready_at)}</td>
              <td className="px-4 py-3 text-right">{existing ? <button type="button" onClick={() => onOpenInvoice(existing.id)} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">Open {existing.invoice_number}<ChevronRight className="h-3.5 w-3.5" /></button> : canManageBilling ? <button type="button" onClick={() => onCreate(wo)} className="inline-flex items-center gap-2 bg-primary px-3 py-2 text-xs font-black text-primary-foreground"><FilePlus2 className="h-4 w-4" /> Create Invoice</button> : <span className="text-[10px] font-bold uppercase text-muted-foreground">Read only</span>}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
