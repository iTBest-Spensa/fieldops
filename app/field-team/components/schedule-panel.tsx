"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import type { DbAssignment, DbCustomer, DbScheduleEvent, DbSite, DbWorkOrder } from "../types";
import { capitalize, eventTone, formatDateTime, workOrderStatusTone } from "../utils";
import { InfoCard } from "./info-card";

export function SchedulePanel({
  assignments,
  events,
  workOrderMap,
  customerMap,
  siteMap,
  canSchedule,
  onAddEvent,
  onDeleteEvent,
}: {
  assignments: DbAssignment[];
  events: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  canSchedule: boolean;
  onAddEvent: () => void;
  onDeleteEvent: (event: DbScheduleEvent) => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);
  const scheduleItems = [
    ...assignments
      .filter((assignment) => assignment.assignment_status !== "removed" && assignment.assignment_status !== "declined" && assignment.assignment_status !== "completed" && assignment.released_at === null && assignment.scheduled_start && assignment.scheduled_end)
      .map((assignment) => ({ kind: "work" as const, start: assignment.scheduled_start!, end: assignment.scheduled_end!, assignment })),
    ...events.map((event) => ({ kind: "event" as const, start: event.starts_at, end: event.ends_at, event })),
  ].filter((item) => new Date(item.end).getTime() >= now - 7 * 86400000)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <InfoCard
      title="Schedule"
      action={canSchedule ? <button type="button" onClick={onAddEvent} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><Plus className="h-3.5 w-3.5" />Add schedule event</button> : undefined}
    >
      <div className="mb-4 flex items-start gap-2 border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Work-order assignments and non-job schedule events are shown together. Vacation, sick time, training, meetings, lunch, breaks, and unavailable blocks participate in technician scheduling.
      </div>
      {scheduleItems.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No recent or upcoming schedule items.</div>
      ) : (
        <div className="divide-y divide-border">
          {scheduleItems.map((item) => {
            if (item.kind === "work") {
              const workOrder = workOrderMap.get(item.assignment.work_order_id);
              const customer = workOrder ? customerMap.get(workOrder.customer_id) : null;
              const site = workOrder?.site_id ? siteMap.get(workOrder.site_id) : null;
              return (
                <div key={`work-${item.assignment.id}`} className="grid gap-3 py-3 md:grid-cols-[190px_1fr_160px] md:items-center">
                  <div className="text-xs font-bold">{formatDateTime(item.start)}<div className="mt-1 text-[10px] text-muted-foreground">to {formatDateTime(item.end)}</div></div>
                  <div>
                    <div className="text-xs font-black">{workOrder?.work_order_number ?? "Work Order"} · {workOrder?.title ?? "Scheduled work"}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{customer?.name ?? "Unknown customer"}{site ? ` · ${site.name}${site.city ? `, ${site.city}` : ""}` : ""}</div>
                  </div>
                  <div className="md:text-right"><span className={`inline-flex border px-2 py-1 text-[9px] font-black uppercase ${workOrderStatusTone(workOrder?.status ?? "planned")}`}>{capitalize(workOrder?.status ?? "planned")}</span></div>
                </div>
              );
            }
            return (
              <div key={`event-${item.event.id}`} className="grid gap-3 py-3 md:grid-cols-[190px_1fr_160px] md:items-center">
                <div className="text-xs font-bold">{formatDateTime(item.start)}<div className="mt-1 text-[10px] text-muted-foreground">to {formatDateTime(item.end)}</div></div>
                <div><div className="text-xs font-black">{item.event.title}</div>{item.event.notes && <div className="mt-1 text-[10px] text-muted-foreground">{item.event.notes}</div>}</div>
                <div className="flex items-center gap-2 md:justify-end">
                  <span className={`inline-flex border px-2 py-1 text-[9px] font-black uppercase ${eventTone(item.event.event_type)}`}>{capitalize(item.event.event_type)}</span>
                  {canSchedule && <button type="button" onClick={() => onDeleteEvent(item.event)} title="Delete schedule event" className="text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </InfoCard>
  );
}
