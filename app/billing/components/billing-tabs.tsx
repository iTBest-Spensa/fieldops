"use client";
import { CreditCard, FileText, ReceiptText } from "lucide-react";
import type { BillingSection } from "../types";

export function BillingTabs({ section, onChange, readyCount }: { section: BillingSection; onChange: (section: BillingSection) => void; readyCount: number }) {
  const tabs = [
    { key: "ready" as const, label: "Billing Ready", icon: ReceiptText, count: readyCount },
    { key: "invoices" as const, label: "Invoices", icon: FileText },
    { key: "payments" as const, label: "Payments", icon: CreditCard },
  ];
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => { const Icon = tab.icon; return (
        <button key={tab.key} type="button" onClick={() => onChange(tab.key)} className={`flex items-center gap-2 border px-3 py-2 text-xs font-black ${section === tab.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>
          <Icon className="h-4 w-4" /> {tab.label}{"count" in tab && typeof tab.count === "number" ? <span className="ml-1 bg-background/20 px-1.5 py-0.5">{tab.count}</span> : null}
        </button>
      ); })}
    </div>
  );
}
