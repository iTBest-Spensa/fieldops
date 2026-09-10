"use client";
import { Banknote, CreditCard } from "lucide-react";
import type { PaymentForm } from "../../types";
import { ModalShell } from "../modal-shell";
import { money } from "../../utils";

export function RecordPaymentModal({ open, invoiceNumber, balanceDue, currency, form, error, saving, onChange, onSave, onClose }: {
  open: boolean; invoiceNumber: string; balanceDue: number; currency: string; form: PaymentForm; error: string | null; saving: boolean;
  onChange: (form: PaymentForm) => void; onSave: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return <ModalShell title={`Record payment · ${invoiceNumber}`} eyebrow="Billing" onClose={onClose} footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 border border-border px-4 text-sm font-bold">Cancel</button><button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60">{saving ? "Recording…" : "Record Payment"}</button></div>}>
    <div className="mb-5 border border-border bg-muted/30 p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Balance due</div><div className="mt-1 text-2xl font-black">{money(balanceDue, currency)}</div><div className="mt-1 text-xs text-muted-foreground">Partial and split payments are allowed. Record each payment separately.</div></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="mb-1 block text-xs font-black">Amount</span><input value={form.amount} onChange={(e) => onChange({ ...form, amount: e.target.value })} inputMode="decimal" className="h-11 w-full border border-border bg-card px-3" placeholder="0.00" /></label>
      <label><span className="mb-1 block text-xs font-black">Received at</span><input type="datetime-local" value={form.receivedAt} onChange={(e) => onChange({ ...form, receivedAt: e.target.value })} className="h-11 w-full border border-border bg-card px-3" /></label>
    </div>
    <div className="mt-4"><div className="mb-2 text-xs font-black">Payment method</div><div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => onChange({ ...form, method: "cash" })} className={`flex items-center gap-3 border p-4 text-left ${form.method === "cash" ? "border-primary bg-primary/10" : "border-border"}`}><Banknote className="h-5 w-5 text-primary" /><div><div className="font-black">Cash</div><div className="text-xs text-muted-foreground">Physical cash payment</div></div></button>
      <button type="button" onClick={() => onChange({ ...form, method: "tap" })} className={`flex items-center gap-3 border p-4 text-left ${form.method === "tap" ? "border-primary bg-primary/10" : "border-border"}`}><CreditCard className="h-5 w-5 text-primary" /><div><div className="font-black">Tap</div><div className="text-xs text-muted-foreground">Card / terminal payment</div></div></button>
    </div></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="mb-1 block text-xs font-black">Reference / receipt</span><input value={form.reference} onChange={(e) => onChange({ ...form, reference: e.target.value })} className="h-11 w-full border border-border bg-card px-3" placeholder="Optional" /></label><label><span className="mb-1 block text-xs font-black">Notes</span><input value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} className="h-11 w-full border border-border bg-card px-3" placeholder="Optional" /></label></div>
    {error ? <div className="mt-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</div> : null}
  </ModalShell>;
}
