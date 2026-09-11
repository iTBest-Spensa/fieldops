"use client";

import { ChevronRight, MapPin } from "lucide-react";
import type { InventoryItemSnapshot } from "../types";
import { capitalize, formatDateTime, formatQty, money, stockStatusTone } from "../utils";

export function StockTable({
  snapshots,
  onOpen,
}: {
  snapshots: InventoryItemSnapshot[];
  onOpen: (id: string) => void;
}) {
  if (!snapshots.length) {
    return (
      <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No inventory items match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[1120px] border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b border-border px-4 py-3">Item</th>
            <th className="border-b border-border px-4 py-3">Category / Part</th>
            <th className="border-b border-border px-4 py-3">On Hand</th>
            <th className="border-b border-border px-4 py-3">Reorder</th>
            <th className="border-b border-border px-4 py-3">Unit Cost</th>
            <th className="border-b border-border px-4 py-3">Value</th>
            <th className="border-b border-border px-4 py-3">Location</th>
            <th className="border-b border-border px-4 py-3">Last Movement</th>
            <th className="border-b border-border px-4 py-3 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => {
            const i = snapshot.item;
            const rowKey = `${i.id}:${snapshot.scopeLocationId ?? "all"}`;
            return (
              <tr key={rowKey} className="border-b border-border last:border-0 hover:bg-row-hover">
                <td className="px-4 py-4">
                  <button onClick={() => onOpen(i.id)} className="text-left">
                    <div className="text-sm font-black hover:text-primary">{i.name}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {i.sku || "No SKU"} · {i.unit}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="text-xs font-bold">{capitalize(i.category) || "Uncategorized"}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {i.part_number || [i.manufacturer, i.barcode].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-black">{i.track_stock ? formatQty(snapshot.onHand, i.unit) : "Not tracked"}</div>
                  <span className={`mt-1 inline-block border px-2 py-0.5 text-[9px] font-black uppercase ${stockStatusTone(snapshot.stockStatus)}`}>
                    {snapshot.stockStatus === "out" ? "Out" : snapshot.stockStatus === "low" ? "Low" : "OK"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-xs font-bold">{formatQty(i.reorder_level, i.unit)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Order {formatQty(i.reorder_quantity, i.unit)}</div>
                </td>
                <td className="px-4 py-4 text-xs font-bold">{money(i.unit_cost)}</td>
                <td className="px-4 py-4 text-xs font-black">{money(snapshot.value)}</td>
                <td className="px-4 py-4">
                  {snapshot.scopeLocationName ? (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {snapshot.scopeLocationName}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {snapshot.locationCount} location{snapshot.locationCount === 1 ? "" : "s"}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(snapshot.lastMovementAt)}</td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => onOpen(i.id)} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
