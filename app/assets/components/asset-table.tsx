"use client";

import { ChevronRight, MapPin, ShieldCheck, Wrench } from "lucide-react";
import type { AssetSnapshot } from "../types";
import {
  assetStatusLabel,
  assetStatusTone,
  capitalize,
  conditionTone,
  warrantyLabel,
} from "../utils";

export function AssetTable({
  snapshots,
  now,
  onOpen,
}: {
  snapshots: AssetSnapshot[];
  now: Date;
  onOpen: (assetId: string) => void;
}) {
  if (snapshots.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No assets match the current search or filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[1180px] border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b border-border px-4 py-3">Asset</th>
            <th className="border-b border-border px-4 py-3">Type / Model</th>
            <th className="border-b border-border px-4 py-3">Current Assignment</th>
            <th className="border-b border-border px-4 py-3">Status</th>
            <th className="border-b border-border px-4 py-3">Condition</th>
            <th className="border-b border-border px-4 py-3">Warranty</th>
            <th className="border-b border-border px-4 py-3">Maintenance</th>
            <th className="border-b border-border px-4 py-3 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => {
            const asset = snapshot.asset;
            return (
              <tr key={asset.id} className="border-b border-border last:border-b-0 hover:bg-row-hover">
                <td className="px-4 py-4">
                  <button type="button" onClick={() => onOpen(asset.id)} className="text-left">
                    <div className="text-sm font-black hover:text-primary">{snapshot.displayName}</div>
                    <div className="mt-1 text-[10px] font-semibold text-muted-foreground">
                      {asset.asset_tag || "No asset tag"}{asset.serial_number ? ` · SN ${asset.serial_number}` : ""}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="text-xs font-bold">{capitalize(asset.asset_type)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {[asset.manufacturer, asset.model].filter(Boolean).join(" ") || capitalize(asset.category)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-xs font-bold">{snapshot.assignmentLabel}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{snapshot.assignmentSubtext}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`border px-2 py-1 text-[9px] font-black uppercase ${assetStatusTone(asset.status)}`}>
                    {assetStatusLabel(asset.status)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`border px-2 py-1 text-[9px] font-black uppercase ${conditionTone(asset.condition)}`}>
                    {capitalize(asset.condition)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {warrantyLabel(asset, now)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className={`flex items-start gap-2 text-xs ${snapshot.maintenanceDue ? "font-bold text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                    <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{snapshot.maintenanceLabel}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <button type="button" onClick={() => onOpen(asset.id)} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
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
