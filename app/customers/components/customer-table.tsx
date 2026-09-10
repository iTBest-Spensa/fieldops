"use client";

import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import type { DbCustomer, DbCustomerContact, DbSite, DbWorkOrder } from "../types";
import {
  capitalize, customerAccountLabel, customerLocation, customerStatusTone,
  formatDate, fullContactName, workOrderSortTime,
} from "../utils";
import { openWorkOrderStatuses } from "../constants";

export function CustomerTable({
  customers, contacts, sites, workOrders, onOpen,
}: {
  customers: DbCustomer[];
  contacts: DbCustomerContact[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  onOpen: (customerId: string) => void;
}) {
  if (customers.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No customers match the current search or filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[1050px] border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b border-border px-4 py-3">Customer</th>
            <th className="border-b border-border px-4 py-3">Primary Contact</th>
            <th className="border-b border-border px-4 py-3">Location</th>
            <th className="border-b border-border px-4 py-3">Sites</th>
            <th className="border-b border-border px-4 py-3">Open Work</th>
            <th className="border-b border-border px-4 py-3">Last Service</th>
            <th className="border-b border-border px-4 py-3">Status</th>
            <th className="border-b border-border px-4 py-3 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const customerContacts = contacts.filter((c) => c.customer_id === customer.id && c.active);
            const primary = customerContacts.find((c) => c.is_primary) ?? customerContacts[0] ?? null;
            const customerSites = sites.filter((s) => s.customer_id === customer.id);
            const customerOrders = workOrders.filter((o) => o.customer_id === customer.id);
            const openOrders = customerOrders.filter((o) => openWorkOrderStatuses.has(o.status));
            const lastService = [...customerOrders].sort((a, b) => workOrderSortTime(b) - workOrderSortTime(a))[0] ?? null;

            return (
              <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-row-hover">
                <td className="px-4 py-4">
                  <button type="button" onClick={() => onOpen(customer.id)} className="text-left">
                    <div className="text-sm font-black hover:text-primary">{customer.name}</div>
                    <div className="mt-1 text-[10px] font-semibold text-muted-foreground">
                      {customerAccountLabel(customer)} · {capitalize(customer.customer_type)}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-4">
                  {primary ? (
                    <div>
                      <div className="text-xs font-bold">{fullContactName(primary)}</div>
                      <div className="mt-1 flex flex-col gap-1 text-[10px] text-muted-foreground">
                        {primary.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{primary.phone}</span>}
                        {primary.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{primary.email}</span>}
                      </div>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">No contact</span>}
                </td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />{customerLocation(customer)}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-bold">{customerSites.length}</td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-black ${openOrders.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {openOrders.length}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {lastService
                    ? `${lastService.work_order_number} · ${formatDate(lastService.closed_at ?? lastService.completed_at ?? lastService.requested_at)}`
                    : "No work history"}
                </td>
                <td className="px-4 py-4">
                  <span className={`border px-2 py-1 text-[9px] font-black uppercase ${customerStatusTone(customer.status)}`}>
                    {capitalize(customer.status)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <button type="button" onClick={() => onOpen(customer.id)} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
