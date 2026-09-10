"use client";

import { Building2, ClipboardList, MapPin, UsersRound } from "lucide-react";
import type { CustomerSummaryView } from "../types";

export function CustomerSummaryCards({
  totalCustomers,
  activeCustomers,
  openWorkOrders,
  serviceSites,
  onView,
}: {
  totalCustomers: number;
  activeCustomers: number;
  openWorkOrders: number;
  serviceSites: number;
  onView: (view: CustomerSummaryView) => void;
}) {
  const cards = [
    { key: "all" as const, label: "Total Customers", value: totalCustomers, subtext: "All customer accounts", icon: UsersRound },
    { key: "active" as const, label: "Active Customers", value: activeCustomers, subtext: "Available for service", icon: Building2 },
    { key: "open_work" as const, label: "Open Work Orders", value: openWorkOrders, subtext: "Across all customers", icon: ClipboardList },
    { key: "sites" as const, label: "Service Sites", value: serviceSites, subtext: "Customer locations", icon: MapPin },
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
            <button
              type="button"
              onClick={() => onView(card.key)}
              className="mt-4 text-xs font-black text-primary hover:underline"
            >
              View details
            </button>
          </article>
        );
      })}
    </div>
  );
}
