"use client";
import { ChevronRight } from "lucide-react";
import type { DbCustomer, DbInvoice } from "../types";
import { effectiveInvoiceStatus, formatDate, money, statusTone } from "../utils";
import { invoiceStatusLabels } from "../constants";

export function InvoicesTable({ invoices, customers, today, onOpen }: { invoices: DbInvoice[]; customers: DbCustomer[]; today: string | null; onOpen: (id: string) => void }) {
  const customerMap = new Map(customers.map((item) => [item.id, item]));
  return <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[980px] text-left">
    <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3"></th></tr></thead>
    <tbody className="divide-y divide-border">{invoices.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No invoices found.</td></tr> : invoices.map((invoice) => { const status = effectiveInvoiceStatus(invoice, today); return <tr key={invoice.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onOpen(invoice.id)}>
      <td className="px-4 py-3 text-sm font-black text-primary">{invoice.invoice_number}</td><td className="px-4 py-3 text-sm font-semibold">{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Unknown customer"}</td><td className="px-4 py-3 text-xs">{formatDate(invoice.issued_date)}</td><td className="px-4 py-3 text-xs">{formatDate(invoice.due_date)}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-[10px] font-black uppercase ${statusTone(status)}`}>{invoiceStatusLabels[status] ?? status}</span></td><td className="px-4 py-3 text-right text-sm font-bold">{money(invoice.total, invoice.currency)}</td><td className="px-4 py-3 text-right text-sm font-black">{money(invoice.balance_due, invoice.currency)}</td><td className="px-4 py-3 text-right"><ChevronRight className="ml-auto h-4 w-4 text-primary" /></td>
    </tr>; })}</tbody>
  </table></div>;
}
