"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, WalletCards, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AccountsShell } from "../components/accounts-shell";

type Supplier = { id: string; name: string; payment_terms_days: number };
type PurchaseOrder = { id: string; po_number: string; supplier_id: string; status: string };
type VendorBill = {
  id: string; supplier_id: string; purchase_order_id: string | null; vendor_bill_number: string;
  bill_date: string; due_date: string; status: string; subtotal: number; tax_amount: number;
  total: number; amount_paid: number; balance_due: number; currency: string; notes: string | null;
  created_at: string;
};
type VendorPayment = { id: string; vendor_bill_id: string; amount: number; payment_method: string; paid_at: string; status: string; reference: string | null };

const money = (value: number, currency = "CAD") => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value || 0));
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function AccountsPayablePage() {
  const supabase = useMemo(() => createClient(), []);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<VendorBill | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [billForm, setBillForm] = useState({ supplierId: "", purchaseOrderId: "", vendorBillNumber: "", billDate: "", dueDate: "", subtotal: "", taxAmount: "0", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "bank", paidAt: "", reference: "", notes: "" });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Sign in to open Accounts Payable."); setLoading(false); return; }
    const [supplierResult, poResult, billResult, paymentResult, roleResult] = await Promise.all([
      supabase.from("inventory_suppliers").select("id,name,payment_terms_days").eq("active", true).order("name"),
      supabase.from("inventory_purchase_orders").select("id,po_number,supplier_id,status").order("created_at", { ascending: false }),
      supabase.from("accounting_vendor_bills").select("id,supplier_id,purchase_order_id,vendor_bill_number,bill_date,due_date,status,subtotal,tax_amount,total,amount_paid,balance_due,currency,notes,created_at").order("due_date"),
      supabase.from("accounting_vendor_payments").select("id,vendor_bill_id,amount,payment_method,paid_at,status,reference").order("paid_at", { ascending: false }),
      supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    ]);
    const firstError = supplierResult.error || poResult.error || billResult.error || paymentResult.error || roleResult.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    setSuppliers((supplierResult.data ?? []) as Supplier[]);
    setPurchaseOrders((poResult.data ?? []) as PurchaseOrder[]);
    setBills((billResult.data ?? []) as VendorBill[]);
    setPayments((paymentResult.data ?? []) as VendorPayment[]);
    const roles = (roleResult.data ?? []).map((row) => row.role);
    setCanManage(roles.some((role) => ["admin", "manager", "billing"].includes(role)));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  const openBills = bills.filter((bill) => bill.status !== "void" && Number(bill.balance_due) > 0.005);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = openBills.filter((bill) => new Date(`${bill.due_date}T00:00:00`).getTime() < today.getTime());
  const dueSoon = openBills.filter((bill) => {
    const days = Math.ceil((new Date(`${bill.due_date}T00:00:00`).getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 7;
  });
  const paidThisMonth = payments.filter((payment) => {
    if (payment.status !== "posted") return false;
    const date = new Date(payment.paid_at);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  function openNewBill() {
    const now = new Date();
    const due = new Date(now); due.setDate(due.getDate() + 30);
    setBillForm({ supplierId: suppliers[0]?.id ?? "", purchaseOrderId: "", vendorBillNumber: "", billDate: dateValue(now), dueDate: dateValue(due), subtotal: "", taxAmount: "0", notes: "" });
    setNotice(null); setBillOpen(true);
  }

  function updateSupplier(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    const billDate = billForm.billDate ? new Date(`${billForm.billDate}T00:00:00`) : new Date();
    const due = new Date(billDate); due.setDate(due.getDate() + Number(supplier?.payment_terms_days ?? 30));
    setBillForm((current) => ({ ...current, supplierId, purchaseOrderId: "", dueDate: dateValue(due) }));
  }

  async function saveBill() {
    const subtotal = Number(billForm.subtotal), tax = Number(billForm.taxAmount || 0);
    if (!billForm.supplierId || !billForm.vendorBillNumber.trim() || !billForm.billDate || !billForm.dueDate) { setNotice("Supplier, vendor bill number, bill date and due date are required."); return; }
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tax) || tax < 0 || subtotal + tax <= 0) { setNotice("Enter a valid bill amount greater than zero."); return; }
    setSaving(true); setNotice(null);
    const { error: rpcError } = await supabase.rpc("fieldops_create_vendor_bill", {
      p_supplier_id: billForm.supplierId,
      p_purchase_order_id: billForm.purchaseOrderId || null,
      p_vendor_bill_number: billForm.vendorBillNumber.trim(),
      p_bill_date: billForm.billDate,
      p_due_date: billForm.dueDate,
      p_subtotal: subtotal,
      p_tax_amount: tax,
      p_notes: billForm.notes.trim() || null,
    });
    setSaving(false);
    if (rpcError) { setNotice(rpcError.message); return; }
    setBillOpen(false); await loadData();
  }

  function openPayment(bill: VendorBill) {
    setPaymentBill(bill); setNotice(null);
    setPaymentForm({ amount: Number(bill.balance_due).toFixed(2), paymentMethod: "bank", paidAt: new Date().toISOString().slice(0, 16), reference: "", notes: "" });
  }

  async function savePayment() {
    if (!paymentBill) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(paymentBill.balance_due) + 0.005) { setNotice("Payment must be greater than zero and cannot exceed the bill balance."); return; }
    setSaving(true); setNotice(null);
    const { error: rpcError } = await supabase.rpc("fieldops_record_vendor_payment", {
      p_vendor_bill_id: paymentBill.id,
      p_amount: amount,
      p_payment_method: paymentForm.paymentMethod,
      p_paid_at: new Date(paymentForm.paidAt).toISOString(),
      p_reference: paymentForm.reference.trim() || null,
      p_notes: paymentForm.notes.trim() || null,
    });
    setSaving(false);
    if (rpcError) { setNotice(rpcError.message); return; }
    setPaymentBill(null); await loadData();
  }

  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const eligiblePurchaseOrders = purchaseOrders.filter((po) => po.supplier_id === billForm.supplierId && !["cancelled"].includes(po.status));

  return (
    <AccountsShell
      active="payable"
      title="Accounts Payable"
      description="Vendor bills, outstanding liabilities, due dates and payments made by the company."
      actions={<button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className="h-4 w-4"/>Refresh</button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open Payables" value={money(openBills.reduce((sum, bill) => sum + Number(bill.balance_due || 0), 0))} detail={`${openBills.length} unpaid bill${openBills.length === 1 ? "" : "s"}`} />
        <Metric label="Overdue" value={money(overdue.reduce((sum, bill) => sum + Number(bill.balance_due || 0), 0))} detail={`${overdue.length} overdue`} />
        <Metric label="Due in 7 Days" value={money(dueSoon.reduce((sum, bill) => sum + Number(bill.balance_due || 0), 0))} detail={`${dueSoon.length} coming due`} />
        <Metric label="Paid This Month" value={money(paidThisMonth)} detail="Posted vendor payments" />
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div><h2 className="font-black">Vendor Bills</h2><p className="mt-1 text-xs text-muted-foreground">Approved bills create Accounts Payable and appear in AP aging until paid.</p></div>
          {canManage ? <button type="button" onClick={openNewBill} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"><Plus className="h-4 w-4"/>Add Vendor Bill</button> : null}
        </div>
        {error ? <div className="m-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600">{error}</div> : null}
        {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading Accounts Payable…</div> : bills.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No vendor bills yet.</div> : (
          <div className="overflow-x-auto p-3"><table className="w-full min-w-[920px] border-separate border-spacing-y-2 text-sm"><thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Supplier</th><th>Bill</th><th>Bill Date</th><th>Due</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th>Status</th><th></th></tr></thead><tbody>{bills.map((bill) => <tr key={bill.id} className="rounded-xl bg-background shadow-sm"><td className="rounded-l-xl px-3 py-3 font-bold">{supplierMap.get(bill.supplier_id)?.name ?? "Supplier"}</td><td>{bill.vendor_bill_number}</td><td>{bill.bill_date}</td><td>{bill.due_date}</td><td className="text-right font-semibold">{money(bill.total, bill.currency)}</td><td className="text-right">{money(bill.amount_paid, bill.currency)}</td><td className="text-right font-black">{money(bill.balance_due, bill.currency)}</td><td><span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-black uppercase">{bill.status.replaceAll("_", " ")}</span></td><td className="rounded-r-xl text-right">{canManage && Number(bill.balance_due) > 0 && bill.status !== "void" ? <button type="button" onClick={() => openPayment(bill)} className="rounded-xl border border-border px-3 py-2 text-xs font-black hover:bg-muted">Pay</button> : null}</td></tr>)}</tbody></table></div>
        )}
      </section>

      {billOpen ? <Modal title="Add Vendor Bill" onClose={() => setBillOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier"><select value={billForm.supplierId} onChange={(e) => updateSupplier(e.target.value)} className="input-rounded"><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
          <Field label="Purchase Order"><select value={billForm.purchaseOrderId} onChange={(e) => setBillForm((current) => ({ ...current, purchaseOrderId: e.target.value }))} className="input-rounded"><option value="">No PO / manual bill</option>{eligiblePurchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.po_number} · {po.status}</option>)}</select></Field>
          <Field label="Vendor Bill #"><input value={billForm.vendorBillNumber} onChange={(e) => setBillForm((current) => ({ ...current, vendorBillNumber: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Bill Date"><input type="date" value={billForm.billDate} onChange={(e) => setBillForm((current) => ({ ...current, billDate: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Due Date"><input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((current) => ({ ...current, dueDate: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Subtotal"><input inputMode="decimal" value={billForm.subtotal} onChange={(e) => setBillForm((current) => ({ ...current, subtotal: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Tax"><input inputMode="decimal" value={billForm.taxAmount} onChange={(e) => setBillForm((current) => ({ ...current, taxAmount: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Notes"><input value={billForm.notes} onChange={(e) => setBillForm((current) => ({ ...current, notes: e.target.value }))} className="input-rounded"/></Field>
        </div>
        {notice ? <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">{notice}</div> : null}
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setBillOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} onClick={() => void saveBill()} className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Post Vendor Bill"}</button></div>
      </Modal> : null}

      {paymentBill ? <Modal title={`Pay ${paymentBill.vendor_bill_number}`} onClose={() => setPaymentBill(null)}>
        <div className="rounded-2xl bg-muted/50 p-4"><div className="text-xs text-muted-foreground">Balance due</div><div className="mt-1 text-2xl font-black">{money(paymentBill.balance_due, paymentBill.currency)}</div></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Amount"><input inputMode="decimal" value={paymentForm.amount} onChange={(e) => setPaymentForm((current) => ({ ...current, amount: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Payment Method"><select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((current) => ({ ...current, paymentMethod: e.target.value }))} className="input-rounded"><option value="bank">Bank</option><option value="etransfer">e-Transfer</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="cash">Cash</option></select></Field>
          <Field label="Paid At"><input type="datetime-local" value={paymentForm.paidAt} onChange={(e) => setPaymentForm((current) => ({ ...current, paidAt: e.target.value }))} className="input-rounded"/></Field>
          <Field label="Reference"><input value={paymentForm.reference} onChange={(e) => setPaymentForm((current) => ({ ...current, reference: e.target.value }))} className="input-rounded"/></Field>
        </div>
        {notice ? <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">{notice}</div> : null}
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setPaymentBill(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Cancel</button><button disabled={saving} onClick={() => void savePayment()} className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Record Payment"}</button></div>
      </Modal> : null}

      <style jsx global>{`.input-rounded{height:2.75rem;width:100%;border:1px solid hsl(var(--border));border-radius:.75rem;background:hsl(var(--card));padding:0 .75rem;font-size:.875rem;color:hsl(var(--foreground));outline:none}.input-rounded:focus{box-shadow:0 0 0 2px hsl(var(--ring)/.25)}`}</style>
    </AccountsShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground"><WalletCards className="h-4 w-4"/>{label}</div><div className="mt-3 text-2xl font-black">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black">{label}</span>{children}</label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4"><button type="button" aria-label="Close" className="absolute inset-0 bg-black/55" onClick={onClose}/><section className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{title}</h3><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-muted"><X className="h-4 w-4"/></button></div><div className="mt-5">{children}</div></section></div>; }
