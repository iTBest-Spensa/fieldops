"use client";

import { Database, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import type { DbSettings } from "../types";
import { formatDateTime } from "../utils";
import { SectionCard } from "./section-card";

export function AppearancePanel({
  settings,
  currentUserName,
  isAdmin,
  resettingDemo,
  onResetDemo,
}: {
  settings: DbSettings | null;
  currentUserName: string;
  isAdmin: boolean;
  resettingDemo: boolean;
  onResetDemo: () => void;
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="Appearance" description="Theme preference is local to this browser and does not change another user's display.">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black">
              <Sun className="h-4 w-4" />
              Day <span className="text-muted-foreground">/</span>
              <Moon className="h-4 w-4" />
              Night
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Use the existing FieldOps theme switcher.</div>
          </div>
          <FieldOpsThemeToggle />
        </div>
      </SectionCard>

      <SectionCard title="System">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-border p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground"><Database className="h-4 w-4" />Data source</div>
            <div className="mt-2 text-sm font-black">Supabase · Connected</div>
          </div>
          <div className="border border-border p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-muted-foreground"><Monitor className="h-4 w-4" />Signed in as</div>
            <div className="mt-2 text-sm font-black">{currentUserName}</div>
          </div>
          <div className="border border-border p-4">
            <div className="text-xs font-black uppercase text-muted-foreground">Settings updated</div>
            <div className="mt-2 text-sm font-black">{formatDateTime(settings?.updated_at)}</div>
          </div>
          <div className="border border-border p-4">
            <div className="text-xs font-black uppercase text-muted-foreground">System timezone</div>
            <div className="mt-2 text-sm font-black">{settings?.timezone || "America/Vancouver"}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="IT demo environment"
        description="Admin-only development reset. Keeps authentication, user access and Company Settings, but rebuilds operational demo data."
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="max-w-2xl">
            <div className="text-sm font-black">Reset operational data and seed a clean IT-company dataset</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              Deletes current Work Orders, Billing, Customers, Assets, Inventory and technician operational records. Then creates fresh IT customers, stock, assets and technician skills. It intentionally creates zero Work Orders and zero invoices so you can test the complete lifecycle yourself.
            </div>
          </div>
          <button
            type="button"
            onClick={onResetDemo}
            disabled={!isAdmin || resettingDemo}
            className="inline-flex h-10 items-center gap-2 border border-rose-500/40 px-4 text-xs font-black text-rose-600 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${resettingDemo ? "animate-spin" : ""}`} />
            {resettingDemo ? "Resetting…" : "Reset & Seed IT Demo Data"}
          </button>
        </div>
        {!isAdmin ? <p className="mt-2 text-xs text-muted-foreground">Admin access is required to use this reset.</p> : null}
      </SectionCard>
    </div>
  );
}
