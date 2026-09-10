"use client";

import type { InventorySection } from "../types";
import { inventorySections } from "../constants";

export function SectionTabs({ value, onChange }: { value: InventorySection; onChange: (section: InventorySection) => void }) {
  return <div className="flex overflow-x-auto border border-border bg-card">{inventorySections.map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`whitespace-nowrap border-r border-border px-4 py-3 text-xs font-black last:border-r-0 ${value === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</button>)}</div>;
}
