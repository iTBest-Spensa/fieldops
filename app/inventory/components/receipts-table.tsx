"use client";

import type { DbInventoryLocation, DbPurchaseOrder, DbReceipt } from "../types";
import { formatDateTime } from "../utils";
export function ReceiptsTable({ receipts, poMap, locationMap }: { receipts: DbReceipt[]; poMap: Map<string, DbPurchaseOrder>; locationMap: Map<string, DbInventoryLocation> }) {
  if (!receipts.length) return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No receipts have been posted.</div>;
  return <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[850px] text-left"><thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Purchase Order</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Packing Slip</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{receipts.map(r=><tr key={r.id} className="border-t border-border"><td className="px-4 py-4 text-sm font-black">{r.receipt_number}</td><td className="px-4 py-4 text-xs font-bold">{poMap.get(r.purchase_order_id)?.po_number ?? "—"}</td><td className="px-4 py-4 text-xs">{locationMap.get(r.location_id)?.name ?? "—"}</td><td className="px-4 py-4 text-xs">{formatDateTime(r.received_at)}</td><td className="px-4 py-4 text-xs">{r.packing_slip || "—"}</td><td className="px-4 py-4 text-xs font-black uppercase">{r.status}</td></tr>)}</tbody></table></div>;
}
