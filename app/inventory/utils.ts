import type { DbInventoryItem, DbInventoryTransaction, DbPurchaseOrder, InventoryItemSnapshot, StockBalance } from "./types";

export function money(value: number | null | undefined, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value ?? 0);
}

export function formatQty(value: number, unit?: string | null) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return unit ? `${text} ${unit}` : text;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function capitalize(value: string | null | undefined) {
  return (value ?? "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function purchaseOrderStatusTone(status: DbPurchaseOrder["status"]) {
  const tones: Record<DbPurchaseOrder["status"], string> = {
    draft: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    approved: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    ordered: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    partially_received: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    received: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    closed: "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    cancelled: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  };
  return tones[status];
}

export function stockStatusTone(status: InventoryItemSnapshot["stockStatus"]) {
  if (status === "out") return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300";
  if (status === "low") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export function buildStockBalances(transactions: DbInventoryTransaction[]) {
  const balances = new Map<string, StockBalance>();
  for (const tx of transactions) {
    const current = balances.get(tx.inventory_item_id) ?? { itemId: tx.inventory_item_id, total: 0, byLocation: new Map<string, number>() };
    current.total += Number(tx.quantity || 0);
    if (tx.location_id) current.byLocation.set(tx.location_id, (current.byLocation.get(tx.location_id) ?? 0) + Number(tx.quantity || 0));
    balances.set(tx.inventory_item_id, current);
  }
  return balances;
}

export function buildItemSnapshots(items: DbInventoryItem[], transactions: DbInventoryTransaction[]): InventoryItemSnapshot[] {
  const balances = buildStockBalances(transactions);
  const lastMovement = new Map<string, string>();
  for (const tx of transactions) {
    const existing = lastMovement.get(tx.inventory_item_id);
    if (!existing || new Date(tx.created_at) > new Date(existing)) lastMovement.set(tx.inventory_item_id, tx.created_at);
  }
  return items.map((item) => {
    const balance = balances.get(item.id);
    const onHand = item.track_stock ? balance?.total ?? 0 : 0;
    const stockStatus: InventoryItemSnapshot["stockStatus"] = !item.track_stock ? "ok" : onHand <= 0 ? "out" : onHand <= Number(item.reorder_level) ? "low" : "ok";
    return {
      item,
      onHand,
      stockStatus,
      value: onHand * Number(item.unit_cost || 0),
      locationCount: [...(balance?.byLocation.values() ?? [])].filter((qty) => Math.abs(qty) > 0.000001).length,
      lastMovementAt: lastMovement.get(item.id) ?? null,
    };
  });
}

export function numberOrNaN(value: string, { allowEmpty = false } = {}) {
  if (allowEmpty && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
