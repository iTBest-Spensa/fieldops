"use client";

import { Plus } from "lucide-react";
import type { DbProfile, DbTechnicianNote } from "../types";
import { formatDateTime } from "../utils";
import { InfoCard } from "./info-card";

export function NotesPanel({
  notes,
  profileMap,
  canAddNote,
  onAddNote,
}: {
  notes: DbTechnicianNote[];
  profileMap: Map<string, DbProfile>;
  canAddNote: boolean;
  onAddNote: () => void;
}) {
  const rows = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <InfoCard title="Internal Field-Team Notes" action={canAddNote ? <button type="button" onClick={onAddNote} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add note</button> : undefined}>
      {rows.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No internal technician notes are recorded.</div> : (
        <div className="space-y-3">
          {rows.map((note) => {
            const author = note.created_by ? profileMap.get(note.created_by) : null;
            return <article key={note.id} className="border border-border bg-muted/20 p-4"><div className="text-sm leading-6">{note.note}</div><div className="mt-3 text-[10px] font-semibold text-muted-foreground">{author?.full_name ?? author?.email ?? "FieldOps user"} · {formatDateTime(note.created_at)}</div></article>;
          })}
        </div>
      )}
    </InfoCard>
  );
}
