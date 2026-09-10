"use client";
import type { DbProfile, DbSettingsAudit } from "../types";
import { formatDateTime, humanize } from "../utils";
export function AuditPanel({ events, profiles }: { events:DbSettingsAudit[]; profiles:DbProfile[] }) {
  const names=new Map(profiles.map(p=>[p.id,p.full_name?.trim()||p.email||"User"]));
  return <div className="border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-base font-black">Settings & access audit</h2><p className="mt-1 text-xs text-muted-foreground">Recent changes are retained instead of silently overwritten.</p></div>{events.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No settings audit activity yet.</div>:<div className="divide-y divide-border">{events.map(event=><div key={event.id} className="grid gap-2 px-5 py-4 md:grid-cols-[190px_1fr_180px]"><div><div className="text-xs font-black">{humanize(event.event_type)}</div><div className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(event.created_at)}</div></div><div className="min-w-0 text-xs text-muted-foreground">{event.target_user_id?`Target: ${names.get(event.target_user_id)||"User"}`:"FieldOps settings updated"}</div><div className="text-xs font-semibold md:text-right">{event.created_by?names.get(event.created_by)||"User":"System"}</div></div>)}</div>}</div>;
}
