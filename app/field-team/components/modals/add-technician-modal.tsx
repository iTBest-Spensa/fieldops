"use client";

import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { AddTechnicianForm, DbProfile } from "../../types";

export function AddTechnicianModal({
  open,
  candidates,
  form,
  setForm,
  saving,
  error,
  onSave,
  onClose,
}: {
  open: boolean;
  candidates: DbProfile[];
  form: AddTechnicianForm;
  setForm: Dispatch<SetStateAction<AddTechnicianForm>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const fieldClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close add technician" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 w-full max-w-[720px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"><div><div className="text-xs font-semibold text-primary">Field Team</div><h2 className="mt-1 text-xl font-black">Add Technician</h2><p className="mt-1 text-xs text-muted-foreground">Enable field-work capability for an existing FieldOps account.</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
        <div className="p-5">
          {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">{error}</div>}
          <div className="mb-4 border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">Field Team does not create authentication accounts. User invitations/account creation belong in Settings; this page turns an existing FieldOps user into a technician without handling admin secrets in the browser.</div>
          {candidates.length === 0 ? <div className="border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">No eligible existing FieldOps users are available. Create/invite the user account first, then return here.</div> : <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold md:col-span-2">FieldOps user<select value={form.userId} onChange={(e) => setForm((current) => ({ ...current, userId: e.target.value }))} className={fieldClass}><option value="">Select a user</option>{candidates.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name?.trim() || profile.email || profile.id}{profile.email && profile.full_name ? ` · ${profile.email}` : ""}</option>)}</select></label>
            <label className="text-xs font-bold">Specialty<input value={form.specialty} onChange={(e) => setForm((current) => ({ ...current, specialty: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Service area<input value={form.serviceArea} onChange={(e) => setForm((current) => ({ ...current, serviceArea: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Shift start<input type="time" value={form.shiftStart} onChange={(e) => setForm((current) => ({ ...current, shiftStart: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Shift end<input type="time" value={form.shiftEnd} onChange={(e) => setForm((current) => ({ ...current, shiftEnd: e.target.value }))} className={fieldClass} /></label>
          </div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-sm font-black disabled:opacity-50">Cancel</button><button type="button" onClick={onSave} disabled={saving || candidates.length === 0} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-60">{saving ? "Adding…" : "Add Technician"}</button></div>
      </section>
    </div>
  );
}
