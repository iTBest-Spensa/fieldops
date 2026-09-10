"use client";

import { Boxes, CircleOff, ClipboardCheck, Wrench } from "lucide-react";
import type { AssetSummaryView } from "../types";

export function AssetSummaryCards({
  totalAssets,
  assignedAssets,
  maintenanceDue,
  unavailableAssets,
  onView,
}: {
  totalAssets: number;
  assignedAssets: number;
  maintenanceDue: number;
  unavailableAssets: number;
  onView: (view: AssetSummaryView) => void;
}) {
  const cards = [
    { key: "all" as const, label: "Total Assets", value: totalAssets, subtext: "All tracked serialized assets", icon: Boxes },
    { key: "assigned" as const, label: "Assigned / In Service", value: assignedAssets, subtext: "Currently deployed", icon: ClipboardCheck },
    { key: "maintenance" as const, label: "Maintenance Due", value: maintenanceDue, subtext: "Due or currently in progress", icon: Wrench },
    { key: "unavailable" as const, label: "Unavailable", value: unavailableAssets, subtext: "Repair or lost", icon: CircleOff },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.key} className="border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground">{card.label}</div>
                <div className="mt-2 text-3xl font-black">{card.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{card.subtext}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <button type="button" onClick={() => onView(card.key)} className="mt-4 text-xs font-black text-primary hover:underline">
              View details
            </button>
          </article>
        );
      })}
    </div>
  );
}
