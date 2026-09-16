"use client";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { CompanyBrand } from "@/components/company-brand";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";

type Section = "billing" | "payable" | "receivable" | "reports";
type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

type ArRow = {
  id: string;
  invoice_number: string;
  customer_name_snapshot: string | null;
  issued_date: string | null;
  due_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  aging_bucket: AgingBucket;
};

type ApRow = {
  id: string;
  bill_number: string;
  supplier_id: string;
  supplier_name: string;
  bill_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  aging_bucket: AgingBucket;
};

type TrialBalanceRow = {
  id: string;
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "debit" | "credit";
  debit_total: number;
  credit_total: number;
  net_debit: number;
};

type Supplier = { id: string; name: string; payment_terms_days: number };
type PurchaseOrder = { id: string; po_number: string; supplier_id: string; status: string };
type Invoice = { id: string; status: string; total: number; balance_due: number };
type Adjustment = { id: string; status: string; amount: number };
type Payment = { id: string; status: string; amount: number };

type BillForm = {
  supplierId: string;
  purchaseOrderId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  notes: string;
};

type PaymentForm = {
  billId: string;
  amount: string;
  method: string;
  reference: string;
  notes: string;
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Accounts", icon: Landmark, href: "/accounts", active: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const sectionTabs = [
  { key: "billing" as const, label: "Billing", icon: ReceiptText, description: "Invoices, adjustments, payments and billing review." },
  { key: "payable" as const, label: "Accounts Payable", icon: WalletCards, description: "Vendor bills, amounts we owe and outgoing payments." },
  { key: "receivable" as const, label: "Accounts Receivable", icon: FileText, description: "Customer balances, collections and aging." },
  { key: "reports" as const, label: "Reports", icon: BarChart3, description: "Trial balance, balance sheet and profit & loss." },
];

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value ?? 0));

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <div className="text-base font-black">{title}</div>
      <div className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

export default function AccountsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [section, setSection] = useState<Section>("billing");

  useEffect(() => {
    const setRequestedSection = (requested: string) => {
      if (
        requested === "billing" ||
        requested === "payable" ||
        requested === "receivable" ||
        requested === "reports"
      ) {
        setSection(requested as Section);
      }
    };

    const syncSectionFromHash = () => {
      setRequestedSection(window.location.hash.replace("#", ""));
    };

    const syncSectionFromSidebar = (event: Event) => {
      const requested = (event as CustomEvent<string>).detail;
      setRequestedSection(requested);
    };

    syncSectionFromHash();

    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("fieldops:accounts-section", syncSectionFromSidebar);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("fieldops:accounts-section", syncSectionFromSidebar);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [arRows, setArRows] = useState<ArRow[]>([]);
  const [apRows, setApRows] = useState<ApRow[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billOpen, setBillOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [billForm, setBillForm] = useState<BillForm>({
    supplierId: "",
    purchaseOrderId: "",
    billNumber: "",
    billDate: "",
    dueDate: "",
    subtotal: "",
    taxAmount: "",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ billId: "", amount: "", method: "eft", reference: "", notes: "" });

  useEffect(() => {
    const currentDate = today();

    setBillForm((current) => {
      if (current.billDate) return current;

      return {
        ...current,
        billDate: currentDate,
        dueDate: addDays(currentDate, 30),
      };
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setAuthRequired(false);

    const [ar, ap, trial, supplierResult, poResult, invoiceResult, adjustmentResult, paymentResult] = await Promise.all([
      supabase.from("fieldops_ar_aging").select("id,invoice_number,customer_name_snapshot,issued_date,due_date,total,amount_paid,balance_due,aging_bucket").order("due_date"),
      supabase.from("fieldops_ap_aging").select("id,bill_number,supplier_id,supplier_name,bill_date,due_date,total,amount_paid,balance_due,status,aging_bucket").order("due_date"),
      supabase.from("fieldops_trial_balance").select("id,code,name,account_type,normal_balance,debit_total,credit_total,net_debit").order("code"),
      supabase.from("inventory_suppliers").select("id,name,payment_terms_days").eq("active", true).order("name"),
      supabase.from("inventory_purchase_orders").select("id,po_number,supplier_id,status").order("created_at", { ascending: false }).limit(200),
      supabase.from("invoices").select("id,status,total,balance_due"),
      supabase.from("invoice_adjustments").select("id,status,amount"),
      supabase.from("payments").select("id,status,amount"),
    ]);

    const firstError = [ar, ap, trial, supplierResult, poResult, invoiceResult, adjustmentResult, paymentResult].find((r) => r.error)?.error;
    if (firstError) setError(firstError.message);
    else {
      setArRows((ar.data ?? []) as ArRow[]);
      setApRows((ap.data ?? []) as ApRow[]);
      setTrialBalance((trial.data ?? []) as TrialBalanceRow[]);
      setSuppliers((supplierResult.data ?? []) as Supplier[]);
      setPurchaseOrders((poResult.data ?? []) as PurchaseOrder[]);
      setInvoices((invoiceResult.data ?? []) as Invoice[]);
      setAdjustments((adjustmentResult.data ?? []) as Adjustment[]);
      setPayments((paymentResult.data ?? []) as Payment[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (authRequired) return;
    const refresh = () => void loadData();
    const channel = supabase.channel("fieldops-accounts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_adjustments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_bills" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_payments" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authRequired, loadData, supabase]);

  const arTotals = useMemo(() => {
    const buckets: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    arRows.forEach((r) => { buckets[r.aging_bucket] += Number(r.balance_due); });
    return { buckets, total: Object.values(buckets).reduce((a, b) => a + b, 0) };
  }, [arRows]);

  const apTotals = useMemo(() => {
    const buckets: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    apRows.forEach((r) => { buckets[r.aging_bucket] += Number(r.balance_due); });
    return { buckets, total: Object.values(buckets).reduce((a, b) => a + b, 0) };
  }, [apRows]);

  const reports = useMemo(() => {
    const balance = (type: TrialBalanceRow["account_type"]) => trialBalance
      .filter((r) => r.account_type === type)
      .reduce((sum, r) => sum + (r.normal_balance === "debit" ? Number(r.debit_total) - Number(r.credit_total) : Number(r.credit_total) - Number(r.debit_total)), 0);
    const assets = balance("asset");
    const liabilities = balance("liability");
    const equity = balance("equity");
    const revenue = balance("revenue");
    const expenses = balance("expense");
    return { assets, liabilities, equity, revenue, expenses, netIncome: revenue - expenses };
  }, [trialBalance]);

  const billingSummary = useMemo(() => ({
    open: invoices.filter((i) => i.status !== "void" && Number(i.balance_due) > 0).reduce((s, i) => s + Number(i.balance_due), 0),
    draft: invoices.filter((i) => ["draft", "ready"].includes(i.status)).length,
    adjustments: adjustments.filter((a) => a.status !== "void").reduce((s, a) => s + Number(a.amount), 0),
    collected: payments.filter((p) => p.status === "posted").reduce((s, p) => s + Number(p.amount), 0),
  }), [invoices, adjustments, payments]);

  function changeSupplier(supplierId: string) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const billDate = billForm.billDate || today();
    setBillForm((f) => ({ ...f, supplierId, purchaseOrderId: "", dueDate: addDays(billDate, supplier?.payment_terms_days ?? 30) }));
  }

  async function createVendorBill() {
    const subtotal = Number(billForm.subtotal);
    const tax = Number(billForm.taxAmount || 0);
    if (!billForm.supplierId || !billForm.billNumber.trim() || !billForm.billDate || !billForm.dueDate || !Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tax) || tax < 0) {
      setNotice("Complete the supplier, bill number, dates and valid amounts.");
      return;
    }
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const total = subtotal + tax;
    const { error: saveError } = await supabase.from("vendor_bills").insert({
      supplier_id: billForm.supplierId,
      purchase_order_id: billForm.purchaseOrderId || null,
      bill_number: billForm.billNumber.trim(),
      bill_date: billForm.billDate,
      due_date: billForm.dueDate,
      subtotal,
      tax_amount: tax,
      total,
      balance_due: total,
      status: "posted",
      notes: billForm.notes.trim() || null,
      created_by: authData.user?.id ?? null,
    });
    setSaving(false);
    if (saveError) { setNotice(saveError.message); return; }
    setBillOpen(false);
    setNotice("Vendor bill posted to Accounts Payable.");
    setBillForm({ supplierId: "", purchaseOrderId: "", billNumber: "", billDate: today(), dueDate: addDays(today(), 30), subtotal: "", taxAmount: "", notes: "" });
    await loadData();
  }

  async function recordVendorPayment() {
    const amount = Number(paymentForm.amount);
    if (!paymentForm.billId || !Number.isFinite(amount) || amount <= 0) { setNotice("Choose a vendor bill and enter a payment amount."); return; }
    const bill = apRows.find((r) => r.id === paymentForm.billId);
    if (bill && amount > Number(bill.balance_due)) { setNotice("Payment cannot exceed the remaining vendor bill balance."); return; }
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from("vendor_payments").insert({
      vendor_bill_id: paymentForm.billId,
      amount,
      payment_method: paymentForm.method,
      reference: paymentForm.reference.trim() || null,
      notes: paymentForm.notes.trim() || null,
      created_by: authData.user?.id ?? null,
      status: "posted",
    });
    setSaving(false);
    if (saveError) { setNotice(saveError.message); return; }
    setPaymentOpen(false);
    setPaymentForm({ billId: "", amount: "", method: "eft", reference: "", notes: "" });
    setNotice("Vendor payment posted.");
    await loadData();
  }

  if (authRequired) return <main className="min-h-screen bg-background p-8 text-foreground"><div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6"><h1 className="text-xl font-black">Sign in required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to open Accounts.</p></div></main>;

  const filteredPOs = purchaseOrders.filter((po) => !billForm.supplierId || po.supplier_id === billForm.supplierId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[236px_1fr]">
        <FieldOpsSidebar />

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex h-10 w-[420px] items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground"><Search className="h-4 w-4" />Search accounts, invoices, vendors...</div>
            <div className="flex items-center gap-2"><FieldOpsThemeToggle /><button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border" aria-label="Notifications"><Bell className="h-4 w-4" /></button></div>
          </header>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="text-sm font-bold text-primary">Finance & Accounting</div></div>
              <button onClick={() => void loadData()} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold hover:bg-muted"><RefreshCw className="h-4 w-4" />Refresh</button>
            </div>

            {notice ? <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold"><span>{notice}</span><button onClick={() => setNotice(null)} className="rounded-full p-1 hover:bg-background/50"><X className="h-4 w-4" /></button></div> : null}
            {error ? <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

            {loading ? <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading Accounts...</div> : null}

            {!loading && section === "billing" ? <div className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-4"><Metric label="Outstanding AR" value={money(billingSummary.open)} /><Metric label="Draft / Ready" value={String(billingSummary.draft)} /><Metric label="Adjustments" value={money(billingSummary.adjustments)} /><Metric label="Payments received" value={money(billingSummary.collected)} /></div>
              <div className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-black">Billing Operations</h2><p className="mt-1 text-sm text-muted-foreground">Continue using the detailed billing workspace for Billing Ready work orders, invoices, adjustments, charges, credits, payments and billing-review recovery.</p></div><Link href="/billing" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">Open Billing Workspace</Link></div></div>
            </div> : null}

            {!loading && section === "payable" ? <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Accounts Payable</h2><p className="mt-1 text-sm text-muted-foreground">Vendor bills, due balances and money FieldOps owes.</p></div><div className="flex gap-2"><button onClick={() => setPaymentOpen(true)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-black hover:bg-muted">Record Payment</button><button onClick={() => setBillOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground"><Plus className="h-4 w-4" />New Vendor Bill</button></div></div>
              <div className="grid gap-4 md:grid-cols-3"><Metric label="Total Payable" value={money(apTotals.total)} /><Metric label="Overdue" value={money(apTotals.buckets["1-30"] + apTotals.buckets["31-60"] + apTotals.buckets["61-90"] + apTotals.buckets["90+"])} /><Metric label="90+ Days" value={money(apTotals.buckets["90+"])} /></div>
              {apRows.length === 0 ? <EmptyState title="No outstanding vendor bills" text="Create a vendor bill when an amount becomes payable. Purchase Orders remain purchasing commitments until a bill is posted." /> : <div className="overflow-hidden rounded-2xl border border-border bg-card"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Bill</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Age</th><th className="px-4 py-3 text-right">Original</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody>{apRows.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-4 py-3 font-bold">{row.supplier_name}</td><td className="px-4 py-3">{row.bill_number}</td><td className="px-4 py-3">{row.due_date}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black">{row.aging_bucket}</span></td><td className="px-4 py-3 text-right">{money(row.total)}</td><td className="px-4 py-3 text-right font-black">{money(row.balance_due)}</td></tr>)}</tbody></table></div>}
            </div> : null}

            {!loading && section === "receivable" ? <div className="mt-6 space-y-5">
              <div><h2 className="text-xl font-black">Accounts Receivable</h2><p className="mt-1 text-sm text-muted-foreground">Everything customers owe, including the live receivable aging report.</p></div>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6"><Metric label="Total AR" value={money(arTotals.total)} /><Metric label="Current" value={money(arTotals.buckets.current)} /><Metric label="1–30" value={money(arTotals.buckets["1-30"])} /><Metric label="31–60" value={money(arTotals.buckets["31-60"])} /><Metric label="61–90" value={money(arTotals.buckets["61-90"])} /><Metric label="90+" value={money(arTotals.buckets["90+"])} /></div>
              {arRows.length === 0 ? <EmptyState title="No outstanding receivables" text="Customer invoices with a remaining balance will appear here automatically." /> : <div className="overflow-hidden rounded-2xl border border-border bg-card"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Age</th><th className="px-4 py-3 text-right">Invoice</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody>{arRows.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-4 py-3 font-bold">{row.customer_name_snapshot || "Customer"}</td><td className="px-4 py-3">{row.invoice_number}</td><td className="px-4 py-3">{row.due_date || "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black">{row.aging_bucket}</span></td><td className="px-4 py-3 text-right">{money(row.total)}</td><td className="px-4 py-3 text-right">{money(row.amount_paid)}</td><td className="px-4 py-3 text-right font-black">{money(row.balance_due)}</td></tr>)}</tbody></table></div>}
            </div> : null}

            {!loading && section === "reports" ? <div className="mt-6 space-y-5">
              <div><h2 className="text-xl font-black">Financial Reports</h2><p className="mt-1 text-sm text-muted-foreground">Ledger-backed reports. Posted invoices, customer payments, vendor bills and vendor payments feed these balances.</p></div>
              <div className="grid gap-4 md:grid-cols-3"><Metric label="Assets" value={money(reports.assets)} /><Metric label="Liabilities" value={money(reports.liabilities)} /><Metric label="Equity + Net Income" value={money(reports.equity + reports.netIncome)} /></div>
              <div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-6"><h3 className="text-lg font-black">Profit & Loss</h3><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Revenue</span><strong>{money(reports.revenue)}</strong></div><div className="flex justify-between"><span>Expenses</span><strong>{money(reports.expenses)}</strong></div><div className="border-t border-border pt-3"><div className="flex justify-between text-base"><span className="font-black">Net Income</span><strong>{money(reports.netIncome)}</strong></div></div></div></div><div className="rounded-2xl border border-border bg-card p-6"><h3 className="text-lg font-black">Balance Sheet</h3><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Assets</span><strong>{money(reports.assets)}</strong></div><div className="flex justify-between"><span>Liabilities</span><strong>{money(reports.liabilities)}</strong></div><div className="flex justify-between"><span>Equity</span><strong>{money(reports.equity)}</strong></div><div className="flex justify-between"><span>Current earnings</span><strong>{money(reports.netIncome)}</strong></div></div></div></div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="border-b border-border p-5"><h3 className="font-black">Trial Balance</h3></div><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th></tr></thead><tbody>{trialBalance.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-4 py-3 font-mono">{row.code}</td><td className="px-4 py-3 font-bold">{row.name}</td><td className="px-4 py-3 capitalize">{row.account_type}</td><td className="px-4 py-3 text-right">{money(row.debit_total)}</td><td className="px-4 py-3 text-right">{money(row.credit_total)}</td></tr>)}</tbody></table></div>
            </div> : null}
          </div>
        </section>
      </div>

      {billOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">New Vendor Bill</h2><p className="mt-1 text-sm text-muted-foreground">Post an amount FieldOps owes a supplier.</p></div><button onClick={() => setBillOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Supplier<select value={billForm.supplierId} onChange={(e) => changeSupplier(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"><option value="">Choose supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm font-bold">Purchase Order<select value={billForm.purchaseOrderId} onChange={(e) => setBillForm((f) => ({ ...f, purchaseOrderId: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"><option value="">Optional</option>{filteredPOs.map((po) => <option key={po.id} value={po.id}>{po.po_number} · {po.status}</option>)}</select></label><label className="text-sm font-bold">Vendor bill number<input value={billForm.billNumber} onChange={(e) => setBillForm((f) => ({ ...f, billNumber: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold">Bill date<input type="date" value={billForm.billDate} onChange={(e) => setBillForm((f) => ({ ...f, billDate: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold">Due date<input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((f) => ({ ...f, dueDate: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold">Subtotal<input inputMode="decimal" value={billForm.subtotal} onChange={(e) => setBillForm((f) => ({ ...f, subtotal: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold">Tax<input inputMode="decimal" value={billForm.taxAmount} onChange={(e) => setBillForm((f) => ({ ...f, taxAmount: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold md:col-span-2">Notes<textarea value={billForm.notes} onChange={(e) => setBillForm((f) => ({ ...f, notes: e.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setBillOpen(false)} className="rounded-xl border border-border px-4 py-2 font-bold">Cancel</button><button disabled={saving} onClick={() => void createVendorBill()} className="rounded-xl bg-primary px-4 py-2 font-black text-primary-foreground disabled:opacity-50">{saving ? "Posting..." : "Post Vendor Bill"}</button></div></div></div> : null}

      {paymentOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Record Vendor Payment</h2><p className="mt-1 text-sm text-muted-foreground">Reduce an outstanding Accounts Payable balance.</p></div><button onClick={() => setPaymentOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-bold">Vendor bill<select value={paymentForm.billId} onChange={(e) => setPaymentForm((f) => ({ ...f, billId: e.target.value, amount: apRows.find((r) => r.id === e.target.value)?.balance_due?.toString() ?? "" }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"><option value="">Choose outstanding bill</option>{apRows.map((r) => <option key={r.id} value={r.id}>{r.supplier_name} · {r.bill_number} · {money(r.balance_due)}</option>)}</select></label><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Amount<input inputMode="decimal" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="text-sm font-bold">Method<select value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2"><option value="eft">EFT</option><option value="cheque">Cheque</option><option value="credit_card">Credit Card</option><option value="cash">Cash</option><option value="other">Other</option></select></label></div><label className="block text-sm font-bold">Reference<input value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" /></label><label className="block text-sm font-bold">Notes<textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setPaymentOpen(false)} className="rounded-xl border border-border px-4 py-2 font-bold">Cancel</button><button disabled={saving} onClick={() => void recordVendorPayment()} className="rounded-xl bg-primary px-4 py-2 font-black text-primary-foreground disabled:opacity-50">{saving ? "Posting..." : "Post Payment"}</button></div></div></div> : null}
    </main>
  );
}
