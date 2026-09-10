import type { DbSite, DbWorkOrder } from "../types";
import { capitalize, formatDateTime, workOrderStatusTone, workOrderSortTime } from "../utils";

export function CustomerWorkOrdersPanel({ workOrders, sites }: { workOrders: DbWorkOrder[]; sites: DbSite[]; }) {
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  if (workOrders.length === 0) return <div className="border border-border bg-card p-5 text-sm text-muted-foreground">This customer does not have any work orders yet.</div>;

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <tr><th className="border-b border-border px-4 py-3">Work Order</th><th className="border-b border-border px-4 py-3">Site</th><th className="border-b border-border px-4 py-3">Priority</th><th className="border-b border-border px-4 py-3">Status</th><th className="border-b border-border px-4 py-3">Date</th></tr>
        </thead>
        <tbody>
          {[...workOrders].sort((a,b) => workOrderSortTime(b)-workOrderSortTime(a)).map((order) => (
            <tr key={order.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-4"><div className="text-xs font-black text-primary">{order.work_order_number}</div><div className="mt-1 text-sm font-bold">{order.title}</div></td>
              <td className="px-4 py-4 text-xs text-muted-foreground">{order.site_id ? siteMap.get(order.site_id)?.name ?? "Assigned site" : "No specific site"}</td>
              <td className="px-4 py-4 text-xs font-bold">{capitalize(order.priority)}</td>
              <td className="px-4 py-4"><span className={`border px-2 py-1 text-[9px] font-black uppercase ${workOrderStatusTone(order.status)}`}>{capitalize(order.status)}</span></td>
              <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(order.closed_at ?? order.completed_at ?? order.scheduled_start ?? order.requested_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
