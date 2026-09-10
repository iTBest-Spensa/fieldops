"use client";

import { ChevronRight, Clock3, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { TechnicianSnapshot } from "../types";
import { employmentLabel, formatDateTime, formatTime, minutesLabel, technicianStatusTone } from "../utils";

export function TechnicianTable({
  technicians,
  onOpen,
}: {
  technicians: TechnicianSnapshot[];
  onOpen: (technicianId: string) => void;
}) {
  if (technicians.length === 0) {
    return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No technicians match the current search or filters.</div>;
  }

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[1220px] border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b border-border px-4 py-3">Technician</th>
            <th className="border-b border-border px-4 py-3">Role / Specialty</th>
            <th className="border-b border-border px-4 py-3">Service Area</th>
            <th className="border-b border-border px-4 py-3">Shift</th>
            <th className="border-b border-border px-4 py-3">Current Activity</th>
            <th className="border-b border-border px-4 py-3">Open Work</th>
            <th className="border-b border-border px-4 py-3">Outside Shift</th>
            <th className="border-b border-border px-4 py-3">Status</th>
            <th className="border-b border-border px-4 py-3 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {technicians.map((tech) => (
            <tr key={tech.technicianId} className="border-b border-border last:border-b-0 hover:bg-row-hover">
              <td className="px-4 py-4">
                <button type="button" onClick={() => onOpen(tech.technicianId)} className="text-left">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center border border-border bg-muted/40 text-xs font-black"><UserRound className="h-4 w-4" /></div>
                    <div>
                      <div className="text-sm font-black hover:text-primary">{tech.name}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                        {tech.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{tech.email}</span>}
                        {tech.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{tech.phone}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              </td>
              <td className="px-4 py-4">
                <div className="text-xs font-bold">{tech.jobTitle ?? "Technician"}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{tech.specialty ?? "General"} · {employmentLabel(tech.employmentType)}</div>
              </td>
              <td className="px-4 py-4">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{tech.serviceArea ?? "No service area"}</span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1 text-xs font-semibold"><Clock3 className="h-3.5 w-3.5 text-muted-foreground" />{formatTime(tech.shiftStart)}–{formatTime(tech.shiftEnd)}</div>
                {tech.nextAssignmentAt && <div className="mt-1 text-[10px] text-muted-foreground">Next: {formatDateTime(tech.nextAssignmentAt)}</div>}
              </td>
              <td className="px-4 py-4">
                <div className="text-xs font-bold">{tech.statusDetail}</div>
                {tech.currentWorkOrderNumber && <div className="mt-1 text-[10px] text-primary">{tech.currentWorkOrderNumber} · {tech.currentWorkOrderTitle}</div>}
              </td>
              <td className="px-4 py-4 text-sm font-black">{tech.openWorkCount}</td>
              <td className="px-4 py-4">
                <div className={`text-sm font-black ${tech.weekOvertimeMinutes > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{minutesLabel(tech.weekOvertimeMinutes)}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">This week</div>
              </td>
              <td className="px-4 py-4">
                <span className={`border px-2 py-1 text-[9px] font-black uppercase ${technicianStatusTone(tech.status)}`}>{tech.status}</span>
                {tech.certificationAlerts > 0 && <div className="mt-2 text-[9px] font-black text-rose-500">{tech.certificationAlerts} CERT ALERT{tech.certificationAlerts === 1 ? "" : "S"}</div>}
              </td>
              <td className="px-4 py-4 text-right">
                <button type="button" onClick={() => onOpen(tech.technicianId)} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">View <ChevronRight className="h-3.5 w-3.5" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
