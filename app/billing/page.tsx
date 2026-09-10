"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Boxes, Building2, ClipboardList, Filter, LayoutDashboard,
  Package, ReceiptText, RefreshCw, Search, Settings, Truck, Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";
import type {
  AdjustmentForm, BillingSection, BillingSummaryView, DbCustomer, DbInvoice,
  DbInvoiceAdjustment, DbInvoiceEvent, DbInvoiceItem, DbPayment, DbProfile,
  DbRole, DbSite, DbWorkOrder, InvoiceTab, InvoiceTermsForm, ManualChargeForm,
  PaymentForm,
} from "./types";
import { emptyAdjustmentForm, emptyManualChargeForm, emptyPaymentForm, emptyTermsForm } from "./constants";
import { effectiveInvoiceStatus, localDateTimeInput, money, numberOrNaN } from "./utils";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { BillingSummaryCards } from "./components/billing-summary-cards";
import { BillingTabs } from "./components/billing-tabs";
import { BillingReadyTable } from "./components/billing-ready-table";
import { InvoicesTable } from "./components/invoices-table";
import { PaymentsTable } from "./components/payments-table";
import { BillingSummaryModal } from "./components/modals/billing-summary-modal";
import { InvoiceDetailModal } from "./components/modals/invoice-detail-modal";
import { RecordPaymentModal } from "./components/modals/record-payment-modal";
import { InvoiceTermsModal } from "./components/modals/invoice-terms-modal";
import { ManualChargeModal } from "./components/modals/manual-charge-modal";
import { AdjustmentModal } from "./components/modals/adjustment-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, active: true, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const invoiceSelect = "id,invoice_number,customer_id,site_id,work_order_id,status,issued_date,due_date,tax_rate,discount_amount,subtotal,tax_amount,total,amount_paid,balance_due,notes,currency,approved_by,approved_at,sent_at,voided_at,voided_by,void_reason,billing_email_snapshot,customer_name_snapshot,site_address_snapshot,created_by,created_at,updated_at";
const invoiceItemSelect = "id,invoice_id,work_order_id,line_type,description,quantity,unit_price,line_total,sort_order,source_type,source_id,taxable,created_at";
const paymentSelect = "id,invoice_id,amount,payment_method,status,reference,received_at,notes,created_by,created_at,voided_at,voided_by,void_reason";
const adjustmentSelect = "id,invoice_id,adjustment_type,amount,reason,notes,status,created_by,created_at,voided_at,voided_by,void_reason";
const eventSelect = "id,invoice_id,event_type,details,created_by,created_at";

export default function BillingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<DbInvoiceItem[]>([]);
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [adjustments, setAdjustments] = useState<DbInvoiceAdjustment[]>([]);
  const [events, setEvents] = useState<DbInvoiceEvent[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<BillingSection>("ready");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryView, setSummaryView] = useState<BillingSummaryView | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<InvoiceTab>("overview");
  const [actionNotice, setActionNotice] = useState<ActionNoticeState>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);
  const [termsForm, setTermsForm] = useState<InvoiceTermsForm>(emptyTermsForm);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [savingTerms, setSavingTerms] = useState(false);

  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState<ManualChargeForm>(emptyManualChargeForm);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [savingCharge, setSavingCharge] = useState(false);

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(emptyAdjustmentForm);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const showActionNotice = useCallback((type: "info" | "success" | "error", message: string) => {
    setActionNotice({ type, message });
  }, []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    const updateToday = () => {
      const d = new Date();
      const pad = (v: number) => String(v).padStart(2, "0");
      setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    };
    updateToday();
    const timer = window.setInterval(updateToday, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setAuthRequired(false);
    setCurrentUserId(authData.user.id);

    const [customersResult, sitesResult, workOrdersResult, invoicesResult, itemsResult, paymentsResult, adjustmentsResult, eventsResult, profilesResult, rolesResult] = await Promise.all([
      supabase.from("customers").select("id,name,billing_email,billing_terms_days,tax_exempt,status").order("name"),
      supabase.from("sites").select("id,customer_id,name,address1,address2,city,province_state,postal_code,country").order("name"),
      supabase.from("work_orders").select("id,work_order_number,customer_id,site_id,title,status,billing_status,billing_ready_at,billed_at,customer_po,completed_at,closed_at").order("requested_at", { ascending: false }),
      supabase.from("invoices").select(invoiceSelect).order("created_at", { ascending: false }),
      supabase.from("invoice_items").select(invoiceItemSelect).order("sort_order"),
      supabase.from("payments").select(paymentSelect).order("received_at", { ascending: false }),
      supabase.from("invoice_adjustments").select(adjustmentSelect).order("created_at", { ascending: false }),
      supabase.from("invoice_events").select(eventSelect).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const results = [customersResult, sitesResult, workOrdersResult, invoicesResult, itemsResult, paymentsResult, adjustmentsResult, eventsResult, profilesResult, rolesResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    setCustomers((customersResult.data ?? []) as unknown as DbCustomer[]);
    setSites((sitesResult.data ?? []) as DbSite[]);
    setWorkOrders((workOrdersResult.data ?? []) as DbWorkOrder[]);
    setInvoices((invoicesResult.data ?? []) as DbInvoice[]);
    setInvoiceItems((itemsResult.data ?? []) as DbInvoiceItem[]);
    setPayments((paymentsResult.data ?? []) as DbPayment[]);
    setAdjustments((adjustmentsResult.data ?? []) as DbInvoiceAdjustment[]);
    setEvents((eventsResult.data ?? []) as DbInvoiceEvent[]);
    setProfiles((profilesResult.data ?? []) as DbProfile[]);
    setRoles((rolesResult.data ?? []) as DbRole[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (authRequired) return;
    const channel = supabase.channel("fieldops-billing-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_items" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_adjustments" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => void loadData())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, loadData, authRequired]);

  const canManageBilling = useMemo(() => {
    if (!currentUserId) return false;
    return roles.some((role) => role.user_id === currentUserId && ["admin", "manager", "billing"].includes(role.role));
  }, [roles, currentUserId]);

  const billingReadyOrders = useMemo(() => workOrders.filter((wo) =>
    wo.billing_status === "ready" || wo.billing_status === "review_required"
  ), [workOrders]);

  const summary = useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => invoice.status !== "void");
    const outstanding = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    const overdue = activeInvoices.filter((invoice) => effectiveInvoiceStatus(invoice, today) === "overdue").reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0);
    return { ready: billingReadyOrders.length, drafts: activeInvoices.filter((invoice) => invoice.status === "draft").length, outstanding, overdue };
  }, [invoices, billingReadyOrders, today]);

  const filteredInvoices = useMemo(() => {
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const effective = effectiveInvoiceStatus(invoice, today);
      const customerName = invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "";
      const matchesSearch = !query || invoice.invoice_number.toLowerCase().includes(query) || customerName.toLowerCase().includes(query) || (invoice.billing_email_snapshot ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || effective === statusFilter || (statusFilter === "approved" && invoice.status === "ready");
      return matchesSearch && matchesStatus;
    });
  }, [invoices, customers, search, statusFilter, today]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    return payments.filter((payment) => {
      if (!query) return true;
      const invoice = invoiceMap.get(payment.invoice_id);
      return (invoice?.invoice_number ?? "").toLowerCase().includes(query) || payment.payment_method.toLowerCase().includes(query) || (payment.reference ?? "").toLowerCase().includes(query);
    });
  }, [payments, invoices, search]);

  const selectedInvoice = selectedInvoiceId ? invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null : null;
  const selectedCustomer = selectedInvoice ? customers.find((customer) => customer.id === selectedInvoice.customer_id) ?? null : null;
  const selectedSite = selectedInvoice?.site_id ? sites.find((site) => site.id === selectedInvoice.site_id) ?? null : null;
  const selectedWorkOrder = selectedInvoice?.work_order_id ? workOrders.find((wo) => wo.id === selectedInvoice.work_order_id) ?? null : null;
  const selectedItems = selectedInvoice ? invoiceItems.filter((item) => item.invoice_id === selectedInvoice.id) : [];
  const selectedPayments = selectedInvoice ? payments.filter((payment) => payment.invoice_id === selectedInvoice.id) : [];
  const selectedAdjustments = selectedInvoice ? adjustments.filter((adjustment) => adjustment.invoice_id === selectedInvoice.id) : [];
  const selectedEvents = selectedInvoice ? events.filter((event) => event.invoice_id === selectedInvoice.id) : [];

  function openInvoice(id: string) { setSelectedInvoiceId(id); setInvoiceTab("overview"); }

  async function createInvoice(workOrder: DbWorkOrder) {
    if (!canManageBilling) { showActionNotice("error", "Only Admin, Manager or Billing can create invoices."); return; }
    showActionNotice("info", `Creating invoice from ${workOrder.work_order_number}…`);
    const { data, error: rpcError } = await supabase.rpc("fieldops_create_invoice_from_work_order", { p_work_order_id: workOrder.id });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadData();
    const invoiceId = data && typeof data === "object" && "invoice_id" in data ? String((data as { invoice_id: unknown }).invoice_id) : null;
    if (invoiceId) openInvoice(invoiceId);
    showActionNotice("success", `Invoice created from ${workOrder.work_order_number}.`);
  }

  function openTerms() {
    if (!selectedInvoice) return;
    setTermsError(null);
    setTermsForm({
      issuedDate: selectedInvoice.issued_date ?? "",
      dueDate: selectedInvoice.due_date ?? "",
      taxRatePercent: String(Number(selectedInvoice.tax_rate || 0) * 100),
      discountAmount: String(selectedInvoice.discount_amount ?? 0),
      billingEmail: selectedInvoice.billing_email_snapshot ?? selectedCustomer?.billing_email ?? "",
      notes: selectedInvoice.notes ?? "",
    });
    setTermsOpen(true);
  }

  async function saveTerms() {
    if (!selectedInvoice) return;
    const taxPercent = numberOrNaN(termsForm.taxRatePercent || "0");
    const discount = numberOrNaN(termsForm.discountAmount || "0");
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) { setTermsError("Tax rate must be between 0 and 100%."); return; }
    if (!Number.isFinite(discount) || discount < 0) { setTermsError("Discount cannot be negative."); return; }
    setSavingTerms(true); setTermsError(null);
    const { error: rpcError } = await supabase.rpc("fieldops_update_invoice_terms", {
      p_invoice_id: selectedInvoice.id,
      p_issued_date: termsForm.issuedDate || null,
      p_due_date: termsForm.dueDate || null,
      p_tax_rate: taxPercent / 100,
      p_discount_amount: discount,
      p_billing_email: termsForm.billingEmail.trim() || null,
      p_notes: termsForm.notes.trim() || null,
    });
    setSavingTerms(false);
    if (rpcError) { setTermsError(rpcError.message); return; }
    setTermsOpen(false); await loadData(); showActionNotice("success", `${selectedInvoice.invoice_number} terms updated.`);
  }

  function openCharge() { setChargeForm(emptyManualChargeForm); setChargeError(null); setChargeOpen(true); }
  async function saveCharge() {
    if (!selectedInvoice) return;
    const qty = numberOrNaN(chargeForm.quantity);
    const price = numberOrNaN(chargeForm.unitPrice);
    if (!chargeForm.description.trim()) { setChargeError("Description is required."); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setChargeError("Quantity must be greater than zero."); return; }
    if (!Number.isFinite(price) || price < 0) { setChargeError("Unit price must be zero or greater."); return; }
    setSavingCharge(true); setChargeError(null);
    const { error: rpcError } = await supabase.rpc("fieldops_add_invoice_charge", { p_invoice_id: selectedInvoice.id, p_line_type: chargeForm.lineType, p_description: chargeForm.description.trim(), p_quantity: qty, p_unit_price: price, p_taxable: chargeForm.taxable });
    setSavingCharge(false);
    if (rpcError) { setChargeError(rpcError.message); return; }
    setChargeOpen(false); await loadData(); showActionNotice("success", "Charge added to draft invoice.");
  }

  function openAdjustment() { setAdjustmentForm(emptyAdjustmentForm); setAdjustmentError(null); setAdjustmentOpen(true); }
  async function saveAdjustment() {
    if (!selectedInvoice) return;
    const amount = numberOrNaN(adjustmentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setAdjustmentError("Amount must be greater than zero."); return; }
    if (adjustmentForm.reason.trim().length < 3) { setAdjustmentError("Enter an adjustment reason."); return; }
    setSavingAdjustment(true); setAdjustmentError(null);
    const { error: rpcError } = await supabase.rpc("fieldops_post_invoice_adjustment", { p_invoice_id: selectedInvoice.id, p_adjustment_type: adjustmentForm.adjustmentType, p_amount: amount, p_reason: adjustmentForm.reason.trim(), p_notes: adjustmentForm.notes.trim() || null });
    setSavingAdjustment(false);
    if (rpcError) { setAdjustmentError(rpcError.message); return; }
    setAdjustmentOpen(false); await loadData(); showActionNotice("success", adjustmentForm.adjustmentType === "credit" ? "Credit note posted." : "Additional charge posted.");
  }

  function openPayment() {
    if (!selectedInvoice) return;
    setPaymentError(null);
    setPaymentForm({ ...emptyPaymentForm, amount: selectedInvoice.balance_due > 0 ? String(selectedInvoice.balance_due.toFixed(2)) : "", receivedAt: localDateTimeInput(new Date()) });
    setPaymentOpen(true);
  }

  async function savePayment() {
    if (!selectedInvoice) return;
    const amount = numberOrNaN(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setPaymentError("Payment amount must be greater than zero."); return; }
    if (amount > selectedInvoice.balance_due + 0.005) { setPaymentError("Payment cannot be greater than the current balance due."); return; }
    if (!paymentForm.receivedAt) { setPaymentError("Payment date and time are required."); return; }
    setSavingPayment(true); setPaymentError(null);
    const { error: rpcError } = await supabase.rpc("fieldops_record_invoice_payment", {
      p_invoice_id: selectedInvoice.id,
      p_amount: amount,
      p_payment_method: paymentForm.method,
      p_received_at: new Date(paymentForm.receivedAt).toISOString(),
      p_reference: paymentForm.reference.trim() || null,
      p_notes: paymentForm.notes.trim() || null,
    });
    setSavingPayment(false);
    if (rpcError) { setPaymentError(rpcError.message); return; }
    setPaymentOpen(false); await loadData(); showActionNotice("success", `${paymentForm.method === "tap" ? "Tap" : "Cash"} payment recorded.`);
  }

  async function refreshInvoiceFromWorkOrder() {
    if (!selectedInvoice || !canManageBilling) return;
    if (selectedInvoice.status !== "draft") {
      showActionNotice("error", "Only a Draft invoice can be refreshed from its Work Order.");
      return;
    }
    showActionNotice("info", `Refreshing ${selectedInvoice.invoice_number} from current labour and materials…`);
    const { error: rpcError } = await supabase.rpc("fieldops_refresh_invoice_from_work_order", {
      p_invoice_id: selectedInvoice.id,
    });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadData();
    showActionNotice("success", "Draft invoice refreshed from the current Work Order source.");
  }

  async function setInvoiceStatus(nextStatus: "approved" | "sent") {
    if (!selectedInvoice) return;
    const label = nextStatus === "approved" ? "Approving" : "Marking sent";
    showActionNotice("info", `${label} ${selectedInvoice.invoice_number}…`);
    const { error: rpcError } = await supabase.rpc("fieldops_set_invoice_status", { p_invoice_id: selectedInvoice.id, p_status: nextStatus });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadData(); showActionNotice("success", nextStatus === "approved" ? "Invoice approved." : "Invoice marked as sent.");
  }

  async function voidInvoice() {
    if (!selectedInvoice) return;
    const reason = window.prompt(`Reason for voiding ${selectedInvoice.invoice_number}?`);
    if (!reason) return;
    if (reason.trim().length < 3) { showActionNotice("error", "Void reason must be at least 3 characters."); return; }
    const { error: rpcError } = await supabase.rpc("fieldops_void_invoice", { p_invoice_id: selectedInvoice.id, p_reason: reason.trim() });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadData(); showActionNotice("success", "Invoice voided. History was retained.");
  }

  async function voidPayment(payment: DbPayment) {
    const reason = window.prompt(`Reason for reversing this ${payment.payment_method === "tap" ? "Tap" : "Cash"} payment?`);
    if (!reason) return;
    if (reason.trim().length < 3) { showActionNotice("error", "Reversal reason must be at least 3 characters."); return; }
    const { error: rpcError } = await supabase.rpc("fieldops_void_invoice_payment", { p_payment_id: payment.id, p_reason: reason.trim() });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadData(); showActionNotice("success", "Payment reversed. Original payment remains in the audit history.");
  }

  if (authRequired) return <main className="min-h-screen bg-background p-8 text-foreground"><div className="mx-auto max-w-xl border border-border bg-card p-8"><h1 className="text-xl font-black">Sign in required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to access FieldOps Billing.</p></div></main>;

  return <div className="min-h-screen bg-background text-foreground">
    <ActionNotice notice={actionNotice} onClose={() => setActionNotice(null)} />
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block"><div className="border-b border-border px-5 py-5"><div className="text-xl font-black tracking-tight">FieldOps</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">Dispatch & Billing</div></div><nav className="space-y-1 p-3">{navigation.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-bold ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav></aside>
    <main className="lg:pl-64">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-6"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Financial Operations</div><h1 className="text-2xl font-black">Billing</h1></div><div className="flex items-center gap-2"><button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className="h-4 w-4" /> Refresh</button><FieldOpsThemeToggle /></div></header>
      <div className="space-y-6 p-4 md:p-6">
        <BillingSummaryCards billingReady={summary.ready} drafts={summary.drafts} outstanding={summary.outstanding} overdue={summary.overdue} onView={setSummaryView} />
        <BillingTabs section={section} onChange={setSection} readyCount={summary.ready} />
        <section className="flex flex-wrap items-center justify-between gap-3"><div className="relative min-w-[260px] flex-1 max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={section === "ready" ? "Search work orders…" : section === "payments" ? "Search payments…" : "Search invoices or customers…"} className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm" /></div>{section === "invoices" ? <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 border border-border bg-card px-3 text-sm font-bold"><option value="all">All statuses</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="sent">Sent</option><option value="partial">Partially Paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="void">Void</option></select></div> : null}</section>
        {error ? <div className="border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</div> : null}
        {loading ? <div className="border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading Billing…</div> : section === "ready" ? <BillingReadyTable workOrders={billingReadyOrders.filter((wo) => !search.trim() || `${wo.work_order_number} ${wo.title} ${customers.find((customer) => customer.id === wo.customer_id)?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))} customers={customers} sites={sites} invoices={invoices} onCreate={(wo) => void createInvoice(wo)} onOpenInvoice={openInvoice} canManageBilling={canManageBilling} /> : section === "invoices" ? <InvoicesTable invoices={filteredInvoices} customers={customers} today={today} onOpen={openInvoice} /> : <PaymentsTable payments={filteredPayments} invoices={invoices} onOpenInvoice={openInvoice} />}
        {!canManageBilling && !loading ? <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-200">You have read-only Billing access. Invoice and payment changes require Admin, Manager or Billing role.</div> : null}
      </div>
    </main>

    <BillingSummaryModal view={summaryView} workOrders={billingReadyOrders} invoices={invoices} customers={customers} today={today} onClose={() => setSummaryView(null)} onOpenInvoice={(id) => { setSummaryView(null); openInvoice(id); }} />
    <InvoiceDetailModal invoice={selectedInvoice} customer={selectedCustomer} site={selectedSite} workOrder={selectedWorkOrder} items={selectedItems} payments={selectedPayments} adjustments={selectedAdjustments} events={selectedEvents} profiles={profiles} today={today} tab={invoiceTab} onTab={setInvoiceTab} onClose={() => setSelectedInvoiceId(null)} onEditTerms={openTerms} onAddCharge={openCharge} onAddAdjustment={openAdjustment} onRecordPayment={openPayment} onApprove={() => void setInvoiceStatus("approved")} onSend={() => void setInvoiceStatus("sent")} onVoidInvoice={() => void voidInvoice()} onVoidPayment={(payment) => void voidPayment(payment)} canManageBilling={canManageBilling} onRefreshFromWorkOrder={() => void refreshInvoiceFromWorkOrder()} />
    <RecordPaymentModal open={paymentOpen && Boolean(selectedInvoice)} invoiceNumber={selectedInvoice?.invoice_number ?? ""} balanceDue={selectedInvoice?.balance_due ?? 0} currency={selectedInvoice?.currency ?? "CAD"} form={paymentForm} error={paymentError} saving={savingPayment} onChange={setPaymentForm} onSave={() => void savePayment()} onClose={() => setPaymentOpen(false)} />
    <InvoiceTermsModal open={termsOpen} form={termsForm} error={termsError} saving={savingTerms} onChange={setTermsForm} onSave={() => void saveTerms()} onClose={() => setTermsOpen(false)} />
    <ManualChargeModal open={chargeOpen} form={chargeForm} error={chargeError} saving={savingCharge} onChange={setChargeForm} onSave={() => void saveCharge()} onClose={() => setChargeOpen(false)} />
    <AdjustmentModal open={adjustmentOpen} form={adjustmentForm} error={adjustmentError} saving={savingAdjustment} onChange={setAdjustmentForm} onSave={() => void saveAdjustment()} onClose={() => setAdjustmentOpen(false)} />
  </div>;
}
