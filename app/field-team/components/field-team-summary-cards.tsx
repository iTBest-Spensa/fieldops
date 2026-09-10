"use client";

import { BadgeAlert, BriefcaseBusiness, Clock3, UserCheck, UsersRound } from "lucide-react";
import type { TechnicianSummaryView } from "../types";
import { minutesLabel } from "../utils";

export function FieldTeamSummaryCards({
  totalTechnicians,
  availableNow,
  activeJobs,
  overtimeMinutes,
  certificationAlerts,
  onView,
}: {
  totalTechnicians: number;
  availableNow: number;
  activeJobs: number;
  overtimeMinutes: number;
  certificationAlerts: number;
  onView: (view: TechnicianSummaryView) => void;
}) {
  const cards = [
    { key: "all" as const, label: "Field Team", value: String(totalTechnicians), subtext: "Technician profiles", icon: UsersRound },
    { key: "available" as const, label: "Available Now", value: String(availableNow), subtext: "Inside shift and free", icon: UserCheck },
    { key: "active_jobs" as const, label: "Active Jobs", value: String(activeJobs), subtext: "Technicians on live work", icon: BriefcaseBusiness },
    { key: "overtime" as const, label: "Outside Shift", value: minutesLabel(overtimeMinutes), subtext: "Actual time this week", icon: Clock3 },
    { key: "certifications" as const, label: "Certification Alerts", value: String(certificationAlerts), subtext: "Expired or due in 30 days", icon: BadgeAlert },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
              <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
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
