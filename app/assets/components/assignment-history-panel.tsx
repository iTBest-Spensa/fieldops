"use client";

import type {
  DbAssetHistory,
  DbCustomer,
  DbInventoryLocation,
  DbProfile,
  DbSite,
  DbWorkOrder,
} from "../types";
import { capitalize, formatDateTime, profileName, siteLabel } from "../utils";

function locationText(args: {
  userId: string | null;
  customerId: string | null;
  siteId: string | null;
  workOrderId: string | null;
  locationId: string | null;
  profileMap: Map<string, DbProfile>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  workOrderMap: Map<string, DbWorkOrder>;
  locationMap: Map<string, DbInventoryLocation>;
}) {
  const { userId, customerId, siteId, workOrderId, locationId, profileMap, customerMap, siteMap, workOrderMap, locationMap } = args;
  if (workOrderId) {
    const order = workOrderMap.get(workOrderId);
    return order ? `${order.work_order_number} · ${order.title}` : "Work order";
  }
  if (userId) return profileName(profileMap.get(userId));
  if (siteId) return siteLabel(siteMap.get(siteId));
  if (customerId) return customerMap.get(customerId)?.name ?? "Customer";
  if (locationId) return locationMap.get(locationId)?.name ?? "Storage location";
  return "Available / unassigned";
}

export function AssignmentHistoryPanel({
  history,
  profileMap,
  customerMap,
  siteMap,
  workOrderMap,
  locationMap,
}: {
  history: DbAssetHistory[];
  profileMap: Map<string, DbProfile>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  workOrderMap: Map<string, DbWorkOrder>;
  locationMap: Map<string, DbInventoryLocation>;
}) {
  if (history.length === 0) {
    return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No asset history has been recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      {[...history].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((item) => {
        const from = locationText({
          userId: item.from_user_id,
          customerId: item.from_customer_id,
          siteId: item.from_site_id,
          workOrderId: item.from_work_order_id,
          locationId: item.from_location_id,
          profileMap,
          customerMap,
          siteMap,
          workOrderMap,
          locationMap,
        });
        const to = locationText({
          userId: item.to_user_id,
          customerId: item.to_customer_id,
          siteId: item.to_site_id,
          workOrderId: item.to_work_order_id,
          locationId: item.to_location_id,
          profileMap,
          customerMap,
          siteMap,
          workOrderMap,
          locationMap,
        });
        return (
          <article key={item.id} className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black text-primary">{capitalize(item.event_type)}</div>
                <div className="mt-1 text-sm font-bold">
                  {from === to ? to : `${from} → ${to}`}
                </div>
                {(item.from_status || item.to_status) && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Status: {capitalize(item.from_status)} → {capitalize(item.to_status)}
                  </div>
                )}
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                <div>{formatDateTime(item.created_at)}</div>
                <div className="mt-1">By {profileName(item.created_by ? profileMap.get(item.created_by) : null)}</div>
              </div>
            </div>
            {item.notes && <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{item.notes}</div>}
          </article>
        );
      })}
    </div>
  );
}
