"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DbCustomer, DbSite, DbWorkOrder } from "../types";
import { capitalize, formatDate } from "../utils";

export function WorkOrdersPanel({
  workOrders,
  customerMap,
  siteMap,
}: {
  workOrders: DbWorkOrder[];
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
}) {
  if (workOrders.length === 0) {
    return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No work orders are linked to this asset yet.</div>;
  }

  return (
    <div className="space-y-3">
      {[...workOrders].sort((a, b) => (b.scheduled_start ?? b.requested_at).localeCompare(a.scheduled_start ?? a.requested_at)).map((order) => {
        const customer = customerMap.get(order.customer_id);
        const site = order.site_id ? siteMap.get(order.site_id) : null;
        return (
          <article key={order.id} className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black text-primary">{order.work_order_number}</div>
                <div className="mt-1 text-sm font-black">{order.title}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {customer?.name ?? "Unknown customer"}{site ? ` · ${site.name}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-muted-foreground">{capitalize(order.status)}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{formatDate(order.scheduled_start ?? order.requested_at)}</div>
              </div>
            </div>
          </article>
        );
      })}
      <Link href="/work-orders" className="inline-flex items-center gap-2 text-xs font-black text-primary hover:underline">
        Open Work Orders <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
