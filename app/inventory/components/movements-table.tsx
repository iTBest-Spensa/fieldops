"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import type {
  DbInventoryItem,
  DbInventoryLocation,
  DbInventoryTransaction,
  DbProfile,
  DbWorkOrder,
} from "../types";
import { capitalize, formatDateTime, formatQty, money } from "../utils";

export function MovementsTable({
  movements,
  itemMap,
  locationMap,
  workOrderMap,
  profileMap,
}: {
  movements: DbInventoryTransaction[];
  itemMap: Map<string, DbInventoryItem>;
  locationMap: Map<string, DbInventoryLocation>;
  workOrderMap: Map<string, DbWorkOrder>;
  profileMap: Map<string, DbProfile>;
}) {
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [itemId, setItemId] = useState("all");
  const [activity, setActivity] = useState("all");

  const locations = useMemo(
    () => [...locationMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [locationMap],
  );
  const items = useMemo(
    () => [...itemMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [itemMap],
  );
  const activities = useMemo(
    () => [...new Set(movements.map((movement) => movement.transaction_type).filter(Boolean))].sort(),
    [movements],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((movement) => {
      const item = itemMap.get(movement.inventory_item_id);
      const location = locationMap.get(movement.location_id ?? "");
      const linked = movement.work_order_id
        ? workOrderMap.get(movement.work_order_id)?.work_order_number ?? ""
        : movement.technician_id
          ? profileMap.get(movement.technician_id)?.full_name ?? ""
          : "";

      const searchOk =
        !q ||
        [
          item?.name,
          item?.sku,
          location?.name,
          movement.reference,
          movement.transaction_type,
          linked,
        ].some((value) => value?.toLowerCase().includes(q));
      const locationOk = locationId === "all" || movement.location_id === locationId;
      const itemOk = itemId === "all" || movement.inventory_item_id === itemId;
      const activityOk = activity === "all" || movement.transaction_type === activity;
      return searchOk && locationOk && itemOk && activityOk;
    });
  }, [movements, itemMap, locationMap, workOrderMap, profileMap, search, locationId, itemId, activity]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-border bg-card p-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 border border-border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full bg-transparent text-sm outline-none"
            placeholder="Search item, SKU, location, reference or work order"
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="h-10 border border-border bg-background px-3 text-xs font-bold"
          aria-label="Filter stock movements by location"
        >
          <option value="all">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        <select
          value={itemId}
          onChange={(event) => setItemId(event.target.value)}
          className="h-10 max-w-[260px] border border-border bg-background px-3 text-xs font-bold"
          aria-label="Filter stock movements by item"
        >
          <option value="all">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          className="h-10 border border-border bg-background px-3 text-xs font-bold"
          aria-label="Filter stock movements by activity"
        >
          <option value="all">All activity</option>
          {activities.map((type) => (
            <option key={type} value={type}>{capitalize(type)}</option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No stock movements match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Movement</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Work Order / Tech</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((movement) => {
                const item = itemMap.get(movement.inventory_item_id);
                const linked = movement.work_order_id
                  ? workOrderMap.get(movement.work_order_id)?.work_order_number ?? "Work order"
                  : movement.technician_id
                    ? profileMap.get(movement.technician_id)?.full_name ?? "Technician"
                    : "—";
                return (
                  <tr key={movement.id} className="border-t border-border">
                    <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(movement.created_at)}</td>
                    <td className="px-4 py-4 text-xs font-bold">{item?.name ?? "Unknown item"}</td>
                    <td className="px-4 py-4 text-xs font-black uppercase">{capitalize(movement.transaction_type)}</td>
                    <td className={`px-4 py-4 text-xs font-black ${movement.quantity < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                      {formatQty(movement.quantity, item?.unit)}
                    </td>
                    <td className="px-4 py-4 text-xs">{locationMap.get(movement.location_id ?? "")?.name ?? "—"}</td>
                    <td className="px-4 py-4 text-xs">{linked}</td>
                    <td className="px-4 py-4 text-xs">{movement.reference || "—"}</td>
                    <td className="px-4 py-4 text-xs">{movement.unit_cost == null ? "—" : money(movement.unit_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
