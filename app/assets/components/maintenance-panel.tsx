"use client";

import { Plus } from "lucide-react";
import type { DbAssetMaintenance, DbWorkOrder } from "../types";
import { capitalize, formatDate, formatMoney, maintenanceStatusTone } from "../utils";

export function MaintenancePanel({
  maintenance,
  workOrderMap,
  canManage,
  onAdd,
  onEdit,
}: {
  maintenance: DbAssetMaintenance[];
  workOrderMap: Map<string, DbWorkOrder>;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (item: DbAssetMaintenance) => void;
}) {
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Maintenance
          </button>
        </div>
      )}

      {maintenance.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No maintenance records yet.</div>
      ) : (
        <div className="space-y-3">
          {[...maintenance]
            .sort((a, b) => (b.completed_date ?? b.scheduled_date ?? b.created_at).localeCompare(a.completed_date ?? a.scheduled_date ?? a.created_at))
            .map((item) => {
              const order = item.work_order_id ? workOrderMap.get(item.work_order_id) : null;
              return (
                <article key={item.id} className="border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black">{item.title}</div>
                        <span className={`border px-2 py-1 text-[9px] font-black uppercase ${maintenanceStatusTone(item.status)}`}>{capitalize(item.status)}</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{capitalize(item.maintenance_type)}</div>
                    </div>
                    {canManage && (
                      <button type="button" onClick={() => onEdit(item)} className="text-xs font-black text-primary hover:underline">Edit</button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <div><span className="text-muted-foreground">Scheduled: </span><span className="font-bold">{formatDate(item.scheduled_date)}</span></div>
                    <div><span className="text-muted-foreground">Completed: </span><span className="font-bold">{formatDate(item.completed_date)}</span></div>
                    <div><span className="text-muted-foreground">Provider: </span><span className="font-bold">{item.provider || "—"}</span></div>
                    <div><span className="text-muted-foreground">Cost: </span><span className="font-bold">{formatMoney(item.cost)}</span></div>
                  </div>
                  {order && <div className="mt-2 text-[10px] text-muted-foreground">Linked work order: {order.work_order_number} · {order.title}</div>}
                  {item.description && <div className="mt-3 border-t border-border pt-3 text-xs">{item.description}</div>}
                  {item.notes && <div className="mt-2 text-xs text-muted-foreground">{item.notes}</div>}
                </article>
              );
            })}
        </div>
      )}
    </div>
  );
}
