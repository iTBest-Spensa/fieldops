"use client";
import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { SiteForm } from "../../types";
const cls = "h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary";

export function NewSiteModal({ open, form, setForm, saving, error, onSave, onClose }: {
  open: boolean; form: SiteForm; setForm: Dispatch<SetStateAction<SiteForm>>;
  saving: boolean; error: string | null; onSave: () => void; onClose: () => void;
}) {
  if (!open) return null;
  const set = (key: keyof SiteForm, value: string | boolean) => setForm((c)=>({...c,[key]:value}));
  return (
    <div className="fixed inset-0 z-[150000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close site" onClick={()=>!saving&&onClose()} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="text-xs font-semibold text-primary">Customers</div><h2 className="mt-1 text-xl font-black">Add Service Site</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border"><X className="h-4 w-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Site Name *</span><input autoFocus value={form.name} onChange={(e)=>set("name",e.target.value)} className={cls} /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Address</span><input value={form.address1} onChange={(e)=>set("address1",e.target.value)} className={cls} /></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Address Line 2</span><input value={form.address2} onChange={(e)=>set("address2",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">City</span><input value={form.city} onChange={(e)=>set("city",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Province / State</span><input value={form.provinceState} onChange={(e)=>set("provinceState",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Postal / ZIP</span><input value={form.postalCode} onChange={(e)=>set("postalCode",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Country</span><input value={form.country} onChange={(e)=>set("country",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Site Phone</span><input value={form.phone} onChange={(e)=>set("phone",e.target.value)} className={cls} /></label>
            <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.active} onChange={(e)=>set("active",e.target.checked)} /><span className="text-sm font-bold">Active service site</span></label>
            <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-black">Access / Dispatch Instructions</span><textarea rows={4} value={form.instructions} onChange={(e)=>set("instructions",e.target.value)} className="w-full border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" /></label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4"><button type="button" onClick={onClose} className="h-10 border border-border px-4 text-sm font-black">Cancel</button><button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add Site"}</button></div>
      </section>
    </div>
  );
}
