"use client";

import { useEffect, useMemo, useState } from "react";
import { PackagePlus, RotateCcw, Search, Trash2, X } from "lucide-react";

export type MaterialInventoryItem = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  unit_price: number;
  unit_cost?: number;
  track_stock?: boolean;
  active?: boolean;
};

export type MaterialInventoryLocation = {
  id: string;
  name: string;
  location_type?: string | null;
  active?: boolean;
};

export type WorkOrderMaterialUsage = {
  id: string;
  work_order_id: string;
  inventory_item_id: string | null;
  description: string;
  quantity: number;
  quantity_returned: number;
  unit_cost: number;
  unit_price: number;
  billable: boolean;
  recorded_by: string | null;
  created_at: string;
};

export type SelectedMaterialLine = {
  inventoryItemId: string;
  locationId: string;
  quantity: string;
  unitPrice: string;
  billable: boolean;
};

export type AddMaterialForm = {
  locationId: string;
  selectedItems: SelectedMaterialLine[];
  activeInventoryItemId: string;
  notes: string;
};

export type ReturnMaterialForm = {
  locationId: string;
  quantity: string;
  reason: string;
};

export type MaterialStockBalances = Record<string, number>;

export function materialStockKey(locationId: string, inventoryItemId: string) {
  return `${locationId}:${inventoryItemId}`;
}

function materialSelectionKey(locationId: string, inventoryItemId: string) {
  return `${locationId}:${inventoryItemId}`;
}

function itemLabel(item: MaterialInventoryItem) {
  return `${item.name}${item.sku ? ` · ${item.sku}` : ""}`;
}

function compactQty(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function WorkOrderMaterialModal({
  open,
  workOrderNumber,
  items,
  locations,
  stockBalances,
  form,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  workOrderNumber: string;
  items: MaterialInventoryItem[];
  locations: MaterialInventoryLocation[];
  stockBalances: MaterialStockBalances;
  form: AddMaterialForm;
  error: string | null;
  saving: boolean;
  onChange: (form: AddMaterialForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [itemSearch, setItemSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  );

  const activeLine =
    form.selectedItems.find(
      (line) =>
        materialSelectionKey(line.locationId, line.inventoryItemId) ===
        form.activeInventoryItemId
    ) ?? null;
  const activeItem = activeLine
    ? itemMap.get(activeLine.inventoryItemId) ?? null
    : null;

  useEffect(() => {
    if (!open) return;
    setItemSearch("");
    setSearchFocused(false);
  }, [open, form.locationId]);

  const availableFor = (
    item: MaterialInventoryItem,
    locationId = form.locationId
  ) => {
    if (item.track_stock === false) return null;
    if (!locationId) return null;
    return Number(
      stockBalances[materialStockKey(locationId, item.id)] ?? 0
    );
  };

  const totalAvailableFor = (item: MaterialInventoryItem) => {
    if (item.track_stock === false) return null;
    return locations.reduce(
      (sum, location) =>
        sum + Number(stockBalances[materialStockKey(location.id, item.id)] ?? 0),
      0
    );
  };

  const matchingItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    return items
      .filter((item) => item.active !== false)
      .filter((item) => {
        if (!query) return true;
        return `${item.name} ${item.sku ?? ""} ${item.unit ?? ""}`
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 15);
  }, [items, itemSearch]);

  if (!open) return null;

  function updateLine(
    selectionKey: string,
    updates: Partial<SelectedMaterialLine>
  ) {
    onChange({
      ...form,
      selectedItems: form.selectedItems.map((line) =>
        materialSelectionKey(line.locationId, line.inventoryItemId) === selectionKey
          ? { ...line, ...updates }
          : line
      ),
      activeInventoryItemId: selectionKey,
    });
  }

  function chooseItem(item: MaterialInventoryItem) {
    if (!form.locationId) return;

    const selectionKey = materialSelectionKey(form.locationId, item.id);
    const existing = form.selectedItems.find(
      (line) =>
        materialSelectionKey(line.locationId, line.inventoryItemId) === selectionKey
    );

    onChange({
      ...form,
      activeInventoryItemId: selectionKey,
      selectedItems: existing
        ? form.selectedItems
        : [
            ...form.selectedItems,
            {
              inventoryItemId: item.id,
              locationId: form.locationId,
              quantity: "1",
              unitPrice: String(Number(item.unit_price ?? 0)),
              billable: true,
            },
          ],
    });
    setItemSearch("");
    setSearchFocused(false);
  }

  function removeItem(selectionKey: string) {
    const remaining = form.selectedItems.filter(
      (line) =>
        materialSelectionKey(line.locationId, line.inventoryItemId) !== selectionKey
    );
    const nextActive = remaining[0]
      ? materialSelectionKey(
          remaining[0].locationId,
          remaining[0].inventoryItemId
        )
      : "";

    onChange({
      ...form,
      selectedItems: remaining,
      activeInventoryItemId:
        form.activeInventoryItemId === selectionKey
          ? nextActive
          : form.activeInventoryItemId,
    });
  }

  const activeAvailable = activeItem && activeLine
    ? availableFor(activeItem, activeLine.locationId)
    : null;
  const activeQty = activeLine ? Number(activeLine.quantity) : 0;
  const activeOverStock =
    activeItem?.track_stock !== false &&
    activeAvailable !== null &&
    Number.isFinite(activeQty) &&
    activeQty > activeAvailable;

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close material window"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <section className="relative z-10 w-full max-w-[760px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Work Order Material
            </div>
            <h2 className="mt-1 text-xl font-black">Add from Inventory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {workOrderNumber} · Selected stock is consumed when you save and the net material feeds Billing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/50 bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-100">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">Stock location</span>
            <select
              value={form.locationId}
              onChange={(event) =>
                onChange({
                  ...form,
                  locationId: event.target.value,
                  activeInventoryItemId: "",
                })
              }
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">Choose a location…</option>
              {locations
                .filter((location) => location.active !== false)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <span className="mb-1.5 block text-xs font-bold">
                Inventory item
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={itemSearch}
                  disabled={!form.locationId}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(event) => {
                    setItemSearch(event.target.value);
                    setSearchFocused(true);
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={
                    form.locationId
                      ? "Type item name or SKU…"
                      : "Choose stock location first"
                  }
                  autoComplete="off"
                />
              </div>
              {searchFocused && form.locationId ? (
                <div className="absolute left-0 right-0 top-[68px] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-background p-1 shadow-2xl">
                  {matchingItems.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      No inventory items match “{itemSearch}”.
                    </div>
                  ) : (
                    matchingItems.map((item) => {
                      const available = availableFor(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseItem(item)}
                          className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {item.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {item.sku || "No SKU"}
                              {item.unit ? ` · ${item.unit}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs font-black tabular-nums">
                              {item.track_stock === false
                                ? "Not tracked"
                                : `${compactQty(available ?? 0)} ${item.unit || "ea"} here`}
                            </span>
                            {item.track_stock === false ? null : (
                              <span className="block text-[10px] text-muted-foreground">
                                {compactQty(totalAvailableFor(item) ?? 0)} {item.unit || "ea"} total · ${Number(item.unit_price || 0).toFixed(2)} / {item.unit || "ea"}
                              </span>
                            )}
                            {item.track_stock === false ? (
                              <span className="block text-[10px] text-muted-foreground">
                                ${Number(item.unit_price || 0).toFixed(2)} / {item.unit || "ea"}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>

            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Quantity {activeItem?.unit ? `(${activeItem.unit})` : ""}
              </span>
              <input
                inputMode="decimal"
                disabled={!activeLine}
                value={activeLine?.quantity ?? ""}
                onChange={(event) => {
                  if (!activeLine) return;
                  updateLine(
                    materialSelectionKey(
                      activeLine.locationId,
                      activeLine.inventoryItemId
                    ),
                    { quantity: event.target.value }
                  );
                }}
                className={`h-11 w-full rounded-xl border bg-card px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                  activeOverStock ? "border-rose-500" : "border-border"
                }`}
                placeholder="0"
              />
              {activeItem && form.locationId ? (
                <span
                  className={`mt-1 block text-[10px] font-bold ${
                    activeOverStock
                      ? "text-rose-600 dark:text-rose-300"
                      : "text-muted-foreground"
                  }`}
                >
                  {activeItem.track_stock === false
                    ? "Stock not tracked"
                    : `Available ${compactQty(activeAvailable ?? 0)} ${activeItem.unit || "ea"}`}
                </span>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.12em]">
                Item(s) selected
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Quantity can be edited before stock is consumed.
              </div>
            </div>
            {form.selectedItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No items selected yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[minmax(0,1fr)_160px_44px] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                  <span>Item</span>
                  <span>Quantity</span>
                  <span aria-hidden="true" />
                </div>
                {form.selectedItems.map((line) => {
                  const item = itemMap.get(line.inventoryItemId);
                  if (!item) return null;
                  const available = availableFor(item, line.locationId);
                  const qty = Number(line.quantity);
                  const overStock =
                    item.track_stock !== false &&
                    available !== null &&
                    Number.isFinite(qty) &&
                    qty > available;
                  return (
                    <div
                      key={materialSelectionKey(line.locationId, line.inventoryItemId)}
                      className={`grid grid-cols-[minmax(0,1fr)_160px_44px] items-center gap-3 px-4 py-3 ${
                        form.activeInventoryItemId ===
                        materialSelectionKey(line.locationId, line.inventoryItemId)
                          ? "bg-primary/5"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...form,
                            activeInventoryItemId: materialSelectionKey(
                              line.locationId,
                              line.inventoryItemId
                            ),
                          })
                        }
                        className="min-w-0 text-left"
                      >
                        <span className="block truncate text-sm font-bold">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {item.sku || "No SKU"} · {locationMap.get(line.locationId)?.name || "Unknown location"} · {item.track_stock === false ? "Stock not tracked" : `${compactQty(available ?? 0)} ${item.unit || "ea"} available`}
                        </span>
                      </button>
                      <div>
                        <input
                          inputMode="decimal"
                          value={line.quantity}
                          onFocus={() =>
                            onChange({
                              ...form,
                              activeInventoryItemId: materialSelectionKey(
                              line.locationId,
                              line.inventoryItemId
                            ),
                            })
                          }
                          onChange={(event) =>
                            updateLine(
                              materialSelectionKey(
                                line.locationId,
                                line.inventoryItemId
                              ),
                              { quantity: event.target.value }
                            )
                          }
                          className={`h-9 w-full rounded-lg border bg-background px-2.5 text-sm ${
                            overStock ? "border-rose-500" : "border-border"
                          }`}
                        />
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {item.unit || "ea"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            materialSelectionKey(
                              line.locationId,
                              line.inventoryItemId
                            )
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                        aria-label={`Delete ${item.name}`}
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Client unit price
                {activeItem ? ` (${activeItem.unit || "ea"})` : ""}
              </span>
              <input
                inputMode="decimal"
                disabled={!activeLine}
                value={activeLine?.unitPrice ?? ""}
                onChange={(event) => {
                  if (!activeLine) return;
                  updateLine(
                    materialSelectionKey(
                      activeLine.locationId,
                      activeLine.inventoryItemId
                    ),
                    { unitPrice: event.target.value }
                  );
                }}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="0.00"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <input
                type="checkbox"
                disabled={!activeLine}
                checked={activeLine?.billable ?? false}
                onChange={(event) => {
                  if (!activeLine) return;
                  updateLine(
                    materialSelectionKey(
                      activeLine.locationId,
                      activeLine.inventoryItemId
                    ),
                    { billable: event.target.checked }
                  );
                }}
                className="h-4 w-4"
              />
              <span>
                <span className="block text-xs font-black">Bill to customer</span>
                <span className="block text-[10px] text-muted-foreground">
                  Applies to the selected item.
                </span>
              </span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                onChange({ ...form, notes: event.target.value })
              }
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              placeholder="Optional material note…"
            />
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || form.selectedItems.length === 0}
            onClick={onSave}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            <PackagePlus className="h-4 w-4" />
            {saving
              ? "Adding…"
              : `Consume & Add${form.selectedItems.length > 1 ? ` (${form.selectedItems.length})` : ""}`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function WorkOrderMaterialReturnModal({
  open,
  usage,
  locations,
  form,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  usage: WorkOrderMaterialUsage | null;
  locations: MaterialInventoryLocation[];
  form: ReturnMaterialForm;
  error: string | null;
  saving: boolean;
  onChange: (form: ReturnMaterialForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open || !usage) return null;
  const remaining = Math.max(
    0,
    Number(usage.quantity) - Number(usage.quantity_returned || 0)
  );

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close material return window"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <section className="relative z-10 w-full max-w-[600px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Work Order Material
            </div>
            <h2 className="mt-1 text-xl font-black">Return / Remove Material</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage.description} · {compactQty(remaining)} still consumed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {error ? (
            <div className="rounded-xl border border-rose-500/50 bg-rose-950 px-4 py-3 text-sm font-semibold text-rose-100">
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Return quantity
              </span>
              <input
                inputMode="decimal"
                value={form.quantity}
                onChange={(event) =>
                  onChange({ ...form, quantity: event.target.value })
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Return to location
              </span>
              <select
                value={form.locationId}
                onChange={(event) =>
                  onChange({ ...form, locationId: event.target.value })
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="">Choose a location…</option>
                {locations
                  .filter((location) => location.active !== false)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold">Reason</span>
              <input
                value={form.reason}
                onChange={(event) =>
                  onChange({ ...form, reason: event.target.value })
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                placeholder="Returned unused, wrong part, customer declined…"
              />
            </label>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {saving ? "Returning…" : "Return Material"}
          </button>
        </footer>
      </section>
    </div>
  );
}
