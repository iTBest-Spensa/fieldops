"use client";

import type {
  DbInventoryItem,
  DbInventoryLocation,
  DbPurchaseOrder,
  DbPurchaseOrderItem,
  DbSupplier,
} from "../../types";
import {
  capitalize,
  formatDate,
  formatDateTime,
  money,
  purchaseOrderStatusTone,
} from "../../utils";
import { ModalShell } from "../modal-shell";

export function PurchaseOrderDetailModal({
  po,
  lines,
  supplier,
  location,
  itemMap,
  canManage,
  saving,
  onStatus,
  onClose,
}: {
  po: DbPurchaseOrder;
  lines: DbPurchaseOrderItem[];
  supplier: DbSupplier | null;
  location: DbInventoryLocation | null;
  itemMap: Map<string, DbInventoryItem>;
  canManage: boolean;
  saving: boolean;
  onStatus: (
    status: "approved" | "ordered" | "closed" | "cancelled",
  ) => void;
  onClose: () => void;
}) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity_ordered * line.unit_cost,
    0,
  );
  const remaining = lines.reduce(
    (sum, line) =>
      sum + Math.max(0, line.quantity_ordered - line.quantity_received),
    0,
  );

  return (
    <ModalShell
      title={`${po.po_number} · ${supplier?.name ?? "Supplier"}`}
      subtitle={`Created ${formatDateTime(po.created_at)} · Replenishment location: ${
        location?.name ?? "Not assigned"
      }`}
      wide
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Receiving updates actual quantities. A PO cannot be closed while
            ordered quantity remains.
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage && po.status === "draft" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onStatus("approved")}
                className="h-9 rounded-xl border border-violet-500 px-3 text-xs font-black text-violet-600"
              >
                Approve
              </button>
            ) : null}

            {canManage && po.status === "approved" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onStatus("ordered")}
                className="h-9 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground"
              >
                Mark Ordered
              </button>
            ) : null}

            {canManage &&
            ["draft", "approved", "ordered"].includes(po.status) ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onStatus("cancelled")}
                className="h-9 rounded-xl border border-rose-500 px-3 text-xs font-black text-rose-600"
              >
                Cancel PO
              </button>
            ) : null}

            {canManage && po.status === "received" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onStatus("closed")}
                className="h-9 rounded-xl border border-border px-3 text-xs font-black"
              >
                Close PO
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] font-black uppercase text-muted-foreground">
            Status
          </div>
          <span
            className={`mt-2 inline-block rounded-lg border px-2 py-1 text-[9px] font-black uppercase ${purchaseOrderStatusTone(
              po.status,
            )}`}
          >
            {capitalize(po.status)}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] font-black uppercase text-muted-foreground">
            Destination
          </div>
          <div className="mt-2 text-sm font-black">
            {location?.name ?? "Not assigned"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] font-black uppercase text-muted-foreground">
            Expected
          </div>
          <div className="mt-2 text-sm font-black">
            {formatDate(po.expected_date)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] font-black uppercase text-muted-foreground">
            Remaining
          </div>
          <div className="mt-2 text-sm font-black">{remaining}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[10px] font-black uppercase text-muted-foreground">
            Total
          </div>
          <div className="mt-2 text-sm font-black">
            {money(subtotal + po.shipping_amount + po.tax_amount)}
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Supplier SKU</th>
              <th className="px-3 py-2">Ordered</th>
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2">Remaining</th>
              <th className="px-3 py-2">Unit Cost</th>
              <th className="px-3 py-2">Line Total</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-border">
                <td className="px-3 py-3 text-xs font-bold">
                  {itemMap.get(line.inventory_item_id)?.name ??
                    line.description}
                </td>
                <td className="px-3 py-3 text-xs">
                  {line.supplier_sku || "—"}
                </td>
                <td className="px-3 py-3 text-xs font-bold">
                  {line.quantity_ordered}
                </td>
                <td className="px-3 py-3 text-xs font-bold">
                  {line.quantity_received}
                </td>
                <td className="px-3 py-3 text-xs font-black">
                  {line.quantity_ordered - line.quantity_received}
                </td>
                <td className="px-3 py-3 text-xs">
                  {money(line.unit_cost)}
                </td>
                <td className="px-3 py-3 text-xs font-black">
                  {money(line.quantity_ordered * line.unit_cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {po.notes ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs">
          <span className="font-black">Notes:</span> {po.notes}
        </div>
      ) : null}
    </ModalShell>
  );
}
