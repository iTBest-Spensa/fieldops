"use client";

import { X } from "lucide-react";
import type { AssetAssignmentForm, DbCustomer, DbInventoryLocation, DbProfile, DbSite, DbWorkOrder } from "../../types";
import { profileName, siteLabel } from "../../utils";

export function AssignmentModal({
  assetName,
  form,
  profiles,
  customers,
  sites,
  workOrders,
  locations,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  assetName: string;
  form: AssetAssignmentForm;
  profiles: DbProfile[];
  customers: DbCustomer[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  locations: DbInventoryLocation[];
  error: string | null;
  saving: boolean;
  onChange: (next: AssetAssignmentForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const inputClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const labelClass = "text-[10px] font-black uppercase tracking-wide text-muted-foreground";
  const filteredSites = form.customerId ? sites.filter((site) => site.customer_id === form.customerId) : sites;
  const filteredWorkOrders = form.customerId ? workOrders.filter((order) => order.customer_id === form.customerId) : workOrders;

  return (
    <div className="fixed inset-0 z-[96000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close assignment" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative z-10 w-full max-w-[720px] border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-xs font-black text-primary">Asset Assignment</div><h2 className="mt-1 text-xl font-black">{assetName}</h2></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block"><span className={labelClass}>Destination</span><select className={inputClass} value={form.targetType} onChange={(e) => onChange({ ...form, targetType: e.target.value as AssetAssignmentForm["targetType"], technicianId: "", siteId: "", workOrderId: "", locationId: "" })}>
            <option value="available">Return / Available</option>
            <option value="technician">Technician / Staff</option>
            <option value="customer">Customer</option>
            <option value="site">Customer Site</option>
            <option value="work_order">Work Order</option>
            <option value="storage">Storage Location</option>
          </select></label>

          {form.targetType === "technician" && <label className="block"><span className={labelClass}>Technician / Staff</span><select className={inputClass} value={form.technicianId} onChange={(e) => onChange({ ...form, technicianId: e.target.value })}><option value="">Select staff</option>{profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{profileName(p)}</option>)}</select></label>}

          {["customer", "site", "work_order"].includes(form.targetType) && <label className="block"><span className={labelClass}>Customer</span><select className={inputClass} value={form.customerId} onChange={(e) => onChange({ ...form, customerId: e.target.value, siteId: "", workOrderId: "" })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}

          {form.targetType === "site" && <label className="block"><span className={labelClass}>Site</span><select className={inputClass} value={form.siteId} onChange={(e) => onChange({ ...form, siteId: e.target.value })}><option value="">Select site</option>{filteredSites.map((s) => <option key={s.id} value={s.id}>{siteLabel(s)}</option>)}</select></label>}

          {form.targetType === "work_order" && <label className="block"><span className={labelClass}>Work Order</span><select className={inputClass} value={form.workOrderId} onChange={(e) => onChange({ ...form, workOrderId: e.target.value })}><option value="">Select work order</option>{filteredWorkOrders.filter((o) => !["closed", "cancelled"].includes(o.status)).map((o) => <option key={o.id} value={o.id}>{o.work_order_number} · {o.title}</option>)}</select></label>}

          {form.targetType === "storage" && <label className="block"><span className={labelClass}>Storage Location</span><select className={inputClass} value={form.locationId} onChange={(e) => onChange({ ...form, locationId: e.target.value })}><option value="">Select location</option>{locations.filter((l) => l.active).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}

          <label className="block"><span className={labelClass}>Transfer Note</span><textarea className="mt-1 min-h-24 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} placeholder="Optional handoff, location, condition or reason" /></label>
          <div className="border border-border bg-muted/30 p-3 text-xs text-muted-foreground">This action changes the current asset assignment and writes a permanent assignment-history event.</div>
          {error && <div className="border border-rose-500/40 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 border border-border px-4 text-xs font-black disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onSave} disabled={saving} className="h-10 bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Confirm Assignment"}</button>
        </div>
      </section>
    </div>
  );
}
