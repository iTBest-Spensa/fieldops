"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AccountsShell } from "../components/accounts-shell";

type Invoice = { id: string; invoice_number: string; customer_id: string; status: string; issued_date: string | null; due_date: string | null; total: number; amount_paid: number; balance_due: number; currency: string; customer_name_snapshot: string | null; billing_email_snapshot: string | null };
type Customer = { id: string; name: string; billing_email: string | null };
type Payment = { id: string; invoice_id: string; amount: number; status: string; received_at: string };
type Bucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

const money = (value: number, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value || 0));

function ageBucket(dueDate: string | null, now: Date): { bucket: Bucket; days: number } {
  if (!dueDate) return { bucket: "current", days: 0 };
  const due = new Date(`${dueDate}T00:00:00`); due.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
  if (due.getTime() >= today.getTime()) return { bucket: "current", days: 0 };
  if (days <= 30) return { bucket: "1-30", days };
  if (days <= 60) return { bucket: "31-60", days };
  if (days <= 90) return { bucket: "61-90", days };
  return { bucket: "90+", days };
}

export default function AccountsReceivablePage() {
  const supabase = useMemo(() => createClient(), []);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<"all" | Bucket>("all");
  const [now, setNow] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Sign in to open Accounts Receivable."); setLoading(false); return; }
    const [invoiceResult, customerResult, paymentResult] = await Promise.all([
      supabase.from("invoices").select("id,invoice_number,customer_id,status,issued_date,due_date,total,amount_paid,balance_due,currency,customer_name_snapshot,billing_email_snapshot").order("due_date"),
      supabase.from("customers").select("id,name,billing_email").order("name"),
      supabase.from("payments").select("id,invoice_id,amount,status,received_at").order("received_at", { ascending: false }),
    ]);
    const firstError = invoiceResult.error || customerResult.error || paymentResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    setInvoices((invoiceResult.data ?? []) as Invoice[]);
    setCustomers((customerResult.data ?? []) as Customer[]);
    setPayments((paymentResult.data ?? []) as Payment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { setNow(new Date()); void loadData(); }, [loadData]);

  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const openInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== "void" && Number(invoice.balance_due) > 0.005), [invoices]);
  const rows = useMemo(() => {
    if (!now) return [];
    return openInvoices.map((invoice) => {
      const customer = customerMap.get(invoice.customer_id);
      const aging = ageBucket(invoice.due_date, now);
      return { ...invoice, customerName: invoice.customer_name_snapshot || customer?.name || "Customer", email: invoice.billing_email_snapshot || customer?.billing_email || "", bucket: aging.bucket, daysOverdue: aging.days };
    });
  }, [openInvoices, customerMap, now]);

  const bucketTotals = useMemo(() => {
    const totals: Record<Bucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    rows.forEach((row) => { totals[row.bucket] += Number(row.balance_due || 0); });
    return totals;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesBucket = bucketFilter === "all" || row.bucket === bucketFilter;
      const matchesSearch = !query || `${row.invoice_number} ${row.customerName} ${row.email}`.toLowerCase().includes(query);
      return matchesBucket && matchesSearch;
    });
  }, [rows, search, bucketFilter]);

  const customerBalances = useMemo(() => {
    const map = new Map<string, { customerName: string; balance: number; invoices: number; oldestDays: number }>();
    rows.forEach((row) => {
      const current = map.get(row.customer_id) ?? { customerName: row.customerName, balance: 0, invoices: 0, oldestDays: 0 };
      current.balance += Number(row.balance_due || 0); current.invoices += 1; current.oldestDays = Math.max(current.oldestDays, row.daysOverdue);
      map.set(row.customer_id, current);
    });
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [rows]);

  const monthPayments = useMemo(() => {
    if (!now) return 0;
    return payments.filter((payment) => {
      if (payment.status !== "posted") return false;
      const date = new Date(payment.received_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [payments, now]);

  return (
    <AccountsShell
      active="receivable"
      title="Accounts Receivable"
      description="Customer balances, collections, outstanding invoices and aging by due date."
      actions={<button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className="h-4 w-4"/>Refresh</button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Total Receivable" value={money(rows.reduce((sum, row) => sum + Number(row.balance_due || 0), 0))} detail={`${rows.length} open invoice${rows.length === 1 ? "" : "s"}`} />
        <Metric label="Current" value={money(bucketTotals.current)} detail="Not yet overdue" />
        <Metric label="1–30 Days" value={money(bucketTotals["1-30"])} detail="Early overdue" />
        <Metric label="31–60 Days" value={money(bucketTotals["31-60"])} detail="Follow-up required" />
        <Metric label="61–90 Days" value={money(bucketTotals["61-90"])} detail="High attention" />
        <Metric label="90+ Days" value={money(bucketTotals["90+"])} detail="Oldest receivables" />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice or customer…" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm"/></div>
          <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value as "all" | Bucket)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold"><option value="all">All aging</option><option value="current">Current</option><option value="1-30">1–30 days</option><option value="31-60">31–60 days</option><option value="61-90">61–90 days</option><option value="90+">90+ days</option></select>
          <Link href="/accounts/billing" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Open Billing</Link>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600">{error}</div> : null}

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5"><h2 className="font-black">AR Aging Report</h2><p className="mt-1 text-xs text-muted-foreground">Aging is calculated from each open invoice due date and current balance.</p></div>
        {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading Accounts Receivable…</div> : filteredRows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No receivables match the current filter.</div> : <div className="overflow-x-auto p-3"><table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-sm"><thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Customer</th><th>Invoice</th><th>Issued</th><th>Due</th><th>Aging</th><th className="text-right">Invoice Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id} className="bg-background shadow-sm"><td className="rounded-l-xl px-3 py-3 font-bold">{row.customerName}<div className="mt-0.5 text-[11px] font-normal text-muted-foreground">{row.email}</div></td><td className="font-semibold">{row.invoice_number}</td><td>{row.issued_date ?? "—"}</td><td>{row.due_date ?? "—"}</td><td><span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-black">{row.bucket === "current" ? "Current" : `${row.bucket} days`}</span>{row.daysOverdue > 0 ? <div className="mt-1 text-[10px] text-muted-foreground">{row.daysOverdue} day{row.daysOverdue === 1 ? "" : "s"} overdue</div> : null}</td><td className="text-right">{money(row.total, row.currency)}</td><td className="text-right">{money(row.amount_paid, row.currency)}</td><td className="rounded-r-xl text-right font-black">{money(row.balance_due, row.currency)}</td></tr>)}</tbody></table></div>}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-border bg-card shadow-sm"><div className="border-b border-border p-5"><h2 className="font-black">Customer Balances</h2><p className="mt-1 text-xs text-muted-foreground">Customers ranked by outstanding receivable.</p></div><div className="space-y-2 p-3">{customerBalances.slice(0, 10).map((row) => <div key={row.customerName} className="flex items-center justify-between gap-4 rounded-xl bg-background p-4"><div><div className="font-bold">{row.customerName}</div><div className="mt-1 text-xs text-muted-foreground">{row.invoices} open invoice{row.invoices === 1 ? "" : "s"} · oldest {row.oldestDays} days overdue</div></div><div className="text-right font-black">{money(row.balance)}</div></div>)}</div></section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-muted-foreground">Collections This Month</div><div className="mt-3 text-3xl font-black">{money(monthPayments)}</div><p className="mt-2 text-xs text-muted-foreground">Posted customer payments received during the current calendar month.</p></section>
      </div>
    </AccountsShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-3 text-xl font-black">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>; }
