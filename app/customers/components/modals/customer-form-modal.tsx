"use client";
import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { CustomerForm } from "../../types";
import { customerStatuses, customerTypes } from "../../constants";
import { capitalize } from "../../utils";

const inputClass = "h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary";

export function CustomerFormModal({ open, mode, form, setForm, saving, error, onSave, onClose }: {
  open: boolean;
  mode: "new" | "edit";
  form: CustomerForm;
  setForm: Dispatch<SetStateAction<CustomerForm>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const isNew = mode === "new";
  const set = (key: keyof CustomerForm, value: string | boolean) => setForm((c) => ({ ...c, [key]: value }));

  return (
    <div className="fixed inset-0 z-[140000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close customer form" onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><div className="text-xs font-semibold text-primary">Customers</div><h2 className="mt-1 text-xl font-black">{isNew ? "New Customer" : "Edit Customer"}</h2></div>
          <button type="button" disabled={saving} onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Customer Name <span className="text-rose-500">*</span></span><input autoFocus value={form.name} onChange={(e)=>set("name",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Account Number</span><input value={form.accountNumber} onChange={(e)=>set("accountNumber",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Status</span><select value={form.status} onChange={(e)=>set("status",e.target.value)} className={inputClass}>{customerStatuses.map((s)=><option key={s} value={s}>{capitalize(s)}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-black">Customer Type</span><select value={form.customerType} onChange={(e)=>set("customerType",e.target.value)} className={inputClass}>{customerTypes.map((t)=><option key={t} value={t}>{capitalize(t)}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-black">Phone</span><input value={form.phone} onChange={(e)=>set("phone",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Email</span><input type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Website</span><input value={form.website} onChange={(e)=>set("website",e.target.value)} className={inputClass} /></label>

            <div className="md:col-span-2 border-t border-border pt-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Billing</div></div>
            <label><span className="mb-1.5 block text-xs font-black">Billing Email</span><input type="email" value={form.billingEmail} onChange={(e)=>set("billingEmail",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Billing Terms (days)</span><input type="number" min={0} max={365} value={form.billingTermsDays} onChange={(e)=>set("billingTermsDays",e.target.value)} className={inputClass} /></label>
            <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.taxExempt} onChange={(e)=>set("taxExempt",e.target.checked)} /><span className="text-sm font-bold">Tax exempt customer</span></label>

            <div className="md:col-span-2 border-t border-border pt-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Billing Address</div></div>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Address</span><input value={form.address1} onChange={(e)=>set("address1",e.target.value)} className={inputClass} /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Address Line 2</span><input value={form.address2} onChange={(e)=>set("address2",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">City</span><input value={form.city} onChange={(e)=>set("city",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Province / State</span><input value={form.provinceState} onChange={(e)=>set("provinceState",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Postal / ZIP Code</span><input value={form.postalCode} onChange={(e)=>set("postalCode",e.target.value)} className={inputClass} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Country</span><input value={form.country} onChange={(e)=>set("country",e.target.value)} className={inputClass} /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Tags</span><input value={form.tags} onChange={(e)=>set("tags",e.target.value)} className={inputClass} placeholder="managed service, vip, nonprofit" /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Customer Notes</span><textarea rows={3} value={form.notes} onChange={(e)=>set("notes",e.target.value)} className="w-full border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" /></label>

            {isNew && <>
              <div className="md:col-span-2 border-t border-border pt-5"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Optional Primary Contact</div></div>
              <label><span className="mb-1.5 block text-xs font-black">First Name</span><input value={form.primaryFirstName} onChange={(e)=>set("primaryFirstName",e.target.value)} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-xs font-black">Last Name</span><input value={form.primaryLastName} onChange={(e)=>set("primaryLastName",e.target.value)} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-xs font-black">Title</span><input value={form.primaryTitle} onChange={(e)=>set("primaryTitle",e.target.value)} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-xs font-black">Contact Email</span><input type="email" value={form.primaryEmail} onChange={(e)=>set("primaryEmail",e.target.value)} className={inputClass} /></label>
              <label><span className="mb-1.5 block text-xs font-black">Contact Phone</span><input value={form.primaryPhone} onChange={(e)=>set("primaryPhone",e.target.value)} className={inputClass} /></label>
            </>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4">
          <button type="button" disabled={saving} onClick={onClose} className="h-10 border border-border px-4 text-sm font-black disabled:opacity-50">Cancel</button>
          <button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : isNew ? "Create Customer" : "Save Customer"}</button>
        </div>
      </section>
    </div>
  );
}
