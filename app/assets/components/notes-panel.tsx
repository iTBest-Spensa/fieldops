"use client";

import { Plus } from "lucide-react";
import type { DbAssetNote, DbProfile } from "../types";
import { formatDateTime, profileName } from "../utils";

export function NotesPanel({
  notes,
  profileMap,
  canAdd,
  onAdd,
}: {
  notes: DbAssetNote[];
  profileMap: Map<string, DbProfile>;
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex justify-end">
          <button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Note
          </button>
        </div>
      )}
      {notes.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No internal asset notes yet.</div>
      ) : (
        <div className="space-y-3">
          {[...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((item) => (
            <article key={item.id} className="border border-border bg-card p-4">
              <div className="text-sm leading-6">{item.note}</div>
              <div className="mt-3 text-[10px] text-muted-foreground">
                {profileName(item.created_by ? profileMap.get(item.created_by) : null)} · {formatDateTime(item.created_at)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
