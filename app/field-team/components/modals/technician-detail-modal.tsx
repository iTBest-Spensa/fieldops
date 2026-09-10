"use client";

import { Edit3, X } from "lucide-react";
import type {
  DbAssignment,
  DbCustomer,
  DbProfile,
  DbScheduleEvent,
  DbSite,
  DbTechnicianCertification,
  DbTechnicianCompensation,
  DbTechnicianNote,
  DbTechnicianProfile,
  DbTechnicianSkill,
  DbTimeEntry,
  DbWorkOrder,
  TechnicianDetailTab,
  TechnicianSnapshot,
} from "../../types";
import { technicianStatusTone } from "../../utils";
import { TechnicianOverview } from "../technician-overview";
import { SkillsPanel } from "../skills-panel";
import { SchedulePanel } from "../schedule-panel";
import { WorkOrdersPanel } from "../work-orders-panel";
import { TimePanel } from "../time-panel";
import { OvertimePanel } from "../overtime-panel";
import { NotesPanel } from "../notes-panel";

export function TechnicianDetailModal({
  profile,
  technicianProfile,
  snapshot,
  tab,
  skills,
  certifications,
  compensation,
  notes,
  assignments,
  timeEntries,
  scheduleEvents,
  workOrderMap,
  customerMap,
  siteMap,
  profileMap,
  canManage,
  canSchedule,
  canAddNote,
  canViewCompensation,
  canEditCompensation,
  onTabChange,
  onEdit,
  onEditCompensation,
  onAddSkill,
  onAddCertification,
  onDeactivateSkill,
  onDeactivateCertification,
  onAddScheduleEvent,
  onDeleteScheduleEvent,
  onAddNote,
  onClose,
}: {
  profile: DbProfile | null;
  technicianProfile: DbTechnicianProfile | null;
  snapshot: TechnicianSnapshot | null;
  tab: TechnicianDetailTab;
  skills: DbTechnicianSkill[];
  certifications: DbTechnicianCertification[];
  compensation: DbTechnicianCompensation | null;
  notes: DbTechnicianNote[];
  assignments: DbAssignment[];
  timeEntries: DbTimeEntry[];
  scheduleEvents: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  profileMap: Map<string, DbProfile>;
  canManage: boolean;
  canSchedule: boolean;
  canAddNote: boolean;
  canViewCompensation: boolean;
  canEditCompensation: boolean;
  onTabChange: (tab: TechnicianDetailTab) => void;
  onEdit: () => void;
  onEditCompensation: () => void;
  onAddSkill: () => void;
  onAddCertification: () => void;
  onDeactivateSkill: (skill: DbTechnicianSkill) => void;
  onDeactivateCertification: (certification: DbTechnicianCertification) => void;
  onAddScheduleEvent: () => void;
  onDeleteScheduleEvent: (event: DbScheduleEvent) => void;
  onAddNote: () => void;
  onClose: () => void;
}) {
  if (!profile || !snapshot) return null;
  const tabs: Array<{ key: TechnicianDetailTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "skills", label: "Skills" },
    { key: "schedule", label: "Schedule" },
    { key: "work_orders", label: "Work Orders" },
    { key: "time", label: "Time" },
    { key: "overtime", label: "Overtime" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="fixed inset-0 z-[80000] flex items-center justify-center p-3 lg:p-5">
      <button type="button" aria-label="Close technician details" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex h-[92vh] w-full max-w-[1320px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{snapshot.name}</h2><span className={`border px-2 py-1 text-[9px] font-black uppercase ${technicianStatusTone(snapshot.status)}`}>{snapshot.status}</span></div><div className="mt-1 text-xs text-muted-foreground">{technicianProfile?.job_title ?? "Technician"} · {technicianProfile?.specialty ?? "General"} · {profile.email ?? "No email"}</div></div>
          <div className="flex items-center gap-2">{canManage && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted"><Edit3 className="h-3.5 w-3.5" />Edit Technician</button>}<button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
        </div>
        <div className="overflow-x-auto border-b border-border px-4"><div className="flex min-w-max">{tabs.map((item) => <button key={item.key} type="button" onClick={() => onTabChange(item.key)} className={`border-b-2 px-4 py-3 text-xs font-black ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}</div></div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          {tab === "overview" && <TechnicianOverview profile={profile} technicianProfile={technicianProfile} snapshot={snapshot} compensation={compensation} canManage={canManage} canViewCompensation={canViewCompensation} canEditCompensation={canEditCompensation} onEdit={onEdit} onEditCompensation={onEditCompensation} />}
          {tab === "skills" && <SkillsPanel skills={skills} certifications={certifications} canManage={canManage} onAddSkill={onAddSkill} onAddCertification={onAddCertification} onDeactivateSkill={onDeactivateSkill} onDeactivateCertification={onDeactivateCertification} />}
          {tab === "schedule" && <SchedulePanel assignments={assignments} events={scheduleEvents} workOrderMap={workOrderMap} customerMap={customerMap} siteMap={siteMap} canSchedule={canSchedule} onAddEvent={onAddScheduleEvent} onDeleteEvent={onDeleteScheduleEvent} />}
          {tab === "work_orders" && <WorkOrdersPanel assignments={assignments} workOrderMap={workOrderMap} customerMap={customerMap} siteMap={siteMap} />}
          {tab === "time" && <TimePanel entries={timeEntries} workOrderMap={workOrderMap} canViewCompensation={canViewCompensation} />}
          {tab === "overtime" && <OvertimePanel entries={timeEntries} technicianProfile={technicianProfile} workOrderMap={workOrderMap} />}
          {tab === "notes" && <NotesPanel notes={notes} profileMap={profileMap} canAddNote={canAddNote} onAddNote={onAddNote} />}
        </div>
      </section>
    </div>
  );
}
