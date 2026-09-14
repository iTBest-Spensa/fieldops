"use client";

import { ArrowLeft, Clock3, ShoppingCart } from "lucide-react";
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
      : view === "low" || view === "out"
        ? `${totalCount} stock position${totalCount === 1 ? "" : "s"} still need purchasing/approval action. Items already covered by approved or ordered POs are removed from this action list.`
        : `${totalCount} tracked stock position${totalCount === 1 ? "" : "s"} across ${visibleSummaries.length} location${visibleSummaries.length === 1 ? "" : "s"}`;

  return (
    <ModalShell
      title={`${label} by Location`}
      subtitle={subtitle}
      wide
      onClose={onClose}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1.6fr)_160px_42px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          <div>Stock location</div>
          <div className="text-right">
            {view === "out"
              ? "Needs action"
              : view === "low"
                ? "Needs action"
                : view === "value"
                  ? "Inventory value"
                  : "Tracked items"}
          </div>
          <div />
        </div>

        {visibleSummaries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {view === "out"
              ? "No out-of-stock positions currently require a new purchasing/approval action."
              : view === "low"
                ? "No low-stock positions currently require a new purchasing/approval action."
                : "No active stock locations."}
          </div>
        ) : (
          visibleSummaries.map((row) => (
            <button
              type="button"
              key={row.location.id}
              onClick={() => onSelectLocation(row.location.id)}
              className="grid w-full grid-cols-[minmax(0,1.6fr)_160px_42px] items-center gap-3 border-b border-border px-4 py-4 text-left last:border-b-0 hover:bg-row-hover"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black">
                  {row.location.name}
                </div>
                <div className="mt-1 text-[10px] uppercase text-muted-foreground">
                  {row.location.location_type.replace(/_/g, " ")}
                  {row.location.code ? ` · ${row.location.code}` : ""}
                </div>
              </div>

              <div
                className={`text-right text-sm font-black ${
                  view === "out"
                    ? "text-rose-600 dark:text-rose-300"
                    : view === "low"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-primary"
                }`}
              >
                {view === "out"
                  ? row.outOfStock
                  : view === "low"
                    ? row.lowStock
                    : view === "value"
                      ? money(row.inventoryValue)
                      : row.totalItems}
              </div>

              <div className="text-right text-lg font-black text-primary">›</div>
            </button>
          ))
        )}
      </div>
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
  const creatableRows = rows.filter(
    (row) =>
      !row.replenishmentStatus ||
      row.replenishmentStatus === "needs_po",
  );

  const waitingRows = rows.filter(
    (row) => row.replenishmentStatus === "waiting_approval",
  );

  const subtitle =
    view === "value"
      ? `${rows.length} tracked item${rows.length === 1 ? "" : "s"} · ${money(totalValue)} at this stock location`
      : view === "all"
        ? `${rows.length} tracked inventory item${rows.length === 1 ? "" : "s"} at this stock location`
        : `${rows.length} ${label.toLowerCase()} item${rows.length === 1 ? "" : "s"} still require purchasing/approval action at this location${waitingRows.length ? ` · ${waitingRows.length} waiting for approval` : ""}`;

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
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-black hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to locations
          </button>

          {canManage && canReplenish && creatableRows.length > 0 ? (
            <button
              type="button"
              onClick={() => onCreatePO(creatableRows)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4" /> Create PO for uncovered items
            </button>
          ) : null}
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1.45fr)_105px_105px_175px_225px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          <div>Item</div>
          <div className="text-right">On hand</div>
          <div className="text-right">Reorder</div>
          <div className="text-right">
            {canReplenish ? "PO coverage / target" : "Value"}
          </div>
          <div className="text-right">Action</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No items currently require action in this group.
          </div>
        ) : (
          rows.map((row) => {
            const status = row.replenishmentStatus ?? "needs_po";
            const covered = Number(row.replenishmentCoveredQuantity ?? 0);
            const target = Number(
              row.replenishmentTargetQuantity ??
                suggestedOrderQuantity(row),
            );
            const poNumbers = row.replenishmentPONumbers ?? [];

            return (
              <div
                key={`${row.location.id}:${row.item.id}`}
                className="grid grid-cols-[minmax(0,1.45fr)_105px_105px_175px_225px] items-center gap-3 border-b border-border px-4 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">
                    {row.item.name}
                  </div>

                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {row.item.sku || "No SKU"} · {row.item.unit}
                  </div>

                  <span
                    className={`mt-2 inline-block rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase ${stockStatusTone(
                      row.stockStatus,
                    )}`}
                  >
                    {row.stockStatus}
                  </span>
                </div>

                <div className="text-right text-sm font-black">
                  {formatQty(row.onHand, row.item.unit)}
                </div>

                <div className="text-right text-sm font-black">
                  {formatQty(
                    Number(row.item.reorder_level || 0),
                    row.item.unit,
                  )}
                </div>

                <div className="text-right">
                  {canReplenish ? (
                    <>
                      <div className="text-sm font-black text-primary">
                        {formatQty(covered, row.item.unit)} /{" "}
                        {formatQty(target, row.item.unit)}
                      </div>

                      {status === "waiting_approval" ? (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] font-black text-amber-700 dark:text-amber-300">
                          <Clock3 className="h-3 w-3" />
                          Waiting for approval
                        </div>
                      ) : (
                        <div className="mt-1 text-[9px] text-muted-foreground">
                          {covered > 0
                            ? `${formatQty(
                                Math.max(0, target - covered),
                                row.item.unit,
                              )} still uncovered`
                            : "No open PO coverage"}
                        </div>
                      )}

                      {poNumbers.length ? (
                        <div className="mt-1 text-[9px] text-muted-foreground">
                          {poNumbers.join(", ")}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm font-black text-primary">
                      {money(row.value)}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenItem(row.item.id)}
                    className="h-9 rounded-xl border border-border px-3 text-[11px] font-black hover:bg-muted"
                  >
                    View item
                  </button>

                  {canManage &&
                  canReplenish &&
                  status === "needs_po" ? (
                    <button
                      type="button"
                      onClick={() => onCreatePO([row])}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-black text-primary-foreground"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Create PO
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {waitingRows.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Waiting-for-approval rows cannot create another replenishment PO.
          Once the covering PO is approved/ordered, those rows leave this
          action list and move to Receiving for their destination location.
        </p>
      ) : null}
    </ModalShell>
  );
}
