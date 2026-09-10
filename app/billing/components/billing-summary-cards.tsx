"use client";

import { CircleDollarSign, Clock3, FileText, ReceiptText } from "lucide-react";
import type { BillingSummaryView } from "../types";
import { money } from "../utils";

export function BillingSummaryCards({ billingReady, drafts, outstanding, overdue, onView }: {
  billingReady: number;
  drafts: number;
  outstanding: number;
  overdue: number;
  onView: (view: BillingSummaryView) => void;
}) {
  const cards = [
    { key: "ready" as const, label: "Billing Ready", value: String(billingReady), subtext: "Work orders waiting for invoice review", icon: ReceiptText },
    { key: "draft" as const, label: "Draft Invoices", value: String(drafts), subtext: "Invoices not yet approved", icon: FileText },
    { key: "outstanding" as const, label: "Outstanding", value: money(outstanding), subtext: "Open customer balance", icon: CircleDollarSign },
    { key: "overdue" as const, label: "Overdue", value: money(overdue), subtext: "Past due and still unpaid", icon: Clock3 },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.key} className="border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-bold text-muted-foreground">{card.label}</div><div className="mt-2 text-3xl font-black">{card.value}</div><div className="mt-1 text-[11px] text-muted-foreground">{card.subtext}</div></div>
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
            </div>
            <button type="button" onClick={() => onView(card.key)} className="mt-4 text-xs font-black text-primary hover:underline">View details</button>
          </article>
        );
      })}
    </div>
  );
}
