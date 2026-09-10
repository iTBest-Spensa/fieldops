"use client";

import type { ReactNode } from "react";

export function InfoCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-black">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-border/70 py-2.5 last:border-b-0">
      <div className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold">{value ?? "—"}</div>
    </div>
  );
}
