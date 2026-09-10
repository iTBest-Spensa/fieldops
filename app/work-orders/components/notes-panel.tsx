import { MessageSquareText } from "lucide-react";
import type { DbNote, DbProfile } from "../types";
import { formatLocalDateTime } from "../utils";

export function NotesPanel({
  notes,
  loading,
  noteText,
  setNoteText,
  noteVisibility,
  setNoteVisibility,
  savingNote,
  onAddNote,
  profileMap,
}: {
  notes: DbNote[];
  loading: boolean;
  noteText: string;
  setNoteText: (value: string) => void;
  noteVisibility: "internal" | "customer";
  setNoteVisibility: (value: "internal" | "customer") => void;
  savingNote: boolean;
  onAddNote: () => void;
  profileMap: Map<string, DbProfile>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Add note
        </div>

        <textarea
          rows={6}
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Add internal information, customer-visible notes, follow-up details..."
          className="mt-4 w-full resize-y border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <select
            value={noteVisibility}
            onChange={(event) =>
              setNoteVisibility(event.target.value as "internal" | "customer")
            }
            className="h-10 border border-border bg-card px-3 text-sm font-semibold outline-none"
          >
            <option value="internal">Internal</option>
            <option value="customer">Customer visible</option>
          </select>

          <button
            type="button"
            disabled={savingNote || !noteText.trim()}
            onClick={onAddNote}
            className="h-10 bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {savingNote ? "Adding…" : "Add Note"}
          </button>
        </div>
      </section>

      <section className="border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider">
          Notes History
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No notes have been added yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notes.map((note) => (
              <div key={note.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold">
                    {note.created_by
                      ? profileMap.get(note.created_by)?.full_name ??
                        profileMap.get(note.created_by)?.email ??
                        "FieldOps user"
                      : "FieldOps user"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border border-border px-2 py-0.5 text-[9px] font-black uppercase text-muted-foreground">
                      {note.visibility}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatLocalDateTime(note.created_at)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm leading-5">{note.note}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
