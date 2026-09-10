"use client";
import { Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { DbInventoryItemNote, DbInventoryItemSupplier, DbInventoryLocation, DbInventoryTransaction, DbPurchaseOrder, DbPurchaseOrderItem, DbSupplier, DbWorkOrder, InventoryItemSnapshot, InventoryItemTab } from "../../types";
import { capitalize, formatDateTime, formatQty, money, stockStatusTone } from "../../utils";
import { ModalShell } from "../modal-shell";

export function InventoryItemDetailModal({ snapshot, tab, transactions, locations, suppliers, itemSuppliers, purchaseOrders, poItems, workOrders, notes, canManage, canAddNote, onTabChange, onEdit, onMovement, onAddNote, onClose }: {
  snapshot: InventoryItemSnapshot;
  tab: InventoryItemTab;
  transactions: DbInventoryTransaction[];
  locations: DbInventoryLocation[];
  suppliers: DbSupplier[];
  itemSuppliers: DbInventoryItemSupplier[];
  purchaseOrders: DbPurchaseOrder[];
  poItems: DbPurchaseOrderItem[];
  workOrders: DbWorkOrder[];
  notes: DbInventoryItemNote[];
  canManage: boolean;
  canAddNote: boolean;
  onTabChange: (tab: InventoryItemTab) => void;
  onEdit: () => void;
  onMovement: () => void;
  onAddNote: () => void;
  onClose: () => void;
}) {
  const item=snapshot.item;
  const locationMap=new Map(locations.map(l=>[l.id,l]));
  const supplierMap=new Map(suppliers.map(s=>[s.id,s]));
  const workOrderMap=new Map(workOrders.map(w=>[w.id,w]));
  const poMap=new Map(purchaseOrders.map(p=>[p.id,p]));
  const byLocation=new Map<string,number>();
  for(const tx of transactions){ if(tx.location_id) byLocation.set(tx.location_id,(byLocation.get(tx.location_id)??0)+tx.quantity); }
  const supplierIds=new Set(itemSuppliers.map(x=>x.supplier_id));
  if(item.preferred_supplier_id) supplierIds.add(item.preferred_supplier_id);
  for(const line of poItems.filter(l=>l.inventory_item_id===item.id)){ const po=poMap.get(line.purchase_order_id); if(po) supplierIds.add(po.supplier_id); }
  const relatedSuppliers=[...supplierIds].map(id=>supplierMap.get(id)).filter((x):x is DbSupplier=>Boolean(x));
  const woIds=[...new Set(transactions.map(t=>t.work_order_id).filter((x):x is string=>Boolean(x)))];
  const relatedWOs=woIds.map(id=>workOrderMap.get(id)).filter((x):x is DbWorkOrder=>Boolean(x));
  const tabs: [InventoryItemTab,string][]=[["overview","Overview"],["movements","Stock Movement"],["work_orders","Work Orders"],["locations","Locations"],["suppliers","Suppliers"],["notes","Notes"]];
  return <ModalShell title={item.name} subtitle={`${item.sku||"No SKU"}${item.part_number?` · Part ${item.part_number}`:""}`} wide onClose={onClose} footer={<div className="flex flex-wrap justify-between gap-2"><div className="flex gap-2">{canManage&&<button onClick={onEdit} className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-black"><Pencil className="h-3.5 w-3.5"/> Edit Item</button>}{canManage&&<button onClick={onMovement} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="h-3.5 w-3.5"/> Stock Movement</button>}</div>{canAddNote&&<button onClick={onAddNote} className="h-9 border border-border px-3 text-xs font-black">Add Note</button>}</div>}>
    <div className="flex overflow-x-auto border border-border bg-card">{tabs.map(([key,label])=><button key={key} onClick={()=>onTabChange(key)} className={`whitespace-nowrap border-r border-border px-4 py-3 text-xs font-black last:border-r-0 ${tab===key?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted"}`}>{label}</button>)}</div>
    {tab==="overview"&&<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card label="On Hand" value={item.track_stock?formatQty(snapshot.onHand,item.unit):"Not tracked"}/><Card label="Stock Status" value={<span className={`border px-2 py-1 text-[9px] font-black uppercase ${stockStatusTone(snapshot.stockStatus)}`}>{snapshot.stockStatus}</span>}/><Card label="Unit Cost" value={money(item.unit_cost)}/><Card label="Stock Value" value={money(snapshot.value)}/><Card label="Category" value={capitalize(item.category)||"—"}/><Card label="Manufacturer" value={item.manufacturer||"—"}/><Card label="Unit Price" value={money(item.unit_price)}/><Card label="Reorder" value={`${formatQty(item.reorder_level,item.unit)} / order ${formatQty(item.reorder_quantity,item.unit)}`}/><div className="md:col-span-2 xl:col-span-4 border border-border bg-card p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">Description / Notes</div><div className="mt-2 whitespace-pre-wrap text-sm">{item.description||item.notes||"No description or notes."}</div></div></div>}
    {tab==="movements"&&<div className="mt-5 divide-y divide-border border border-border">{transactions.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No movements for this item.</div>:transactions.map(tx=><div key={tx.id} className="grid gap-3 p-4 md:grid-cols-[170px_150px_120px_1fr]"><div><div className="text-[10px] font-black uppercase text-muted-foreground">{formatDateTime(tx.created_at)}</div><div className="mt-1 text-xs font-black">{capitalize(tx.transaction_type)}</div></div><div><div className={`text-sm font-black ${tx.quantity<0?"text-rose-600":"text-emerald-600"}`}>{formatQty(tx.quantity,item.unit)}</div><div className="text-[10px] text-muted-foreground">{tx.unit_cost==null?"":money(tx.unit_cost)}</div></div><div className="text-xs font-bold">{locationMap.get(tx.location_id??"")?.name??"—"}</div><div className="text-xs"><div className="font-bold">{tx.reference||"No reference"}</div><div className="mt-1 text-muted-foreground">{tx.notes||""}</div></div></div>)}</div>}
    {tab==="work_orders"&&<div className="mt-5 divide-y divide-border border border-border">{relatedWOs.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No work-order stock activity for this item.</div>:relatedWOs.map(w=><div key={w.id} className="grid gap-3 p-4 md:grid-cols-[170px_1fr_150px]"><div className="text-sm font-black">{w.work_order_number}</div><div className="text-xs font-bold">{w.title}</div><div className="text-xs font-black uppercase">{capitalize(w.status)}</div></div>)}</div>}
    {tab==="locations"&&<div className="mt-5 divide-y divide-border border border-border">{locations.filter(l=>Math.abs(byLocation.get(l.id)??0)>0.000001).length===0?<div className="p-8 text-center text-sm text-muted-foreground">No stock currently held at a location.</div>:locations.filter(l=>Math.abs(byLocation.get(l.id)??0)>0.000001).map(l=><div key={l.id} className="flex items-center justify-between gap-4 p-4"><div><div className="text-sm font-black">{l.name}</div><div className="text-[10px] text-muted-foreground">{capitalize(l.location_type)}{l.code?` · ${l.code}`:""}</div></div><div className="text-sm font-black">{formatQty(byLocation.get(l.id)??0,item.unit)}</div></div>)}</div>}
    {tab==="suppliers"&&<div className="mt-5 divide-y divide-border border border-border">{relatedSuppliers.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No supplier relationship recorded for this item.</div>:relatedSuppliers.map(s=>{const rel=itemSuppliers.find(x=>x.supplier_id===s.id);return <div key={s.id} className="grid gap-3 p-4 md:grid-cols-[1fr_170px_170px_120px]"><div><div className="text-sm font-black">{s.name}</div><div className="text-[10px] text-muted-foreground">{s.supplier_number}</div></div><div className="text-xs">{rel?.supplier_sku||"No supplier SKU"}</div><div className="text-xs">{rel?.last_unit_cost==null?"No cost history":money(rel.last_unit_cost)}</div><div className="text-xs font-black">{item.preferred_supplier_id===s.id||rel?.preferred?"Preferred":""}</div></div>})}</div>}
    {tab==="notes"&&<div className="mt-5 divide-y divide-border border border-border">{notes.length===0?<div className="p-8 text-center text-sm text-muted-foreground">No internal notes.</div>:notes.map(n=><div key={n.id} className="p-4"><div className="text-xs whitespace-pre-wrap">{n.note}</div><div className="mt-2 text-[10px] text-muted-foreground">{formatDateTime(n.created_at)}</div></div>)}</div>}
  </ModalShell>;
}
function Card({label,value}:{label:string;value:ReactNode}){return <div className="border border-border bg-card p-4"><div className="text-[10px] font-black uppercase text-muted-foreground">{label}</div><div className="mt-2 text-sm font-black">{value}</div></div>}
