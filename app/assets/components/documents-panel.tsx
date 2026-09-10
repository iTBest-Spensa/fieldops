"use client";

import { ExternalLink, FileText, Plus } from "lucide-react";
import type { DbAssetDocument } from "../types";
import { capitalize, formatDate } from "../utils";

export function DocumentsPanel({
  documents,
  canManage,
  onAdd,
  onRemove,
}: {
  documents: DbAssetDocument[];
  canManage: boolean;
  onAdd: () => void;
  onRemove: (item: DbAssetDocument) => void;
}) {
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Document Link
          </button>
        </div>
      )}
      {documents.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No document links have been attached to this asset.</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {[...documents].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((item) => (
            <article key={item.id} className="border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black">{item.name}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{capitalize(item.document_type)}</div>
                  {item.expires_on && <div className="mt-2 text-xs text-muted-foreground">Expires {formatDate(item.expires_on)}</div>}
                  {item.notes && <div className="mt-2 text-xs text-muted-foreground">{item.notes}</div>}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {canManage && <button type="button" onClick={() => onRemove(item)} className="text-xs font-black text-rose-600 hover:underline dark:text-rose-400">Remove</button>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
