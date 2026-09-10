"use client";
import { MessageSquareText, Plus } from "lucide-react";
import type { DbCustomerNote, DbProfile } from "../types";
import { formatDateTime } from "../utils";

export function CustomerNotesPanel({ notes, profileMap, canManage, onAdd }: {
  notes: DbCustomerNote[];
  profileMap: Map<string, DbProfile>;
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><h3 className="text-sm font-black">Customer Notes</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Internal customer-level information.</p></div>
        {canManage && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="h-3.5 w-3.5" />Add Note</button>}
      </div>
      {notes.length === 0 ? <div className="p-5 text-sm text-muted-foreground">No customer notes have been added.</div> : (
        <div className="divide-y divide-border">
          {notes.map((note) => {
            const author = note.created_by ? profileMap.get(note.created_by) : null;
            return (
              <article key={note.id} className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0"><div className="whitespace-pre-wrap text-sm leading-6">{note.note}</div><div className="mt-2 text-[10px] font-semibold text-muted-foreground">{author?.full_name ?? author?.email ?? "FieldOps user"} · {formatDateTime(note.created_at)}</div></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
