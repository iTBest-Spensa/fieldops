"use client";
import { X } from "lucide-react";

export function AddCustomerNoteModal({ open, value, saving, error, onChange, onSave, onClose }: {
  open: boolean; value: string; saving: boolean; error: string | null;
  onChange: (value: string) => void; onSave: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close note" onClick={()=>!saving&&onClose()} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 w-full max-w-[620px] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="text-xs font-semibold text-primary">Customers</div><h2 className="mt-1 text-xl font-black">Add Customer Note</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border"><X className="h-4 w-4" /></button></div>
        <div className="p-5">{error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}<textarea autoFocus rows={7} value={value} onChange={(e)=>onChange(e.target.value)} className="w-full border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" placeholder="Internal customer information..." /></div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4"><button type="button" onClick={onClose} className="h-10 border border-border px-4 text-sm font-black">Cancel</button><button type="button" disabled={saving} onClick={onSave} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add Note"}</button></div>
      </section>
    </div>
  );
}
