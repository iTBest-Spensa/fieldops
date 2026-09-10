"use client";

import { X } from "lucide-react";

export function AddAssetNoteModal({ note, error, saving, onChange, onSave, onClose }: {
  note: string;
  error: string | null;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[97000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close note" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 w-full max-w-[620px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"><div><div className="text-xs font-black text-primary">Assets</div><h2 className="mt-1 text-xl font-black">Add Internal Note</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
        <div className="p-5"><textarea className="min-h-36 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={note} onChange={(e) => onChange(e.target.value)} placeholder="Asset history, condition, handoff or administrative note" />{error && <div className="mt-3 border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}</div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-xs font-black">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add Note"}</button></div>
      </section>
    </div>
  );
}
