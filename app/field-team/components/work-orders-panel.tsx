"use client";

import type { DbAssignment, DbCustomer, DbSite, DbWorkOrder } from "../types";
import { capitalize, formatDateTime, workOrderStatusTone } from "../utils";
import { InfoCard } from "./info-card";

export function WorkOrdersPanel({
  assignments,
  workOrderMap,
  customerMap,
  siteMap,
}: {
  assignments: DbAssignment[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
}) {
  const rows = assignments
    .map((assignment) => ({ assignment, workOrder: workOrderMap.get(assignment.work_order_id) ?? null }))
    .filter((row) => row.workOrder !== null)
    .sort((a, b) => new Date(b.assignment.scheduled_start ?? b.assignment.assigned_at ?? 0).getTime() - new Date(a.assignment.scheduled_start ?? a.assignment.assigned_at ?? 0).getTime());

  return (
    <InfoCard title="Work Order History">
      {rows.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No work-order assignments are recorded for this technician.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="text-[9px] font-black uppercase tracking-wider text-muted-foreground"><tr><th className="border-b border-border px-3 py-2">Work Order</th><th className="border-b border-border px-3 py-2">Customer / Site</th><th className="border-b border-border px-3 py-2">Scheduled</th><th className="border-b border-border px-3 py-2">Assignment</th><th className="border-b border-border px-3 py-2">Work Status</th></tr></thead>
            <tbody>
              {rows.map(({ assignment, workOrder }) => {
                if (!workOrder) return null;
                const customer = customerMap.get(workOrder.customer_id);
                const site = workOrder.site_id ? siteMap.get(workOrder.site_id) : null;
                return <tr key={assignment.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-3"><div className="text-xs font-black text-primary">{workOrder.work_order_number}</div><div className="mt-1 text-xs font-semibold">{workOrder.title}</div></td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{customer?.name ?? "Unknown customer"}<div className="mt-1 text-[10px]">{site?.name ?? workOrder.service_area ?? "—"}</div></td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(assignment.scheduled_start ?? workOrder.scheduled_start)}<div className="mt-1 text-[10px]">to {formatDateTime(assignment.scheduled_end ?? workOrder.scheduled_end)}</div></td>
                  <td className="px-3 py-3"><span className="border border-border bg-muted/30 px-2 py-1 text-[9px] font-black uppercase">{capitalize(assignment.assignment_status)}</span>{assignment.released_at && <div className="mt-1 text-[9px] text-muted-foreground">Released {formatDateTime(assignment.released_at)}</div>}</td>
                  <td className="px-3 py-3"><span className={`border px-2 py-1 text-[9px] font-black uppercase ${workOrderStatusTone(workOrder.status)}`}>{capitalize(workOrder.status)}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </InfoCard>
  );
}
