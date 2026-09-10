"use client";
import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { ContactForm, DbSite } from "../../types";
const cls = "h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary";

export function NewContactModal({ open, form, setForm, sites, saving, error, onSave, onClose }: {
  open: boolean; form: ContactForm; setForm: Dispatch<SetStateAction<ContactForm>>;
  sites: DbSite[]; saving: boolean; error: string | null; onSave: () => void; onClose: () => void;
}) {
  if (!open) return null;
  const set = (key: keyof ContactForm, value: string | boolean) => setForm((c)=>({...c,[key]:value}));
  return (
    <div className="fixed inset-0 z-[150000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close contact" onClick={()=>!saving&&onClose()} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="text-xs font-semibold text-primary">Customers</div><h2 className="mt-1 text-xl font-black">Add Contact</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border"><X className="h-4 w-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="mb-1.5 block text-xs font-black">First Name *</span><input autoFocus value={form.firstName} onChange={(e)=>set("firstName",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Last Name *</span><input value={form.lastName} onChange={(e)=>set("lastName",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Title</span><input value={form.title} onChange={(e)=>set("title",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Site Association</span><select value={form.siteId} onChange={(e)=>set("siteId",e.target.value)} className={cls}><option value="">All customer sites</option>{sites.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-black">Email</span><input type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Phone</span><input value={form.phone} onChange={(e)=>set("phone",e.target.value)} className={cls} /></label>
            <label><span className="mb-1.5 block text-xs font-black">Mobile</span><input value={form.mobile} onChange={(e)=>set("mobile",e.target.value)} className={cls} /></label>
            <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.isPrimary} onChange={(e)=>set("isPrimary",e.target.checked)} /><span className="text-sm font-bold">Primary contact</span></label>
              <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.receivesBilling} onChange={(e)=>set("receivesBilling",e.target.checked)} /><span className="text-sm font-bold">Receives billing</span></label>
              <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.receivesServiceUpdates} onChange={(e)=>set("receivesServiceUpdates",e.target.checked)} /><span className="text-sm font-bold">Service updates</span></label>
              <label className="flex items-center gap-3 border border-border bg-card p-3"><input type="checkbox" checked={form.active} onChange={(e)=>set("active",e.target.checked)} /><span className="text-sm font-bold">Active contact</span></label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4"><button type="button" onClick={onClose} className="h-10 border border-border px-4 text-sm font-black">Cancel</button><button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add Contact"}</button></div>
      </section>
    </div>
  );
}
