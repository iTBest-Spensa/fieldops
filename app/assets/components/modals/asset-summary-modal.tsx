"use client";

import { X } from "lucide-react";
import type { AssetSnapshot, AssetSummaryView } from "../../types";
import { assetStatusLabel, assetStatusTone, capitalize } from "../../utils";

function titleFor(view: AssetSummaryView) {
  if (view === "assigned") return "Assigned / In Service";
  if (view === "maintenance") return "Maintenance Due";
  if (view === "unavailable") return "Unavailable Assets";
  return "All Assets";
}

export function AssetSummaryModal({
  view,
  snapshots,
  onOpenAsset,
  onClose,
}: {
  view: AssetSummaryView;
  snapshots: AssetSnapshot[];
  onOpenAsset: (assetId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close asset summary" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex max-h-[86vh] w-full max-w-[1050px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div>
            <div className="text-xs font-semibold text-primary">Assets</div>
            <h2 className="mt-1 text-xl font-black">{titleFor(view)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{snapshots.length} asset{snapshots.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No assets are currently in this group.</div>
          ) : (
            <div className="divide-y divide-border">
              {snapshots.map((snapshot) => (
                <button key={snapshot.asset.id} type="button" onClick={() => onOpenAsset(snapshot.asset.id)} className="grid w-full gap-3 p-4 text-left hover:bg-row-hover md:grid-cols-[1.1fr_1fr_170px_1fr]">
                  <div>
                    <div className="text-xs font-black text-primary">{snapshot.asset.asset_tag || "No asset tag"}</div>
                    <div className="mt-1 text-sm font-black">{snapshot.displayName}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{capitalize(snapshot.asset.asset_type)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground">Assignment</div>
                    <div className="mt-1 text-xs font-bold">{snapshot.assignmentLabel}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{snapshot.assignmentSubtext}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground">Status</div>
                    <span className={`mt-1 inline-block border px-2 py-1 text-[9px] font-black uppercase ${assetStatusTone(snapshot.asset.status)}`}>{assetStatusLabel(snapshot.asset.status)}</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-muted-foreground">Maintenance</div>
                    <div className={`mt-1 text-xs ${snapshot.maintenanceDue ? "font-black text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>{snapshot.maintenanceLabel}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
