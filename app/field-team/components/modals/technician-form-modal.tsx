"use client";

import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DbProfile, TechnicianForm } from "../../types";
import { employmentTypes } from "../../constants";
import { capitalize } from "../../utils";

export function TechnicianFormModal({
  open,
  profile,
  form,
  setForm,
  saving,
  error,
  onSave,
  onClose,
}: {
  open: boolean;
  profile: DbProfile | null;
  form: TechnicianForm;
  setForm: Dispatch<SetStateAction<TechnicianForm>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!open || !profile) return null;
  const fieldClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close technician editor" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-xs font-semibold text-primary">Field Team</div><h2 className="mt-1 text-xl font-black">Edit Technician</h2><p className="mt-1 text-xs text-muted-foreground">{profile.email ?? "No account email"}</p></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold">Full name<input value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Phone<input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Employee number<input value={form.employeeNumber} onChange={(e) => setForm((current) => ({ ...current, employeeNumber: e.target.value }))} className={fieldClass} placeholder="Optional" /></label>
            <label className="text-xs font-bold">Job title<input value={form.jobTitle} onChange={(e) => setForm((current) => ({ ...current, jobTitle: e.target.value }))} className={fieldClass} placeholder="Technician" /></label>
            <label className="text-xs font-bold">Employment type<select value={form.employmentType} onChange={(e) => setForm((current) => ({ ...current, employmentType: e.target.value as TechnicianForm["employmentType"] }))} className={fieldClass}>{employmentTypes.map((item) => <option key={item} value={item}>{capitalize(item)}</option>)}</select></label>
            <label className="text-xs font-bold">Hire date<input type="date" value={form.hireDate} onChange={(e) => setForm((current) => ({ ...current, hireDate: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Specialty<input value={form.specialty} onChange={(e) => setForm((current) => ({ ...current, specialty: e.target.value }))} className={fieldClass} placeholder="Network, HVAC, Electrical..." /></label>
            <label className="text-xs font-bold">Service area<input value={form.serviceArea} onChange={(e) => setForm((current) => ({ ...current, serviceArea: e.target.value }))} className={fieldClass} placeholder="Kamloops, North Shore..." /></label>
            <label className="text-xs font-bold">Home base<input value={form.homeBase} onChange={(e) => setForm((current) => ({ ...current, homeBase: e.target.value }))} className={fieldClass} placeholder="Office, warehouse, branch..." /></label>
            <div />
            <label className="text-xs font-bold">Shift start<input type="time" value={form.shiftStart} onChange={(e) => setForm((current) => ({ ...current, shiftStart: e.target.value }))} className={fieldClass} /></label>
            <label className="text-xs font-bold">Shift end<input type="time" value={form.shiftEnd} onChange={(e) => setForm((current) => ({ ...current, shiftEnd: e.target.value }))} className={fieldClass} /></label>
          </div>
          <label className="mt-5 flex items-start gap-3 border border-border bg-muted/20 p-4 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))} className="mt-1" />
            <span><span className="font-black">Active in FieldOps</span><span className="mt-1 block text-xs text-muted-foreground">Turning this off removes the technician from live Dispatch availability while preserving historical assignments and time. Use Schedule for temporary vacation or sick time.</span></span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4"><button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-sm font-black disabled:opacity-50">Cancel</button><button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save Technician"}</button></div>
      </section>
    </div>
  );
}
