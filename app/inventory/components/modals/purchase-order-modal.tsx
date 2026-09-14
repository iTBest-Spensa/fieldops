"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  DbInventoryItem,
  DbInventoryLocation,
  DbSupplier,
  PurchaseOrderForm,
} from "../../types";
import { ModalShell } from "../modal-shell";

const input =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export function PurchaseOrderModal({
  form,
  suppliers,
  items,
  locations,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: PurchaseOrderForm;
  suppliers: DbSupplier[];
  items: DbInventoryItem[];
  locations: DbInventoryLocation[];
  error: string | null;
  saving: boolean;
  onChange: (form: PurchaseOrderForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const setLine = (
    index: number,
    patch: Partial<PurchaseOrderForm["lines"][number]>,
  ) =>
    onChange({
      ...form,
      lines: form.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    });

  return (
    <ModalShell
      title="New Purchase Order"
      subtitle="Choose the stock location first. The PO starts as Draft and must be approved before ordering/receiving."
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
            {saving ? "Creating…" : "Create Purchase Order"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Replenishment Location
          </span>
          <select
            className={input}
            value={form.destinationLocationId}
            onChange={(event) =>
              onChange({
                ...form,
                destinationLocationId: event.target.value,
              })
            }
          >
            <option value="">Choose stock location</option>
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
            Supplier
          </span>
          <select
            className={input}
            value={form.supplierId}
            onChange={(event) =>
              onChange({ ...form, supplierId: event.target.value })
            }
          >
            <option value="">Choose supplier</option>
            {suppliers
              .filter((supplier) => supplier.active)
              .map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Expected Date
          </span>
          <input
            type="date"
            className={input}
            value={form.expectedDate}
            onChange={(event) =>
              onChange({ ...form, expectedDate: event.target.value })
            }
          />
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Shipping
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className={input}
            value={form.shippingAmount}
            onChange={(event) =>
              onChange({ ...form, shippingAmount: event.target.value })
            }
          />
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-black uppercase text-muted-foreground">
            Tax
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className={input}
            value={form.taxAmount}
            onChange={(event) =>
              onChange({ ...form, taxAmount: event.target.value })
            }
          />
        </label>

        <label className="md:col-span-1">
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

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-black">PO Lines</div>
          <div className="text-[10px] text-muted-foreground">
            The same item/location cannot be duplicated once open PO coverage
            already meets its reorder target.
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              ...form,
              lines: [
                ...form.lines,
                {
                  itemId: "",
                  quantity: "1",
                  unitCost: "",
                  supplierSku: "",
                },
              ],
            })
          }
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black"
        >
          <Plus className="h-3.5 w-3.5" /> Add Line
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {form.lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1fr_120px_140px_180px_40px]"
          >
            <select
              className={input}
              value={line.itemId}
              onChange={(event) => {
                const item = items.find(
                  (candidate) => candidate.id === event.target.value,
                );
                setLine(index, {
                  itemId: event.target.value,
                  unitCost:
                    line.unitCost || item?.unit_cost.toString() || "",
                });
              }}
            >
              <option value="">Choose item</option>
              {items
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.sku ? ` · ${item.sku}` : ""}
                  </option>
                ))}
            </select>

            <input
              type="number"
              min="0.01"
              step="0.01"
              className={input}
              value={line.quantity}
              onChange={(event) =>
                setLine(index, { quantity: event.target.value })
              }
              placeholder="Qty"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              className={input}
              value={line.unitCost}
              onChange={(event) =>
                setLine(index, { unitCost: event.target.value })
              }
              placeholder="Unit cost"
            />

            <input
              className={input}
              value={line.supplierSku}
              onChange={(event) =>
                setLine(index, { supplierSku: event.target.value })
              }
              placeholder="Supplier SKU"
            />

            <button
              type="button"
              disabled={form.lines.length === 1}
              onClick={() =>
                onChange({
                  ...form,
                  lines: form.lines.filter(
                    (_, lineIndex) => lineIndex !== index,
                  ),
                })
              }
              className="flex h-10 items-center justify-center rounded-xl border border-border text-rose-500 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}
    </ModalShell>
  );
}
