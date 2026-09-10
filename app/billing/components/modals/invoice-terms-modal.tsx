"use client";
import type { InvoiceTermsForm } from "../../types";
import { ModalShell } from "../modal-shell";

export function InvoiceTermsModal({ open, form, error, saving, onChange, onSave, onClose }: { open: boolean; form: InvoiceTermsForm; error: string | null; saving: boolean; onChange: (form: InvoiceTermsForm) => void; onSave: () => void; onClose: () => void }) {
  if (!open) return null;
  return <ModalShell title="Invoice terms" eyebrow="Billing" onClose={onClose} footer={<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 border border-border px-4 text-sm font-bold">Cancel</button><button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save Terms"}</button></div>}>
    <div className="grid gap-4 md:grid-cols-2"><label><span className="mb-1 block text-xs font-black">Issued date</span><input type="date" value={form.issuedDate} onChange={(e) => onChange({ ...form, issuedDate: e.target.value })} className="h-11 w-full border border-border bg-card px-3" /></label><label><span className="mb-1 block text-xs font-black">Due date</span><input type="date" value={form.dueDate} onChange={(e) => onChange({ ...form, dueDate: e.target.value })} className="h-11 w-full border border-border bg-card px-3" /></label></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="mb-1 block text-xs font-black">Tax rate (%)</span><input value={form.taxRatePercent} onChange={(e) => onChange({ ...form, taxRatePercent: e.target.value })} inputMode="decimal" className="h-11 w-full border border-border bg-card px-3" /></label><label><span className="mb-1 block text-xs font-black">Discount amount</span><input value={form.discountAmount} onChange={(e) => onChange({ ...form, discountAmount: e.target.value })} inputMode="decimal" className="h-11 w-full border border-border bg-card px-3" /></label></div>
    <label className="mt-4 block"><span className="mb-1 block text-xs font-black">Billing email</span><input type="email" value={form.billingEmail} onChange={(e) => onChange({ ...form, billingEmail: e.target.value })} className="h-11 w-full border border-border bg-card px-3" /></label>
    <label className="mt-4 block"><span className="mb-1 block text-xs font-black">Invoice notes</span><textarea value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} className="min-h-24 w-full border border-border bg-card p-3" /></label>
    {error ? <div className="mt-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</div> : null}
  </ModalShell>;
}
