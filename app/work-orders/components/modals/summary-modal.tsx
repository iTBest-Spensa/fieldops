import { ChevronRight, X } from "lucide-react";
import type { DbAssignment, DbCustomer, DbProfile, DbSite, DbWorkOrder, SummaryView, WorkOrderOverrun } from "../../types";
import { formatCompactDateTime, formatLocalDateTime, minutesLabel, statusLabel, statusTone } from "../../utils";

type Props = {
  summaryView: SummaryView;
  summaryOrders: DbWorkOrder[];
  workOrderOverruns: WorkOrderOverrun[];
  orders: DbWorkOrder[];
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  assignmentMap: Map<string, DbAssignment[]>;
  profileMap: Map<string, DbProfile>;
  onClose: () => void;
  onOpenOrder: (order: DbWorkOrder) => void;
};

export function SummaryModal(props: Props) {
  const { summaryView, summaryOrders, workOrderOverruns, orders, customerMap, siteMap, assignmentMap, profileMap, onClose, onOpenOrder } = props;
  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close work order list"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <section className="relative z-10 flex max-h-[86vh] w-full max-w-[1050px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div>
            <div className="text-xs font-semibold text-primary">Work Orders</div>
            <h2 className="mt-1 text-xl font-bold">
              {summaryView === "requested"
                ? "Requested"
                : summaryView === "today"
                ? "Scheduled Today"
                : summaryView === "progress"
                ? "In Progress"
                : summaryView === "dispatch"
                ? "Needs Dispatch"
                : summaryView === "billing"
                ? "Billing Ready"
                : summaryView === "closed"
                ? "Closed"
                : "Overrun"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summaryOrders.length} work order{summaryOrders.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {summaryView === "overrun" ? (
            workOrderOverruns.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No technician has exceeded a planned work-order end time.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workOrderOverruns.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      const order = orders.find(
                        (workOrder) =>
                          workOrder.id === item.workOrderId
                      );
                      if (order) onOpenOrder(order);
                    }}
                    className="grid w-full gap-3 p-4 text-left transition hover:bg-row-hover md:grid-cols-[1.05fr_0.8fr_170px_150px_26px]"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-rose-500">
                        {item.workOrderNumber}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold">
                        {item.title}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Technician
                      </div>
                      <div className="mt-1 text-xs font-semibold">
                        {item.technicianName}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Planned End
                      </div>
                      <div className="mt-1 text-xs font-semibold">
                        {formatLocalDateTime(item.plannedEnd)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-rose-500">
                        Overrun
                      </div>
                      <div className="mt-1 text-xs font-black text-rose-500">
                        {minutesLabel(item.overrunMinutes)}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {item.active
                          ? "ACTIVE · to NOW"
                          : item.actualEnd
                          ? `Ended ${formatLocalDateTime(item.actualEnd)}`
                          : ""}
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
            )
          ) : summaryOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No work orders are currently in this group.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summaryOrders.map((order) => {
                const customer = customerMap.get(order.customer_id);
                const site = order.site_id ? siteMap.get(order.site_id) : null;
                const techNames = (assignmentMap.get(order.id) ?? [])
                  .filter((assignment) => assignment.assignment_status !== "removed")
                  .map(
                    (assignment) =>
                      profileMap.get(assignment.technician_id)?.full_name ??
                      profileMap.get(assignment.technician_id)?.email ??
                      "Technician"
                  );

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onOpenOrder(order)}
                    className="grid w-full gap-3 p-4 text-left transition hover:bg-row-hover md:grid-cols-[1.1fr_0.9fr_140px_170px_26px]"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-primary">
                        {order.work_order_number}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold">
                        {order.title}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {customer?.name ?? "Unknown customer"}
                        {site ? ` · ${site.name}` : ""}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Technician
                      </div>
                      <div className="mt-1 truncate text-xs font-semibold">
                        {techNames[0] ?? "Unassigned"}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex border px-2 py-1 text-[9px] font-black ${statusTone(
                          order.status
                        )}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <div className="text-[11px]">
                      <div className="font-semibold">
                        {formatCompactDateTime(order.scheduled_start)}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {statusLabel(order.priority)} priority
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 text-primary" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
