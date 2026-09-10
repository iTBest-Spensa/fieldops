"use client";

import { ChevronRight, X } from "lucide-react";
import type { DbProfile, DbTechnicianCertification, TechnicianSnapshot, TechnicianSummaryView } from "../../types";
import { certificationState, formatDate, minutesLabel, technicianName, technicianStatusTone } from "../../utils";

export function FieldTeamSummaryModal({
  view,
  technicians,
  certifications,
  profileMap,
  onOpenTechnician,
  onClose,
}: {
  view: TechnicianSummaryView | null;
  technicians: TechnicianSnapshot[];
  certifications: DbTechnicianCertification[];
  profileMap: Map<string, DbProfile>;
  onOpenTechnician: (technicianId: string) => void;
  onClose: () => void;
}) {
  if (!view) return null;

  const titles: Record<TechnicianSummaryView, string> = {
    all: "Field Team",
    available: "Available Now",
    active_jobs: "Active Jobs",
    overtime: "Outside-Shift Time This Week",
    certifications: "Certification Alerts",
  };

  const filtered = technicians.filter((tech) => {
    if (view === "available") return tech.status === "Available";
    if (view === "active_jobs") return tech.currentWorkOrderId !== null && !["Available", "Off Shift", "Inactive"].includes(tech.status);
    if (view === "overtime") return tech.weekOvertimeMinutes > 0;
    return true;
  }).sort((a, b) => view === "overtime" ? b.weekOvertimeMinutes - a.weekOvertimeMinutes : a.name.localeCompare(b.name));

  const certificationAlerts = certifications
    .filter((certification) => certificationState(certification).alert)
    .sort((a, b) => (a.expires_on ?? "9999-12-31").localeCompare(b.expires_on ?? "9999-12-31"));

  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close field-team summary" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex max-h-[86vh] w-full max-w-[1000px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-xs font-semibold text-primary">Field Team</div><h2 className="mt-1 text-xl font-black">{titles[view]}</h2><p className="mt-1 text-xs text-muted-foreground">{view === "certifications" ? `${certificationAlerts.length} certification alert${certificationAlerts.length === 1 ? "" : "s"}` : `${filtered.length} technician${filtered.length === 1 ? "" : "s"}`}</p></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {view === "certifications" ? (
            certificationAlerts.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No expired or soon-to-expire certifications.</div> : <div className="divide-y divide-border">{certificationAlerts.map((certification) => {
              const profile = profileMap.get(certification.technician_id);
              const state = certificationState(certification);
              return <button key={certification.id} type="button" onClick={() => { onOpenTechnician(certification.technician_id); onClose(); }} className="grid w-full gap-3 p-4 text-left hover:bg-row-hover md:grid-cols-[1fr_1fr_150px_120px_24px] md:items-center"><div><div className="text-xs font-black">{technicianName(profile?.full_name ?? null, profile?.email ?? null)}</div><div className="mt-1 text-[10px] text-muted-foreground">{profile?.email ?? ""}</div></div><div><div className="text-xs font-black">{certification.certification_name}</div><div className="mt-1 text-[10px] text-muted-foreground">{certification.issuer ?? "No issuer"}</div></div><div className="text-xs text-muted-foreground">{formatDate(certification.expires_on)}</div><div><span className="border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[9px] font-black uppercase text-rose-600 dark:text-rose-400">{state.label}</span></div><ChevronRight className="h-4 w-4 text-primary" /></button>;
            })}</div>
          ) : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No technicians are currently in this group.</div> : <div className="divide-y divide-border">{filtered.map((tech) => <button key={tech.technicianId} type="button" onClick={() => { onOpenTechnician(tech.technicianId); onClose(); }} className="grid w-full gap-3 p-4 text-left hover:bg-row-hover md:grid-cols-[1.2fr_1fr_170px_140px_24px] md:items-center"><div><div className="text-sm font-black">{tech.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{tech.jobTitle ?? "Technician"} · {tech.specialty ?? "General"}</div></div><div><span className={`border px-2 py-1 text-[9px] font-black uppercase ${technicianStatusTone(tech.status)}`}>{tech.status}</span><div className="mt-2 text-[10px] text-muted-foreground">{tech.statusDetail}</div></div><div className="text-xs"><div className="text-[9px] font-black uppercase text-muted-foreground">Open work</div><div className="mt-1 font-black">{tech.openWorkCount}</div></div><div className="text-xs"><div className="text-[9px] font-black uppercase text-muted-foreground">Outside shift</div><div className={`mt-1 font-black ${tech.weekOvertimeMinutes > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{minutesLabel(tech.weekOvertimeMinutes)}</div></div><ChevronRight className="h-4 w-4 text-primary" /></button>)}</div>}
        </div>
      </section>
    </div>
  );
}
