"use client";

import { ChevronRight } from "lucide-react";
import type { DbInventoryLocation, DbReconciliation } from "../types";
import { capitalize, formatDateTime } from "../utils";
export function ReconciliationTable({ reconciliations, locationMap, onOpen }: { reconciliations: DbReconciliation[]; locationMap: Map<string, DbInventoryLocation>; onOpen: (id: string) => void }) {
  if (!reconciliations.length) return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No reconciliations have been started.</div>;
  return <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[850px] text-left"><thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground"><tr><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Posted</th><th className="px-4 py-3 text-right">View</th></tr></thead><tbody>{reconciliations.map(r=><tr key={r.id} className="border-t border-border hover:bg-row-hover"><td className="px-4 py-4 text-sm font-black">{r.reconciliation_number}</td><td className="px-4 py-4 text-xs font-bold">{locationMap.get(r.location_id)?.name??"—"}</td><td className="px-4 py-4 text-xs font-black uppercase">{capitalize(r.status)}</td><td className="px-4 py-4 text-xs">{formatDateTime(r.started_at)}</td><td className="px-4 py-4 text-xs">{formatDateTime(r.posted_at)}</td><td className="px-4 py-4 text-right"><button onClick={()=>onOpen(r.id)} className="inline-flex items-center gap-1 text-xs font-black text-primary">View <ChevronRight className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>;
}
