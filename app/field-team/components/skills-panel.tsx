"use client";

import { BadgeCheck, BadgePlus, Plus, XCircle } from "lucide-react";
import type { DbTechnicianCertification, DbTechnicianSkill } from "../types";
import { capitalize, certificationState, formatDate } from "../utils";
import { InfoCard } from "./info-card";

export function SkillsPanel({
  skills,
  certifications,
  canManage,
  onAddSkill,
  onAddCertification,
  onDeactivateSkill,
  onDeactivateCertification,
}: {
  skills: DbTechnicianSkill[];
  certifications: DbTechnicianCertification[];
  canManage: boolean;
  onAddSkill: () => void;
  onAddCertification: () => void;
  onDeactivateSkill: (skill: DbTechnicianSkill) => void;
  onDeactivateCertification: (certification: DbTechnicianCertification) => void;
}) {
  const activeSkills = skills.filter((skill) => skill.active).sort((a, b) => a.skill_name.localeCompare(b.skill_name));
  const activeCertifications = certifications.filter((certification) => certification.active).sort((a, b) => a.certification_name.localeCompare(b.certification_name));

  return (
    <div className="space-y-4">
      <InfoCard
        title="Skills"
        action={canManage ? <button type="button" onClick={onAddSkill} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add skill</button> : undefined}
      >
        {activeSkills.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No active skills are recorded.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeSkills.map((skill) => (
              <div key={skill.id} className="border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black"><BadgeCheck className="h-4 w-4 text-primary" />{skill.skill_name}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{capitalize(skill.proficiency)}</div>
                  </div>
                  {canManage && <button type="button" onClick={() => onDeactivateSkill(skill)} title="Deactivate skill" className="text-muted-foreground hover:text-rose-500"><XCircle className="h-4 w-4" /></button>}
                </div>
                {skill.notes && <div className="mt-3 text-xs text-muted-foreground">{skill.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      <InfoCard
        title="Certifications"
        action={canManage ? <button type="button" onClick={onAddCertification} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><BadgePlus className="h-3.5 w-3.5" />Add certification</button> : undefined}
      >
        {activeCertifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No active certifications are recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-3 py-2">Certification</th>
                  <th className="border-b border-border px-3 py-2">Issuer</th>
                  <th className="border-b border-border px-3 py-2">Credential</th>
                  <th className="border-b border-border px-3 py-2">Issued</th>
                  <th className="border-b border-border px-3 py-2">Expiry</th>
                  <th className="border-b border-border px-3 py-2">Status</th>
                  {canManage && <th className="border-b border-border px-3 py-2 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {activeCertifications.map((certification) => {
                  const state = certificationState(certification);
                  return (
                    <tr key={certification.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-3 text-xs font-black">{certification.certification_name}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{certification.issuer ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{certification.credential_number ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(certification.issued_on)}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(certification.expires_on)}</td>
                      <td className="px-3 py-3"><span className={`border px-2 py-1 text-[9px] font-black uppercase ${state.alert ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>{state.label}</span></td>
                      {canManage && <td className="px-3 py-3 text-right"><button type="button" onClick={() => onDeactivateCertification(certification)} className="text-[10px] font-black text-rose-500 hover:underline">Deactivate</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>
    </div>
  );
}
