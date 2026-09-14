"use client";

import type {
  DbInventoryItem,
  DbInventoryLocation,
  DbPurchaseOrder,
  DbPurchaseOrderItem,
  ReceivingForm,
} from "../../types";
import { ModalShell } from "../modal-shell";

const input =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export function ReceivePOModal({
  form,
  purchaseOrders,
  poItems,
  items,
  locations,
  error,
  saving,
  onChange,
  onSelectPO,
  onSave,
  onClose,
}: {
  form: ReceivingForm;
  purchaseOrders: DbPurchaseOrder[];
  poItems: DbPurchaseOrderItem[];
  items: DbInventoryItem[];
  locations: DbInventoryLocation[];
  error: string | null;
  saving: boolean;
  onChange: (form: ReceivingForm) => void;
  onSelectPO: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const availablePOs = purchaseOrders.filter(
    (po) =>
      Boolean(form.locationId) &&
      po.destination_location_id === form.locationId &&
      ["approved", "ordered", "partially_received"].includes(po.status) &&
      poItems.some(
        (line) =>
          line.purchase_order_id === po.id &&
          Number(line.quantity_received) < Number(line.quantity_ordered),
      ),
  );

  const setLine = (
    index: number,
    patch: Partial<ReceivingForm["lines"][number]>,
  ) =>
    onChange({
      ...form,
      lines: form.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    });

  return (
    <ModalShell
      title="Receive Purchase Order"
      subtitle="Choose the receiving location first. Only approved/ordered POs for that location are shown. Partial receiving is supported."
      wide
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-xs font-black"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="h-10 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Posting Receipt…" : "Post Receipt"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Receiving Location
          </span>
          <select
            className={input}
            value={form.locationId}
            onChange={(event) =>
              onChange({
                ...form,
                locationId: event.target.value,
                purchaseOrderId: "",
                lines: [],
              })
            }
          >
            <option value="">Choose location</option>
            {locations
              .filter((location) => location.active)
              .map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Purchase Order
          </span>
          <select
            className={input}
            value={form.purchaseOrderId}
            disabled={!form.locationId}
            onChange={(event) => onSelectPO(event.target.value)}
          >
            <option value="">
              {form.locationId
                ? "Choose PO"
                : "Choose receiving location first"}
            </option>
            {availablePOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.po_number} · {po.status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {form.locationId && availablePOs.length === 0 ? (
            <div className="mt-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              No approved, ordered or partially received PO with remaining
              quantity exists for this location.
            </div>
          ) : null}
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Received At
          </span>
          <input
            type="datetime-local"
            className={input}
            value={form.receivedAt}
            onChange={(event) =>
              onChange({ ...form, receivedAt: event.target.value })
            }
          />
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Packing Slip
          </span>
          <input
            className={input}
            value={form.packingSlip}
            onChange={(event) =>
              onChange({ ...form, packingSlip: event.target.value })
            }
          />
        </label>

        <label className="md:col-span-3">
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Notes
          </span>
          <input
            className={input}
            value={form.notes}
            onChange={(event) =>
              onChange({ ...form, notes: event.target.value })
            }
          />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Remaining</th>
              <th className="px-3 py-2">Receive Now</th>
              <th className="px-3 py-2">Damaged</th>
              <th className="px-3 py-2">Unit Cost</th>
            </tr>
          </thead>

          <tbody>
            {form.lines.map((line, index) => {
              const poLine = poItems.find(
                (candidate) => candidate.id === line.purchaseOrderItemId,
              );
              const remaining = poLine
                ? Number(poLine.quantity_ordered) -
                  Number(poLine.quantity_received)
                : 0;

              return (
                <tr
                  key={line.purchaseOrderItemId}
                  className="border-t border-border"
                >
                  <td className="px-3 py-3 text-xs font-bold">
                    {itemMap.get(line.inventoryItemId)?.name ?? "Item"}
                  </td>

                  <td className="px-3 py-3 text-xs font-black">
                    {remaining}
                  </td>

                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      step="0.01"
                      className={input}
                      value={line.quantityReceived}
                      onChange={(event) =>
                        setLine(index, {
                          quantityReceived: event.target.value,
                        })
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      max={line.quantityReceived || "0"}
                      step="0.01"
                      className={input}
                      value={line.quantityDamaged}
                      onChange={(event) =>
                        setLine(index, {
                          quantityDamaged: event.target.value,
                        })
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={input}
                      value={line.unitCost}
                      onChange={(event) =>
                        setLine(index, { unitCost: event.target.value })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {form.purchaseOrderId && !form.lines.length ? (
          <div className="p-5 text-center text-xs text-muted-foreground">
            This purchase order has no remaining quantities.
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-muted-foreground">
        Only the quantity entered under <strong>Receive Now</strong> is posted
        to the receipt. Available stock increases by received quantity minus
        damaged quantity. PO creation alone does not increase stock or
        received-cost reporting.
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}
    </ModalShell>
  );
}
