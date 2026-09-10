"use client";
import { X } from "lucide-react";
import type { CustomerSummaryView, DbCustomer, DbSite, DbWorkOrder } from "../../types";
import { openWorkOrderStatuses } from "../../constants";
import { capitalize, customerStatusTone } from "../../utils";

export function CustomerSummaryModal({ view, customers, sites, workOrders, onOpenCustomer, onClose }: {
  view: CustomerSummaryView | null;
  customers: DbCustomer[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  onOpenCustomer: (customerId: string) => void;
  onClose: () => void;
}) {
  if (!view) return null;
  const title = view === "all" ? "All Customers" : view === "active" ? "Active Customers" : view === "open_work" ? "Open Work Orders by Customer" : "Service Sites by Customer";

  const rows = customers.map((customer) => {
    const siteCount = sites.filter((s) => s.customer_id === customer.id).length;
    const openCount = workOrders.filter((o) => o.customer_id === customer.id && openWorkOrderStatuses.has(o.status)).length;
    return { customer, siteCount, openCount };
  }).filter((row) => {
    if (view === "active") return row.customer.status === "active";
    if (view === "open_work") return row.openCount > 0;
    if (view === "sites") return row.siteCount > 0;
    return true;
  }).sort((a,b) => a.customer.name.localeCompare(b.customer.name));

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close summary" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><div className="text-xs font-semibold text-primary">Customers</div><h2 className="mt-1 text-xl font-black">{title}</h2></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No records match this summary.</div> : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <button key={row.customer.id} type="button" onClick={() => { onClose(); onOpenCustomer(row.customer.id); }} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-row-hover">
                  <div><div className="text-sm font-black">{row.customer.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{row.siteCount} site{row.siteCount === 1 ? "" : "s"} · {row.openCount} open work order{row.openCount === 1 ? "" : "s"}</div></div>
                  <span className={`border px-2 py-1 text-[8px] font-black uppercase ${customerStatusTone(row.customer.status)}`}>{capitalize(row.customer.status)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
