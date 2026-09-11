"use client";

import { Boxes, CircleDollarSign, PackageX, TriangleAlert } from "lucide-react";
import type { InventorySummaryView } from "../types";
import { money } from "../utils";

export function InventorySummaryCards({ totalItems, lowStock, outOfStock, inventoryValue, scopeLabel, onView }: { totalItems: number; lowStock: number; outOfStock: number; inventoryValue: number; scopeLabel: string; onView: (view: InventorySummaryView) => void }) {
  const cards = [
    { key: "all" as const, label: "Total Items", value: String(totalItems), subtext: `Tracked item-location stock positions · ${scopeLabel}`, icon: Boxes },
    { key: "low" as const, label: "Low Stock", value: String(lowStock), subtext: `At or below reorder level · ${scopeLabel}`, icon: TriangleAlert },
    { key: "out" as const, label: "Out of Stock", value: String(outOfStock), subtext: `Zero available quantity · ${scopeLabel}`, icon: PackageX },
    { key: "value" as const, label: "Inventory Value", value: money(inventoryValue), subtext: `On-hand quantity × unit cost · ${scopeLabel}`, icon: CircleDollarSign },
  ];
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return (
    <article key={card.key} className="border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-muted-foreground">{card.label}</div><div className="mt-2 text-3xl font-black">{card.value}</div><div className="mt-1 text-[11px] text-muted-foreground">{card.subtext}</div></div><div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div></div>
      <button type="button" onClick={() => onView(card.key)} className="mt-4 text-xs font-black text-primary hover:underline">View details</button>
    </article>
  ); })}</div>;
}
