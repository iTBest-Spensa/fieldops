"use client";

import { Clock3, DollarSign, Edit3, MapPin, ShieldCheck } from "lucide-react";
import type { DbProfile, DbTechnicianCompensation, DbTechnicianProfile, TechnicianSnapshot } from "../types";
import { employmentLabel, formatDate, formatMoney, formatTime, minutesLabel, technicianStatusTone } from "../utils";
import { DetailRow, InfoCard } from "./info-card";

export function TechnicianOverview({
  profile,
  technicianProfile,
  snapshot,
  compensation,
  canManage,
  canViewCompensation,
  canEditCompensation,
  onEdit,
  onEditCompensation,
}: {
  profile: DbProfile;
  technicianProfile: DbTechnicianProfile | null;
  snapshot: TechnicianSnapshot;
  compensation: DbTechnicianCompensation | null;
  canManage: boolean;
  canViewCompensation: boolean;
  canEditCompensation: boolean;
  onEdit: () => void;
  onEditCompensation: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <InfoCard
        title="Technician Profile"
        action={canManage ? <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><Edit3 className="h-3.5 w-3.5" />Edit</button> : undefined}
      >
        <DetailRow label="Employee #" value={technicianProfile?.employee_number ?? "—"} />
        <DetailRow label="Job title" value={technicianProfile?.job_title ?? "Technician"} />
        <DetailRow label="Employment" value={employmentLabel(technicianProfile?.employment_type ?? "full_time")} />
        <DetailRow label="Specialty" value={technicianProfile?.specialty ?? "General"} />
        <DetailRow label="Service area" value={<span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{technicianProfile?.service_area ?? "—"}</span>} />
        <DetailRow label="Home base" value={technicianProfile?.home_base ?? "—"} />
        <DetailRow label="Hire date" value={formatDate(technicianProfile?.hire_date)} />
      </InfoCard>

      <InfoCard title="Live Operations">
        <DetailRow label="Current status" value={<span className={`inline-flex border px-2 py-1 text-[9px] font-black uppercase ${technicianStatusTone(snapshot.status)}`}>{snapshot.status}</span>} />
        <DetailRow label="Current activity" value={snapshot.statusDetail} />
        <DetailRow label="Current work" value={snapshot.currentWorkOrderNumber ? `${snapshot.currentWorkOrderNumber} · ${snapshot.currentWorkOrderTitle ?? ""}` : "No active work order"} />
        <DetailRow label="Open work" value={`${snapshot.openWorkCount} work order${snapshot.openWorkCount === 1 ? "" : "s"}`} />
        <DetailRow label="Outside shift" value={`${minutesLabel(snapshot.weekOvertimeMinutes)} this week`} />
        <DetailRow label="Certification alerts" value={snapshot.certificationAlerts === 0 ? "None" : `${snapshot.certificationAlerts} requiring attention`} />
      </InfoCard>

      <InfoCard title="Contact & Account">
        <DetailRow label="Name" value={profile.full_name ?? "—"} />
        <DetailRow label="Email" value={profile.email ?? "—"} />
        <DetailRow label="Phone" value={profile.phone ?? "—"} />
        <DetailRow label="FieldOps access" value={profile.active ? "Active" : "Inactive"} />
      </InfoCard>

      <InfoCard title="Working Hours">
        <DetailRow label="Shift" value={<span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-muted-foreground" />{formatTime(technicianProfile?.shift_start)}–{formatTime(technicianProfile?.shift_end)}</span>} />
        <DetailRow label="Dispatch behavior" value="Assignments and schedule events determine live availability." />
        <DetailRow label="Temporary absence" value="Use Schedule for vacation, sick time, training, meetings, lunch, or unavailable blocks." />
      </InfoCard>

      {canViewCompensation && (
        <div className="xl:col-span-2">
          <InfoCard
            title="Default Rates"
            action={canEditCompensation ? <button type="button" onClick={onEditCompensation} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><DollarSign className="h-3.5 w-3.5" />Edit rates</button> : undefined}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-border bg-muted/20 p-4">
                <div className="text-[10px] font-black uppercase text-muted-foreground">Billing Rate</div>
                <div className="mt-2 text-2xl font-black">{formatMoney(compensation?.billing_rate, compensation?.currency ?? "CAD")}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">Customer billing default per hour</div>
              </div>
              <div className="border border-border bg-muted/20 p-4">
                <div className="text-[10px] font-black uppercase text-muted-foreground">Pay Rate</div>
                <div className="mt-2 text-2xl font-black">{formatMoney(compensation?.pay_rate, compensation?.currency ?? "CAD")}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">Technician pay default per hour</div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Rates are kept separate. New actual-time entries can snapshot these defaults; historical time-entry rates remain on the time record.
            </div>
          </InfoCard>
        </div>
      )}
    </div>
  );
}
