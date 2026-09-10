import type {
  AssetCondition,
  AssetSnapshot,
  AssetStatus,
  DbAsset,
  DbAssetHistory,
  DbAssetMaintenance,
  DbCustomer,
  DbInventoryLocation,
  DbProfile,
  DbSite,
  DbWorkOrder,
} from "./types";

export function capitalize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function assetStatusLabel(status: AssetStatus | string) {
  return status === "in_use" ? "In Service" : capitalize(status);
}

export function assetDisplayName(asset: DbAsset) {
  return asset.asset_name?.trim() || [asset.manufacturer, asset.model].filter(Boolean).join(" ") || asset.asset_type || "Unnamed Asset";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMoney(value: number | null | undefined, currency = "CAD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function assetStatusTone(status: AssetStatus | string) {
  switch (status) {
    case "available":
      return "border-slate-400/50 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "assigned":
      return "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "in_use":
      return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "repair":
      return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "lost":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "retired":
    case "disposed":
      return "border-border bg-muted/50 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function conditionTone(condition: AssetCondition | string) {
  switch (condition) {
    case "excellent":
    case "good":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "fair":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "poor":
    case "damaged":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function maintenanceStatusTone(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "in_progress":
      return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "planned":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "cancelled":
      return "border-border bg-muted/50 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function profileName(profile: DbProfile | null | undefined) {
  return profile?.full_name?.trim() || profile?.email?.trim() || "Unknown staff member";
}

export function siteLabel(site: DbSite | null | undefined) {
  if (!site) return "Unknown site";
  const place = [site.city, site.province_state].filter(Boolean).join(", ");
  return place ? `${site.name} · ${place}` : site.name;
}

export function maintenanceDue(
  asset: DbAsset,
  maintenance: DbAssetMaintenance[],
  now = new Date(),
) {
  const today = new Date(now);
  today.setHours(23, 59, 59, 999);

  const nextService = asset.next_service_date
    ? new Date(`${asset.next_service_date}T23:59:59`)
    : null;
  if (nextService && !Number.isNaN(nextService.getTime()) && nextService <= today) return true;

  return maintenance.some((item) => {
    if (!["planned", "in_progress"].includes(item.status) || !item.scheduled_date) return false;
    const due = new Date(`${item.scheduled_date}T23:59:59`);
    return !Number.isNaN(due.getTime()) && due <= today;
  });
}

export function maintenanceSummary(asset: DbAsset, maintenance: DbAssetMaintenance[], now = new Date()) {
  const open = maintenance
    .filter((item) => ["planned", "in_progress"].includes(item.status))
    .sort((a, b) => (a.scheduled_date ?? "9999-12-31").localeCompare(b.scheduled_date ?? "9999-12-31"));

  if (open[0]) {
    const prefix = maintenanceDue(asset, maintenance, now) ? "Due" : "Next";
    return `${prefix}: ${open[0].title}${open[0].scheduled_date ? ` · ${formatDate(open[0].scheduled_date)}` : ""}`;
  }
  if (asset.next_service_date) {
    return `${maintenanceDue(asset, maintenance, now) ? "Due" : "Next service"}: ${formatDate(asset.next_service_date)}`;
  }
  return "No maintenance scheduled";
}

export function buildAssetSnapshot(args: {
  asset: DbAsset;
  history: DbAssetHistory[];
  maintenance: DbAssetMaintenance[];
  profileMap: Map<string, DbProfile>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  workOrderMap: Map<string, DbWorkOrder>;
  locationMap: Map<string, DbInventoryLocation>;
  now?: Date;
}): AssetSnapshot {
  const { asset, history, maintenance, profileMap, customerMap, siteMap, workOrderMap, locationMap, now = new Date() } = args;

  let assignmentLabel = "Available";
  let assignmentSubtext = "Not assigned";

  if (asset.current_work_order_id) {
    const order = workOrderMap.get(asset.current_work_order_id);
    assignmentLabel = order ? `${order.work_order_number} · ${order.title}` : "Work order";
    assignmentSubtext = "Allocated to work order";
  } else if (asset.assigned_to) {
    assignmentLabel = profileName(profileMap.get(asset.assigned_to));
    assignmentSubtext = "Assigned technician / staff";
  } else if (asset.site_id) {
    const site = siteMap.get(asset.site_id);
    assignmentLabel = siteLabel(site);
    assignmentSubtext = asset.customer_id
      ? customerMap.get(asset.customer_id)?.name ?? "Customer site"
      : "Service site";
  } else if (asset.customer_id) {
    assignmentLabel = customerMap.get(asset.customer_id)?.name ?? "Customer";
    assignmentSubtext = "Assigned customer";
  } else if (asset.inventory_location_id) {
    assignmentLabel = locationMap.get(asset.inventory_location_id)?.name ?? "Storage location";
    assignmentSubtext = "Stored";
  }

  const related = new Set<string>();
  if (asset.current_work_order_id) related.add(asset.current_work_order_id);
  history.forEach((item) => {
    if (item.work_order_id) related.add(item.work_order_id);
    if (item.from_work_order_id) related.add(item.from_work_order_id);
    if (item.to_work_order_id) related.add(item.to_work_order_id);
  });
  maintenance.forEach((item) => {
    if (item.work_order_id) related.add(item.work_order_id);
  });

  return {
    asset,
    displayName: assetDisplayName(asset),
    assignmentLabel,
    assignmentSubtext,
    maintenanceDue: maintenanceDue(asset, maintenance, now),
    maintenanceLabel: maintenanceSummary(asset, maintenance, now),
    unavailable: ["repair", "lost"].includes(asset.status),
    relatedWorkOrderIds: [...related],
  };
}

export function warrantyLabel(asset: DbAsset, now = new Date()) {
  if (!asset.warranty_expires_on) return "No warranty date";
  const expiry = new Date(`${asset.warranty_expires_on}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return "No warranty date";
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
  if (days < 0) return `Expired ${formatDate(asset.warranty_expires_on)}`;
  if (days <= 60) return `Expires in ${days}d`;
  return `Until ${formatDate(asset.warranty_expires_on)}`;
}
