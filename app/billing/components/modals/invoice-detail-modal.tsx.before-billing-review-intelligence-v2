"use client";

import {
  AlertTriangle,
  Banknote,
  FileText,
  MapPin,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  DbCustomer,
  DbInventoryItem,
  DbInvoice,
  DbInvoiceAdjustment,
  DbInvoiceEvent,
  DbInvoiceItem,
  DbMaterialUsage,
  DbPayment,
  DbProfile,
  DbSite,
  DbWorkOrder,
  InvoiceTab,
} from "../../types";
import { invoiceStatusLabels } from "../../constants";
import { effectiveInvoiceStatus, formatDate, formatDateTime, money, statusTone } from "../../utils";
import { ModalShell } from "../modal-shell";
import { CompanyBrand } from "@/components/company-brand";

function compactNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function compactUnit(unit: string | null | undefined) {
  const normalized = (unit ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    each: "ea",
    ea: "ea",
    piece: "ea",
    pieces: "ea",
    pcs: "ea",
    meter: "m",
    meters: "m",
    metre: "m",
    metres: "m",
    kilometer: "km",
    kilometers: "km",
    kilometre: "km",
    kilometres: "km",
    kilogram: "kg",
    kilograms: "kg",
    gram: "g",
    grams: "g",
    litre: "L",
    litres: "L",
    liter: "L",
    liters: "L",
    hour: "h",
    hours: "h",
    minute: "min",
    minutes: "min",
  };
  return map[normalized] ?? (unit?.trim() || "ea");
}

function timeQuantityLabel(hoursValue: number) {
  const totalMinutes = Math.max(0, Math.round(hoursValue * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

function materialUnitForLine(
  line: DbInvoiceItem,
  materialUsages: DbMaterialUsage[],
  inventoryItems: DbInventoryItem[],
) {
  if (line.source_type !== "material_usage" || !line.source_id) return "ea";
  const usage = materialUsages.find((candidate) => candidate.id === line.source_id);
  const inventoryItem = usage?.inventory_item_id
    ? inventoryItems.find((candidate) => candidate.id === usage.inventory_item_id)
    : null;
  return compactUnit(inventoryItem?.unit);
}

function invoiceQuantityLabel(
  line: DbInvoiceItem,
  materialUsages: DbMaterialUsage[],
  inventoryItems: DbInventoryItem[],
) {
  const quantity = Number(line.quantity || 0);
  if (line.source_type === "time_entry" || line.source_type === "billing_rule") {
    return timeQuantityLabel(quantity);
  }
  if (line.source_type === "travel_setting") return `${compactNumber(quantity)} km`;
  if (line.line_type === "material") return `${compactNumber(quantity)} ${materialUnitForLine(line, materialUsages, inventoryItems)}`;
  return `${compactNumber(quantity)} ea`;
}

function invoiceRateUnit(
  line: DbInvoiceItem,
  materialUsages: DbMaterialUsage[],
  inventoryItems: DbInventoryItem[],
) {
  if (line.source_type === "time_entry" || line.source_type === "billing_rule") return "h";
  if (line.source_type === "travel_setting") return "km";
  if (line.line_type === "material") return materialUnitForLine(line, materialUsages, inventoryItems);
  return "ea";
}

function displayDescription(line: DbInvoiceItem) {
  if (line.source_type === "billing_rule" && line.description.startsWith("Minimum labour charge")) {
    return line.description.replace("Minimum labour charge", "Minimum labour top-up");
  }
  return line.description;
}

function groupMaterialInvoiceLines(
  lines: DbInvoiceItem[],
  materialUsages: DbMaterialUsage[],
) {
  const usageMap = new Map(materialUsages.map((usage) => [usage.id, usage]));
  const grouped = new Map<string, DbInvoiceItem>();
  const passthrough: DbInvoiceItem[] = [];

  for (const line of lines) {
    if (line.line_type !== "material" || line.source_type !== "material_usage" || !line.source_id) {
      passthrough.push(line);
      continue;
    }

    const usage = usageMap.get(line.source_id);
    if (!usage?.inventory_item_id) {
      passthrough.push(line);
      continue;
    }

    const key = [
      usage.inventory_item_id,
      Number(line.unit_price || 0).toFixed(6),
      line.taxable ? "taxable" : "non-taxable",
    ].join("|");

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...line });
      continue;
    }

    grouped.set(key, {
      ...existing,
      quantity: Number(existing.quantity || 0) + Number(line.quantity || 0),
      line_total: Number(existing.line_total || 0) + Number(line.line_total || 0),
      sort_order: Math.min(Number(existing.sort_order || 0), Number(line.sort_order || 0)),
    });
  }

  return [...passthrough, ...grouped.values()].sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
  );
}

function LineTable({
  lines,
  currency,
  materialUsages,
  inventoryItems,
  allowRemoveManual = false,
  onRemoveManual,
}: {
  lines: DbInvoiceItem[];
  currency: string;
  materialUsages: DbMaterialUsage[];
  inventoryItems: DbInventoryItem[];
  allowRemoveManual?: boolean;
  onRemoveManual?: (line: DbInvoiceItem) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Quantity / Unit</th>
            <th className="px-3 py-2 text-right">Unit price</th>
            <th className="px-3 py-2 text-right">Total</th>
            {allowRemoveManual ? <th className="px-3 py-2 text-right">Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.length === 0 ? (
            <tr>
              <td colSpan={allowRemoveManual ? 5 : 4} className="px-3 py-8 text-center text-sm text-muted-foreground">No items in this section.</td>
            </tr>
          ) : lines.map((line) => {
            const rateUnit = invoiceRateUnit(line, materialUsages, inventoryItems);
            return (
              <tr key={line.id}>
                <td className="px-3 py-3">
                  <div className="text-sm font-bold">{displayDescription(line)}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {line.line_type}{line.taxable ? " · taxable" : ""}
                    {line.source_type === "manual" ? " · manual" : line.source_type === "billing_rule" ? " · billing rule" : ""}
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-sm font-semibold">{invoiceQuantityLabel(line, materialUsages, inventoryItems)}</td>
                <td className="px-3 py-3 text-right text-sm">{money(line.unit_price, currency)} / {rateUnit}</td>
                <td className="px-3 py-3 text-right text-sm font-black">{money(line.line_total, currency)}</td>
                {allowRemoveManual ? (
                  <td className="px-3 py-3 text-right">
                    {line.source_type === "manual" && onRemoveManual ? (
                      <button type="button" onClick={() => onRemoveManual(line)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/40 px-2.5 text-[10px] font-black text-rose-600 hover:bg-rose-500/10">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    ) : <span className="text-[10px] font-bold text-muted-foreground">Source controlled</span>}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceDetailModal({
  invoice,
  customer,
  site,
  workOrder,
  items,
  payments,
  adjustments,
  events,
  profiles,
  today,
  tab,
  onTab,
  onClose,
  onPrint,
  onEditTerms,
  onAddCharge,
  onAddAdjustment,
  onRecordPayment,
  onApprove,
  onSend,
  onVoidInvoice,
  onVoidPayment,
  canManageBilling,
  onRefreshFromWorkOrder,
  materialUsages,
  inventoryItems,
  onAddMaterial,
  onReturnMaterial,
  onSetMaterialBillable,
  travelMode,
  onEditTravelDistance,
  onClearTravelDistance,
  onRemoveManualCharge,
}: {
  invoice: DbInvoice | null;
  customer: DbCustomer | null;
  site: DbSite | null;
  workOrder: DbWorkOrder | null;
  items: DbInvoiceItem[];
  payments: DbPayment[];
  adjustments: DbInvoiceAdjustment[];
  events: DbInvoiceEvent[];
  profiles: DbProfile[];
  today: string | null;
  tab: InvoiceTab;
  onTab: (tab: InvoiceTab) => void;
  onClose: () => void;
  onPrint: () => void;
  onEditTerms: () => void;
  onAddCharge: () => void;
  onAddAdjustment: () => void;
  onRecordPayment: () => void;
  onApprove: () => void;
  onSend: () => void;
  onVoidInvoice: () => void;
  onVoidPayment: (payment: DbPayment) => void;
  canManageBilling: boolean;
  onRefreshFromWorkOrder: () => void;
  materialUsages: DbMaterialUsage[];
  inventoryItems: DbInventoryItem[];
  onAddMaterial: () => void;
  onReturnMaterial: (usage: DbMaterialUsage) => void;
  onSetMaterialBillable: (usage: DbMaterialUsage, billable: boolean) => void;
  travelMode: "time" | "distance" | "none";
  onEditTravelDistance: () => void;
  onClearTravelDistance: () => void;
  onRemoveManualCharge: (line: DbInvoiceItem) => void;
}) {
  if (!invoice) return null;
  const status = effectiveInvoiceStatus(invoice, today);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const displayItems = groupMaterialInvoiceLines(items, materialUsages);
  const labour = displayItems.filter((line) => line.line_type === "labour");
  const materials = displayItems.filter((line) => line.line_type === "material");
  const travelLines = displayItems.filter((line) => line.line_type === "travel");
  const serviceCharges = displayItems.filter((line) => ["service", "equipment", "other"].includes(line.line_type));
  const activeAdjustments = adjustments.filter((adjustment) => adjustment.status === "posted");
  const tabs: Array<{ key: InvoiceTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "edit", label: "Edit Invoice" },
    { key: "activity", label: "Activity" },
  ];
  const editableDraft = canManageBilling && invoice.status === "draft";

  return (
    <ModalShell title={invoice.invoice_number} eyebrow="Invoice" onClose={onClose} width="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase ${statusTone(status)}`}>{invoiceStatusLabels[status] ?? status}</span>
          {workOrder?.billing_status === "review_required" ? <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[10px] font-black uppercase text-rose-700 dark:text-rose-300"><AlertTriangle className="h-3.5 w-3.5" /> Review required</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPrint} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><Printer className="h-4 w-4" /> Print / PDF</button>
          {editableDraft && workOrder ? <button type="button" onClick={onRefreshFromWorkOrder} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className="h-4 w-4" /> Refresh from Work Order</button> : null}
          {editableDraft ? <button type="button" onClick={onApprove} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"><ShieldCheck className="h-4 w-4" /> Approve</button> : null}
          {canManageBilling && ["approved", "ready"].includes(invoice.status) ? <button type="button" onClick={onSend} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"><Send className="h-4 w-4" /> Mark Sent</button> : null}
          {canManageBilling && invoice.status !== "draft" && invoice.status !== "void" ? <button type="button" onClick={onAddAdjustment} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><FileText className="h-4 w-4" /> Credit / Charge</button> : null}
          {canManageBilling && invoice.status !== "void" && invoice.balance_due > 0 && invoice.status !== "draft" ? <button type="button" onClick={onRecordPayment} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white"><Banknote className="h-4 w-4" /> Record Payment</button> : null}
          {canManageBilling && invoice.status !== "void" ? <button type="button" onClick={onVoidInvoice} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-500/40 px-3 text-xs font-black text-rose-600 hover:bg-rose-500/10"><RotateCcw className="h-4 w-4" /> Void</button> : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((item) => <button key={item.key} type="button" onClick={() => onTab(item.key)} className={`rounded-xl px-3 py-2 text-xs font-black ${tab === item.key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>{item.label}</button>)}
      </div>

      {tab === "overview" ? (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4"><CompanyBrand subtitle="Invoice" nameClassName="text-xl font-black" documentTitle={false} /><div className="text-right"><div className="text-[10px] font-black uppercase text-muted-foreground">Invoice</div><div className="mt-1 text-lg font-black">{invoice.invoice_number}</div></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Bill to</div><div className="mt-2 text-lg font-black">{invoice.customer_name_snapshot || customer?.name || "Customer"}</div><div className="mt-1 text-sm text-muted-foreground">{invoice.billing_email_snapshot || customer?.billing_email || "No billing email"}</div>{invoice.site_address_snapshot ? <div className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{invoice.site_address_snapshot}</div> : site ? <div className="mt-2 text-xs text-muted-foreground">{[site.address1, site.address2, site.city, site.province_state, site.postal_code, site.country].filter(Boolean).join(", ")}</div> : null}</section>
            <section className="rounded-xl border border-border p-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><div className="text-[10px] font-black uppercase text-muted-foreground">Issued</div><div className="mt-1 font-bold">{formatDate(invoice.issued_date)}</div></div><div><div className="text-[10px] font-black uppercase text-muted-foreground">Due</div><div className="mt-1 font-bold">{formatDate(invoice.due_date)}</div></div><div><div className="text-[10px] font-black uppercase text-muted-foreground">Work Order</div><div className="mt-1 font-bold">{workOrder?.work_order_number ?? "—"}</div></div><div><div className="text-[10px] font-black uppercase text-muted-foreground">Customer PO</div><div className="mt-1 font-bold">{workOrder?.customer_po || "—"}</div></div></div></section>
          </div>
          <LineTable lines={displayItems} currency={invoice.currency} materialUsages={materialUsages} inventoryItems={inventoryItems} />
          {activeAdjustments.length > 0 ? <section className="rounded-xl border border-border p-4"><div className="mb-3 text-xs font-black uppercase">Adjustments</div><div className="space-y-2">{activeAdjustments.map((adjustment) => <div key={adjustment.id} className="flex items-center justify-between gap-4 text-sm"><div><span className="font-bold">{adjustment.adjustment_type === "credit" ? "Credit note" : "Additional charge"}</span><span className="ml-2 text-muted-foreground">{adjustment.reason}</span></div><div className={`font-black ${adjustment.amount < 0 ? "text-emerald-600" : ""}`}>{money(adjustment.amount, invoice.currency)}</div></div>)}</div></section> : null}
          <div className="ml-auto w-full max-w-sm rounded-xl border border-border p-4 text-sm"><div className="flex justify-between py-1"><span>Subtotal</span><span className="font-bold">{money(invoice.subtotal, invoice.currency)}</span></div><div className="flex justify-between py-1"><span>Discount</span><span className="font-bold">-{money(invoice.discount_amount, invoice.currency)}</span></div><div className="flex justify-between py-1"><span>Tax</span><span className="font-bold">{money(invoice.tax_amount, invoice.currency)}</span></div><div className="mt-2 flex justify-between border-t border-border pt-3 text-base"><span className="font-black">Total</span><span className="font-black">{money(invoice.total, invoice.currency)}</span></div><div className="flex justify-between py-1"><span>Paid</span><span className="font-bold text-emerald-600">{money(invoice.amount_paid, invoice.currency)}</span></div><div className="mt-2 flex justify-between border-t border-border pt-3 text-base"><span className="font-black">Balance Due</span><span className="font-black">{money(invoice.balance_due, invoice.currency)}</span></div></div>
          {payments.length > 0 ? <section className="rounded-xl border border-border p-4"><div className="mb-3 text-xs font-black uppercase">Payments</div><div className="space-y-2">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/20 px-3 py-2.5"><div><div className="text-sm font-black">{payment.payment_method === "tap" ? "Tap" : payment.payment_method === "cash" ? "Cash" : payment.payment_method}</div><div className="text-xs text-muted-foreground">{formatDateTime(payment.received_at)}{payment.reference ? ` · ${payment.reference}` : ""}</div></div><div className="flex items-center gap-3"><div className="text-right"><div className="text-sm font-black">{money(payment.amount, invoice.currency)}</div><div className="text-[10px] font-black uppercase text-muted-foreground">{payment.status}</div></div>{canManageBilling && payment.status === "posted" ? <button type="button" onClick={() => onVoidPayment(payment)} className="rounded-lg border border-rose-500/40 px-2 py-1 text-[10px] font-black text-rose-600">Reverse</button> : null}</div></div>)}</div></section> : null}
          {invoice.notes ? <section className="rounded-xl border border-border p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Notes</div><div className="mt-2 whitespace-pre-line text-sm">{invoice.notes}</div></section> : null}
        </div>
      ) : null}

      {tab === "edit" ? (
        <div className="space-y-5">
          {!editableDraft ? <div className="rounded-xl border border-amber-500/40 bg-amber-950 px-4 py-3 text-sm font-semibold text-amber-100">This invoice is no longer Draft. Source lines are locked. Use Credit / Charge for post-approval financial changes.</div> : null}

          <section className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="text-sm font-black">Invoice Terms</div><div className="mt-1 text-xs text-muted-foreground">Issued {formatDate(invoice.issued_date)} · Due {formatDate(invoice.due_date)} · Tax {(Number(invoice.tax_rate || 0) * 100).toFixed(2).replace(/\.00$/, "")}% · Discount {money(invoice.discount_amount, invoice.currency)}</div></div>
              {editableDraft ? <button type="button" onClick={onEditTerms} className="h-9 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted">Edit Terms</button> : null}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div><div className="text-sm font-black">Actual Labour</div><div className="mt-1 text-xs text-muted-foreground">Labour comes from the Work Order actual-time record. Correct technician time from Dispatch or Work Orders, then refresh this Draft.</div></div>
            <LineTable lines={labour} currency={invoice.currency} materialUsages={materialUsages} inventoryItems={inventoryItems} />
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black">Travel</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {travelMode === "distance"
                    ? `Distance billing is active. Current Work Order distance: ${Number(workOrder?.travel_distance_km || 0).toFixed(2)} km.`
                    : travelMode === "time"
                      ? "Travel is billed from actual Travel time. Change the travel rule in Settings → Billing if you want distance billing."
                      : "Travel billing is disabled in Settings → Billing."}
                </div>
              </div>
              {editableDraft && workOrder && travelMode === "distance" ? <div className="flex gap-2"><button type="button" onClick={onEditTravelDistance} className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"><MapPin className="h-4 w-4" /> {Number(workOrder.travel_distance_km || 0) > 0 ? "Edit Distance" : "Add Distance"}</button>{Number(workOrder.travel_distance_km || 0) > 0 ? <button type="button" onClick={onClearTravelDistance} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-500/40 px-3 text-xs font-black text-rose-600 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /> Remove Distance</button> : null}</div> : null}
            </div>
            <LineTable lines={travelLines} currency={invoice.currency} materialUsages={materialUsages} inventoryItems={inventoryItems} allowRemoveManual={editableDraft} onRemoveManual={onRemoveManualCharge} />
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black">Services & Other Charges</div><div className="mt-1 text-xs text-muted-foreground">Manual service/equipment charges can be added or removed while the invoice is Draft. Billing-rule lines are controlled from Settings.</div></div>{editableDraft ? <button type="button" onClick={onAddCharge} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4" /> Add Service / Charge</button> : null}</div>
            <LineTable lines={serviceCharges} currency={invoice.currency} materialUsages={materialUsages} inventoryItems={inventoryItems} allowRemoveManual={editableDraft} onRemoveManual={onRemoveManualCharge} />
          </section>

          <section className="space-y-4 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black">Inventory Materials</div><div className="mt-1 text-xs text-muted-foreground">Add stock to the Work Order, return unused stock, or remove an already-consumed material from the customer bill.</div></div>{editableDraft && workOrder ? <button type="button" onClick={onAddMaterial} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"><PackagePlus className="h-4 w-4" /> Add from Inventory</button> : null}</div>
            <LineTable lines={materials} currency={invoice.currency} materialUsages={materialUsages} inventoryItems={inventoryItems} />
            <div className="overflow-hidden rounded-xl border border-border">
              {materialUsages.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No inventory material has been consumed on this Work Order.</div> : materialUsages.map((usage) => {
                const remaining = Math.max(0, Number(usage.quantity) - Number(usage.quantity_returned || 0));
                const inventoryItem = usage.inventory_item_id ? inventoryItems.find((item) => item.id === usage.inventory_item_id) : null;
                const unit = compactUnit(inventoryItem?.unit);
                return <div key={usage.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 last:border-0"><div><div className="text-sm font-black">{usage.description}</div><div className="mt-1 text-xs text-muted-foreground">Used {compactNumber(Number(usage.quantity))} {unit} · Returned {compactNumber(Number(usage.quantity_returned || 0))} {unit} · Net {compactNumber(remaining)} {unit} · {usage.billable ? "Included in bill" : "Not billed"}</div></div>{editableDraft ? <div className="flex gap-2"><button type="button" disabled={remaining <= 0} onClick={() => onReturnMaterial(usage)} className="rounded-xl border border-border px-3 py-2 text-[10px] font-black disabled:opacity-40">Return to Inventory</button><button type="button" onClick={() => onSetMaterialBillable(usage, !usage.billable)} className="rounded-xl border border-border px-3 py-2 text-[10px] font-black">{usage.billable ? "Remove from Bill" : "Add to Bill"}</button></div> : null}</div>;
              })}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "activity" ? <div className="space-y-2">{events.length === 0 ? <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">No invoice activity yet.</div> : events.map((event) => <div key={event.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-black">{event.event_type.replaceAll("_", " ")}</div><div className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</div></div><div className="mt-1 text-xs text-muted-foreground">{event.created_by ? (profileMap.get(event.created_by)?.full_name || profileMap.get(event.created_by)?.email || "User") : "System"}</div></div>)}</div> : null}
    </ModalShell>
  );
}
