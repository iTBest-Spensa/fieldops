"use client";
import type { DbInvoice, DbPayment } from "../types";
import { formatDateTime, money } from "../utils";

export function PaymentsTable({ payments, invoices, onOpenInvoice }: { payments: DbPayment[]; invoices: DbInvoice[]; onOpenInvoice: (id: string) => void }) {
  const invoiceMap = new Map(invoices.map((item) => [item.id, item]));
  return <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[860px] text-left">
    <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
    <tbody className="divide-y divide-border">{payments.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No payments recorded.</td></tr> : payments.map((payment) => { const invoice = invoiceMap.get(payment.invoice_id); return <tr key={payment.id} className="hover:bg-muted/30">
      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{payment.id.slice(0, 8).toUpperCase()}</td><td className="px-4 py-3"><button type="button" onClick={() => onOpenInvoice(payment.invoice_id)} className="text-sm font-black text-primary hover:underline">{invoice?.invoice_number ?? "Invoice"}</button></td><td className="px-4 py-3 text-sm font-black">{payment.payment_method === "tap" ? "Tap" : payment.payment_method === "cash" ? "Cash" : payment.payment_method}</td><td className="px-4 py-3 text-xs">{formatDateTime(payment.received_at)}</td><td className="px-4 py-3 text-xs">{payment.reference || "—"}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-[10px] font-black uppercase ${payment.status === "posted" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300"}`}>{payment.status}</span></td><td className="px-4 py-3 text-right text-sm font-black">{money(payment.amount, invoice?.currency ?? "CAD")}</td>
    </tr>; })}</tbody>
  </table></div>;
}
