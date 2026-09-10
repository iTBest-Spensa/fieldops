"use client";

import type { DbTimeEntry, DbWorkOrder } from "../types";
import { activityLabel, actualMinutes, capitalize, formatDateTime, formatMoney, minutesLabel } from "../utils";
import { InfoCard } from "./info-card";

export function TimePanel({
  entries,
  workOrderMap,
  canViewCompensation,
}: {
  entries: DbTimeEntry[];
  workOrderMap: Map<string, DbWorkOrder>;
  canViewCompensation: boolean;
}) {
  const rows = [...entries].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  const totalMinutes = rows.reduce((sum, entry) => sum + actualMinutes(entry), 0);
  const billableMinutes = rows.filter((entry) => entry.billable).reduce((sum, entry) => sum + actualMinutes(entry), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-border bg-card p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Recorded Time</div><div className="mt-2 text-2xl font-black">{minutesLabel(totalMinutes)}</div></div>
        <div className="border border-border bg-card p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Billable Time</div><div className="mt-2 text-2xl font-black">{minutesLabel(billableMinutes)}</div></div>
        <div className="border border-border bg-card p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Time Segments</div><div className="mt-2 text-2xl font-black">{rows.length}</div></div>
      </div>

      <InfoCard title="Actual Technician Time">
        <div className="mb-3 border border-border bg-muted/20 p-3 text-xs text-muted-foreground">This page is a read-only technician history. Historical corrections remain controlled from the Work Order so billing and audit context stay attached to the job.</div>
        {rows.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No actual-time records are available.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="text-[9px] font-black uppercase tracking-wider text-muted-foreground"><tr><th className="border-b border-border px-3 py-2">Work Order</th><th className="border-b border-border px-3 py-2">Activity</th><th className="border-b border-border px-3 py-2">Start</th><th className="border-b border-border px-3 py-2">End</th><th className="border-b border-border px-3 py-2">Duration</th><th className="border-b border-border px-3 py-2">Billable</th>{canViewCompensation && <><th className="border-b border-border px-3 py-2">Billing Rate</th><th className="border-b border-border px-3 py-2">Pay Rate</th></>}<th className="border-b border-border px-3 py-2">Approval</th></tr></thead>
              <tbody>
                {rows.map((entry) => {
                  const workOrder = workOrderMap.get(entry.work_order_id);
                  return <tr key={entry.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-3"><div className="text-xs font-black text-primary">{workOrder?.work_order_number ?? "—"}</div><div className="mt-1 text-[10px] text-muted-foreground">{workOrder?.title ?? "Unknown work order"}</div></td>
                    <td className="px-3 py-3 text-xs font-bold">{activityLabel(entry.activity_type)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(entry.started_at)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{entry.ended_at ? formatDateTime(entry.ended_at) : <span className="font-black text-orange-500">ACTIVE</span>}</td>
                    <td className="px-3 py-3 text-xs font-black">{minutesLabel(actualMinutes(entry))}</td>
                    <td className="px-3 py-3 text-xs">{entry.billable ? "Yes" : "No"}</td>
                    {canViewCompensation && <><td className="px-3 py-3 text-xs text-muted-foreground">{formatMoney(entry.billing_rate)}</td><td className="px-3 py-3 text-xs text-muted-foreground">{formatMoney(entry.pay_rate)}</td></>}
                    <td className="px-3 py-3"><span className="border border-border bg-muted/30 px-2 py-1 text-[9px] font-black uppercase">{capitalize(entry.approval_status)}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>
    </div>
  );
}
