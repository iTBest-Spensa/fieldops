"use client";

import { X } from "lucide-react";
import type { AssetForm } from "../../types";
import { assetConditions, assetOwnerships, assetStatuses } from "../../constants";
import { assetStatusLabel, capitalize } from "../../utils";

export function AssetFormModal({
  mode,
  form,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  form: AssetForm;
  error: string | null;
  saving: boolean;
  onChange: (next: AssetForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const areaClass = "mt-1 min-h-24 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  const labelClass = "text-[10px] font-black uppercase tracking-wide text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[95000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close asset form" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-xs font-black text-primary">Assets</div>
            <h2 className="mt-1 text-xl font-black">{mode === "create" ? "New Asset" : "Edit Asset"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label><span className={labelClass}>Asset Tag</span><input className={inputClass} value={form.assetTag} onChange={(e) => onChange({ ...form, assetTag: e.target.value })} placeholder="Auto-generated if blank" /></label>
            <label><span className={labelClass}>Asset Name</span><input className={inputClass} value={form.assetName} onChange={(e) => onChange({ ...form, assetName: e.target.value })} placeholder="e.g. Nina's Service Laptop" /></label>
            <label><span className={labelClass}>Serial Number</span><input className={inputClass} value={form.serialNumber} onChange={(e) => onChange({ ...form, serialNumber: e.target.value })} /></label>
            <label><span className={labelClass}>Asset Type *</span><input className={inputClass} value={form.assetType} onChange={(e) => onChange({ ...form, assetType: e.target.value })} placeholder="Laptop, Vehicle, Tool..." /></label>
            <label><span className={labelClass}>Category</span><input className={inputClass} value={form.category} onChange={(e) => onChange({ ...form, category: e.target.value })} /></label>
            <label><span className={labelClass}>Ownership</span><select className={inputClass} value={form.ownership} onChange={(e) => onChange({ ...form, ownership: e.target.value as AssetForm["ownership"] })}>{assetOwnerships.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}</select></label>
            <label><span className={labelClass}>Manufacturer</span><input className={inputClass} value={form.manufacturer} onChange={(e) => onChange({ ...form, manufacturer: e.target.value })} /></label>
            <label><span className={labelClass}>Model</span><input className={inputClass} value={form.model} onChange={(e) => onChange({ ...form, model: e.target.value })} /></label>
            <label><span className={labelClass}>Condition</span><select className={inputClass} value={form.condition} onChange={(e) => onChange({ ...form, condition: e.target.value as AssetForm["condition"] })}>{assetConditions.map((v) => <option key={v} value={v}>{capitalize(v)}</option>)}</select></label>
            <label><span className={labelClass}>Status</span><select className={inputClass} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as AssetForm["status"] })}>{assetStatuses.filter((v) => mode === "edit" || !["assigned", "in_use"].includes(v)).map((v) => <option key={v} value={v}>{assetStatusLabel(v)}</option>)}</select></label>
            <label><span className={labelClass}>Purchase Date</span><input type="date" className={inputClass} value={form.purchaseDate} onChange={(e) => onChange({ ...form, purchaseDate: e.target.value })} /></label>
            <label><span className={labelClass}>Purchase Cost</span><input type="number" min="0" step="0.01" className={inputClass} value={form.purchaseCost} onChange={(e) => onChange({ ...form, purchaseCost: e.target.value })} /></label>
            <label><span className={labelClass}>Replacement Cost</span><input type="number" min="0" step="0.01" className={inputClass} value={form.replacementCost} onChange={(e) => onChange({ ...form, replacementCost: e.target.value })} /></label>
            <label><span className={labelClass}>Vendor</span><input className={inputClass} value={form.purchaseVendor} onChange={(e) => onChange({ ...form, purchaseVendor: e.target.value })} /></label>
            <label><span className={labelClass}>Purchase Order</span><input className={inputClass} value={form.purchaseOrder} onChange={(e) => onChange({ ...form, purchaseOrder: e.target.value })} /></label>
            <label><span className={labelClass}>Warranty Expires</span><input type="date" className={inputClass} value={form.warrantyExpiresOn} onChange={(e) => onChange({ ...form, warrantyExpiresOn: e.target.value })} /></label>
            <label><span className={labelClass}>In Service Date</span><input type="date" className={inputClass} value={form.inServiceDate} onChange={(e) => onChange({ ...form, inServiceDate: e.target.value })} /></label>
            <label><span className={labelClass}>Next Service Date</span><input type="date" className={inputClass} value={form.nextServiceDate} onChange={(e) => onChange({ ...form, nextServiceDate: e.target.value })} /></label>
            {(form.status === "disposed" || form.status === "retired") && <label><span className={labelClass}>Disposal / Retirement Method</span><input className={inputClass} value={form.disposalMethod} onChange={(e) => onChange({ ...form, disposalMethod: e.target.value })} /></label>}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label><span className={labelClass}>Description</span><textarea className={areaClass} value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} /></label>
            <label><span className={labelClass}>General Notes</span><textarea className={areaClass} value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} /></label>
          </div>
          <div className="mt-4 border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Use <span className="font-black text-foreground">Change Assignment</span> for technician, customer, site, work-order or storage moves. Assignment changes are recorded in history.
          </div>
          {error && <div className="mt-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-xs font-black disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : mode === "create" ? "Create Asset" : "Save Changes"}</button>
        </div>
      </section>
    </div>
  );
}
