"use client";

import { InfoCard, DetailRow } from "./info-card";
import type {
  AssetSnapshot,
  DbAsset,
  DbCustomer,
  DbInventoryLocation,
  DbProfile,
  DbSite,
  DbWorkOrder,
} from "../types";
import {
  assetStatusLabel,
  assetStatusTone,
  capitalize,
  conditionTone,
  formatDate,
  formatMoney,
  profileName,
  siteLabel,
  warrantyLabel,
} from "../utils";

export function AssetOverview({
  asset,
  snapshot,
  profileMap,
  customerMap,
  siteMap,
  workOrderMap,
  locationMap,
  now,
}: {
  asset: DbAsset;
  snapshot: AssetSnapshot;
  profileMap: Map<string, DbProfile>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  workOrderMap: Map<string, DbWorkOrder>;
  locationMap: Map<string, DbInventoryLocation>;
  now: Date;
}) {
  const assignedProfile = asset.assigned_to ? profileMap.get(asset.assigned_to) : null;
  const customer = asset.customer_id ? customerMap.get(asset.customer_id) : null;
  const site = asset.site_id ? siteMap.get(asset.site_id) : null;
  const workOrder = asset.current_work_order_id ? workOrderMap.get(asset.current_work_order_id) : null;
  const location = asset.inventory_location_id ? locationMap.get(asset.inventory_location_id) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <InfoCard title="Asset identity">
        <DetailRow label="Asset tag" value={asset.asset_tag || "—"} />
        <DetailRow label="Name" value={snapshot.displayName} />
        <DetailRow label="Type" value={capitalize(asset.asset_type)} />
        <DetailRow label="Category" value={capitalize(asset.category)} />
        <DetailRow label="Manufacturer" value={asset.manufacturer || "—"} />
        <DetailRow label="Model" value={asset.model || "—"} />
        <DetailRow label="Serial number" value={asset.serial_number || "—"} />
        <DetailRow label="Ownership" value={capitalize(asset.ownership)} />
      </InfoCard>

      <InfoCard title="Current state">
        <DetailRow
          label="Status"
          value={<span className={`border px-2 py-1 text-[9px] font-black uppercase ${assetStatusTone(asset.status)}`}>{assetStatusLabel(asset.status)}</span>}
        />
        <DetailRow
          label="Condition"
          value={<span className={`border px-2 py-1 text-[9px] font-black uppercase ${conditionTone(asset.condition)}`}>{capitalize(asset.condition)}</span>}
        />
        <DetailRow label="Assignment" value={snapshot.assignmentLabel} />
        <DetailRow label="Assigned staff" value={assignedProfile ? profileName(assignedProfile) : "—"} />
        <DetailRow label="Customer" value={customer?.name ?? "—"} />
        <DetailRow label="Site" value={site ? siteLabel(site) : "—"} />
        <DetailRow label="Work order" value={workOrder ? `${workOrder.work_order_number} · ${workOrder.title}` : "—"} />
        <DetailRow label="Storage" value={location?.name ?? "—"} />
      </InfoCard>

      <InfoCard title="Purchase & warranty">
        <DetailRow label="Purchase date" value={formatDate(asset.purchase_date)} />
        <DetailRow label="Purchase cost" value={formatMoney(asset.purchase_cost)} />
        <DetailRow label="Replacement cost" value={formatMoney(asset.replacement_cost)} />
        <DetailRow label="Vendor" value={asset.purchase_vendor || "—"} />
        <DetailRow label="Purchase order" value={asset.purchase_order || "—"} />
        <DetailRow label="Warranty" value={warrantyLabel(asset, now)} />
        <DetailRow label="In service" value={formatDate(asset.in_service_date)} />
      </InfoCard>

      <InfoCard title="Lifecycle">
        <DetailRow label="Next service" value={formatDate(asset.next_service_date)} />
        <DetailRow label="Retired" value={formatDate(asset.retired_at)} />
        <DetailRow label="Disposed" value={formatDate(asset.disposed_at)} />
        <DetailRow label="Disposal method" value={asset.disposal_method || "—"} />
        <DetailRow label="Description" value={asset.description || "—"} />
        <DetailRow label="General notes" value={asset.notes || "—"} />
      </InfoCard>
    </div>
  );
}
