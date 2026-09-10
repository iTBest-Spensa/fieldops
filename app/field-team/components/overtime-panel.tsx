"use client";

import type { DbTechnicianProfile, DbTimeEntry, DbWorkOrder } from "../types";
import { activityLabel, formatDateTime, minutesLabel, outsideShiftMinutesForEntry, weekBounds } from "../utils";
import { InfoCard } from "./info-card";

export function OvertimePanel({
  entries,
  technicianProfile,
  workOrderMap,
}: {
  entries: DbTimeEntry[];
  technicianProfile: DbTechnicianProfile | null;
  workOrderMap: Map<string, DbWorkOrder>;
}) {
  const now = new Date();
  const week = weekBounds(now);
  const rows = entries
    .map((entry) => ({
      entry,
      outsideMinutes: outsideShiftMinutesForEntry(entry, technicianProfile?.shift_start ?? "07:00", technicianProfile?.shift_end ?? "17:00", now, week.start, week.end),
    }))
    .filter((item) => item.outsideMinutes > 0)
    .sort((a, b) => new Date(b.entry.started_at).getTime() - new Date(a.entry.started_at).getTime());
  const total = rows.reduce((sum, item) => sum + item.outsideMinutes, 0);

  return (
    <div className="space-y-4">
      <div className="border border-border bg-card p-4">
        <div className="text-[10px] font-black uppercase text-muted-foreground">Actual Time Outside Configured Shift · This Week</div>
        <div className="mt-2 text-3xl font-black">{minutesLabel(total)}</div>
        <div className="mt-2 text-xs text-muted-foreground">Configured shift: {technicianProfile?.shift_start?.slice(0, 5) ?? "07:00"}–{technicianProfile?.shift_end?.slice(0, 5) ?? "17:00"}. This is an operational outside-shift measure, not a payroll/legal overtime determination.</div>
      </div>
      <InfoCard title="Outside-Shift Detail">
        {rows.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No actual technician time falls outside the configured shift this week.</div> : (
          <div className="divide-y divide-border">
            {rows.map(({ entry, outsideMinutes }) => {
              const workOrder = workOrderMap.get(entry.work_order_id);
              return <div key={entry.id} className="grid gap-3 py-3 md:grid-cols-[1fr_180px_160px] md:items-center">
                <div><div className="text-xs font-black">{workOrder?.work_order_number ?? "Work Order"} · {workOrder?.title ?? "Unknown work"}</div><div className="mt-1 text-[10px] text-muted-foreground">{activityLabel(entry.activity_type)} · {formatDateTime(entry.started_at)} to {entry.ended_at ? formatDateTime(entry.ended_at) : "NOW"}</div></div>
                <div className="text-xs text-muted-foreground">Recorded segment</div>
                <div className="font-black text-amber-600 dark:text-amber-400 md:text-right">{minutesLabel(outsideMinutes)}</div>
              </div>;
            })}
          </div>
        )}
      </InfoCard>
    </div>
  );
}
