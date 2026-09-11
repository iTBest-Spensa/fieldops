"use client";

import { ArrowLeft, ShoppingCart } from "lucide-react";
import type {
  InventoryLocationHealthSummary,
  InventoryLocationItemHealth,
  InventorySummaryView,
} from "../../types";
import { formatQty, money, stockStatusTone } from "../../utils";
import { ModalShell } from "../modal-shell";

function labelFor(view: InventorySummaryView) {
  if (view === "out") return "Out of Stock";
  if (view === "low") return "Low Stock";
  if (view === "value") return "Inventory Value";
  return "Inventory";
}

function summariesForView(
  view: InventorySummaryView,
  summaries: InventoryLocationHealthSummary[],
) {
  if (view === "out") return summaries.filter((row) => row.outOfStock > 0);
  if (view === "low") return summaries.filter((row) => row.lowStock > 0);
  return summaries;
}

export function InventoryStockHealthLocationsModal({
  view,
  summaries,
  onSelectLocation,
  onClose,
}: {
  view: InventorySummaryView;
  summaries: InventoryLocationHealthSummary[];
  onSelectLocation: (locationId: string) => void;
  onClose: () => void;
}) {
  const label = labelFor(view);
  const visibleSummaries = summariesForView(view, summaries);
  const totalCount = visibleSummaries.reduce(
    (sum, row) =>
      sum +
      (view === "out"
        ? row.outOfStock
        : view === "low"
          ? row.lowStock
          : row.totalItems),
    0,
  );
  const totalValue = visibleSummaries.reduce(
    (sum, row) => sum + row.inventoryValue,
    0,
  );

  const subtitle =
    view === "value"
      ? `${money(totalValue)} total inventory value across ${visibleSummaries.length} location${visibleSummaries.length === 1 ? "" : "s"}`
      : `${totalCount} ${view === "all" ? "tracked stock position" : label.toLowerCase() + " stock position"}${totalCount === 1 ? "" : "s"} across ${visibleSummaries.length} location${visibleSummaries.length === 1 ? "" : "s"}`;

  const gridClass =
    view === "value"
      ? "grid-cols-[minmax(0,1.6fr)_160px_42px]"
      : view === "all"
        ? "grid-cols-[minmax(0,1.6fr)_160px_42px]"
        : "grid-cols-[minmax(0,1.6fr)_160px_42px]";

  return (
    <ModalShell
      title={`${label} by Location`}
      subtitle={subtitle}
      wide
      onClose={onClose}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={`grid ${gridClass} gap-3 border-b border-border bg-muted/50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground`}
        >
          <div>Stock location</div>
          {view === "out" ? (
            <div className="text-right">Out of stock</div>
          ) : view === "low" ? (
            <div className="text-right">Low stock</div>
          ) : view === "value" ? (
            <div className="text-right">Inventory value</div>
          ) : (
            <div className="text-right">Tracked items</div>
          )}
          <div />
        </div>

        {visibleSummaries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {view === "out"
              ? "No locations currently have out-of-stock items."
              : view === "low"
                ? "No locations currently have low-stock items."
                : "No active stock locations."}
          </div>
        ) : (
          visibleSummaries.map((row) => (
            <button
              type="button"
              key={row.location.id}
              onClick={() => onSelectLocation(row.location.id)}
              className={`grid w-full ${gridClass} items-center gap-3 border-b border-border px-4 py-4 text-left last:border-b-0 hover:bg-row-hover`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{row.location.name}</div>
                <div className="mt-1 text-[10px] uppercase text-muted-foreground">
                  {row.location.location_type.replace(/_/g, " ")}
                  {row.location.code ? ` · ${row.location.code}` : ""}
                </div>
              </div>

              {view === "out" ? (
                <div className="text-right text-sm font-black text-rose-600 dark:text-rose-300">
                  {row.outOfStock}
                </div>
              ) : view === "low" ? (
                <div className="text-right text-sm font-black text-amber-700 dark:text-amber-300">
                  {row.lowStock}
                </div>
              ) : view === "value" ? (
                <div className="text-right text-sm font-black text-primary">
                  {money(row.inventoryValue)}
                </div>
              ) : (
                <div className="text-right text-sm font-black text-primary">
                  {row.totalItems}
                </div>
              )}

              <div className="text-right text-lg font-black text-primary">›</div>
            </button>
          ))
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Counts are location-specific. The same catalog item can be healthy in one location and need replenishment in another.
      </p>
    </ModalShell>
  );
}

export function suggestedOrderQuantity(row: InventoryLocationItemHealth) {
  const configured = Number(row.item.reorder_quantity || 0);
  if (configured > 0) return configured;
  const target = Number(row.item.reorder_level || 0);
  return Math.max(1, target - Math.max(0, row.onHand));
}

export function InventoryStockHealthItemsModal({
  view,
  locationName,
  rows,
  canManage,
  onBack,
  onOpenItem,
  onCreatePO,
  onClose,
}: {
  view: InventorySummaryView;
  locationName: string;
  rows: InventoryLocationItemHealth[];
  canManage: boolean;
  onBack: () => void;
  onOpenItem: (itemId: string) => void;
  onCreatePO: (rows: InventoryLocationItemHealth[]) => void;
  onClose: () => void;
}) {
  const label = labelFor(view);
  const canReplenish = view === "low" || view === "out";
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const subtitle =
    view === "value"
      ? `${rows.length} tracked item${rows.length === 1 ? "" : "s"} · ${money(totalValue)} at this stock location`
      : view === "all"
        ? `${rows.length} tracked inventory item${rows.length === 1 ? "" : "s"} at this stock location`
        : `${rows.length} ${label.toLowerCase()} item${rows.length === 1 ? "" : "s"} at this stock location`;

  return (
    <ModalShell
      title={`${label} · ${locationName}`}
      subtitle={subtitle}
      wide
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-xs font-black hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to locations
          </button>
          {canManage && canReplenish && rows.length > 0 ? (
            <button
              type="button"
              onClick={() => onCreatePO(rows)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4" /> Create PO for all
            </button>
          ) : null}
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1.45fr)_120px_120px_135px_210px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          <div>Item</div>
          <div className="text-right">On hand</div>
          <div className="text-right">Reorder level</div>
          <div className="text-right">{canReplenish ? "Suggested PO" : "Value"}</div>
          <div className="text-right">Action</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No items in this group.</div>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.location.id}:${row.item.id}`}
              className="grid grid-cols-[minmax(0,1.45fr)_120px_120px_135px_210px] items-center gap-3 border-b border-border px-4 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{row.item.name}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {row.item.sku || "No SKU"} · {row.item.unit}
                </div>
                <span
                  className={`mt-2 inline-block border px-2 py-0.5 text-[9px] font-black uppercase ${stockStatusTone(row.stockStatus)}`}
                >
                  {row.stockStatus}
                </span>
              </div>
              <div className="text-right text-sm font-black">{formatQty(row.onHand, row.item.unit)}</div>
              <div className="text-right text-sm font-black">
                {formatQty(Number(row.item.reorder_level || 0), row.item.unit)}
              </div>
              <div className="text-right text-sm font-black text-primary">
                {canReplenish
                  ? formatQty(suggestedOrderQuantity(row), row.item.unit)
                  : money(row.value)}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onOpenItem(row.item.id)}
                  className="h-9 rounded-lg border border-border px-3 text-[11px] font-black hover:bg-muted"
                >
                  View item
                </button>
                {canManage && canReplenish ? (
                  <button
                    type="button"
                    onClick={() => onCreatePO([row])}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-black text-primary-foreground"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Create PO
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}
