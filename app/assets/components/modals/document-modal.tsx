"use client";

import { X } from "lucide-react";
import type { DocumentForm } from "../../types";
import { capitalize } from "../../utils";

export function DocumentModal({ form, error, saving, onChange, onSave, onClose }: {
  form: DocumentForm;
  error: string | null;
  saving: boolean;
  onChange: (next: DocumentForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const labelClass = "text-[10px] font-black uppercase tracking-wide text-muted-foreground";
  return (
    <div className="fixed inset-0 z-[97000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close document" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 w-full max-w-[680px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-xs font-black text-primary">Asset Documents</div><h2 className="mt-1 text-xl font-black">Add Document Link</h2></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Document Type</span><select className={inputClass} value={form.documentType} onChange={(e) => onChange({ ...form, documentType: e.target.value })}>{["manual","warranty","purchase","inspection","calibration","registration","photo","other"].map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}</select></label>
            <label><span className={labelClass}>Expiry Date</span><input type="date" className={inputClass} value={form.expiresOn} onChange={(e) => onChange({ ...form, expiresOn: e.target.value })} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Name *</span><input className={inputClass} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></label>
            <label className="md:col-span-2"><span className={labelClass}>URL *</span><input type="url" className={inputClass} value={form.url} onChange={(e) => onChange({ ...form, url: e.target.value })} placeholder="https://..." /></label>
            <label className="md:col-span-2"><span className={labelClass}>Notes</span><textarea className="mt-1 min-h-20 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></label>
          </div>
          <div className="border border-border bg-muted/30 p-3 text-xs text-muted-foreground">V1 stores document links/metadata. It does not introduce a separate file-storage system or alter existing shared infrastructure.</div>
          {error && <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-xs font-black">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add Document"}</button></div>
      </section>
    </div>
  );
}
