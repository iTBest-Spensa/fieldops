"use client";

import { X } from "lucide-react";
import type { MaintenanceForm, DbWorkOrder } from "../../types";
import { capitalize } from "../../utils";

export function MaintenanceModal({
  mode,
  form,
  workOrders,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  form: MaintenanceForm;
  workOrders: DbWorkOrder[];
  error: string | null;
  saving: boolean;
  onChange: (next: MaintenanceForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const labelClass = "text-[10px] font-black uppercase tracking-wide text-muted-foreground";
  return (
    <div className="fixed inset-0 z-[97000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close maintenance" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-xs font-black text-primary">Asset Maintenance</div><h2 className="mt-1 text-xl font-black">{mode === "create" ? "Add Maintenance" : "Edit Maintenance"}</h2></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Type</span><select className={inputClass} value={form.maintenanceType} onChange={(e) => onChange({ ...form, maintenanceType: e.target.value })}>{["preventive","repair","inspection","calibration","service","other"].map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}</select></label>
            <label><span className={labelClass}>Status</span><select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as MaintenanceForm["status"] })}>{["planned","in_progress","completed","cancelled"].map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}</select></label>
            <label className="md:col-span-2"><span className={labelClass}>Title *</span><input className={inputClass} value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} /></label>
            <label><span className={labelClass}>Scheduled Date</span><input type="date" className={inputClass} value={form.scheduledDate} onChange={(e) => onChange({ ...form, scheduledDate: e.target.value })} /></label>
            <label><span className={labelClass}>Completed Date</span><input type="date" className={inputClass} value={form.completedDate} onChange={(e) => onChange({ ...form, completedDate: e.target.value })} /></label>
            <label><span className={labelClass}>Provider</span><input className={inputClass} value={form.provider} onChange={(e) => onChange({ ...form, provider: e.target.value })} /></label>
            <label><span className={labelClass}>Cost</span><input type="number" min="0" step="0.01" className={inputClass} value={form.cost} onChange={(e) => onChange({ ...form, cost: e.target.value })} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Related Work Order</span><select className={inputClass} value={form.workOrderId} onChange={(e) => onChange({ ...form, workOrderId: e.target.value })}><option value="">No work order</option>{workOrders.map((o) => <option key={o.id} value={o.id}>{o.work_order_number} · {o.title}</option>)}</select></label>
            <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea className="mt-1 min-h-24 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></label>
            <label className="md:col-span-2"><span className={labelClass}>Notes</span><textarea className="mt-1 min-h-20 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></label>
          </div>
          {error && <div className="mt-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-xs font-black disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save Maintenance"}</button>
        </div>
      </section>
    </div>
  );
}
