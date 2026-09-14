"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Bell, Boxes, Building2, ClipboardCheck, ClipboardList, Filter,
  LayoutDashboard, MapPin, Package, Plus, ReceiptText, RefreshCw, RotateCcw,
  Search, Settings, ShoppingCart, Truck, Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";
import { createClient } from "@/lib/supabase/client";
import type {
  DbCustomer, DbInventoryItem, DbInventoryItemNote, DbInventoryItemSupplier, DbInventoryLocation,
  DbInventoryReturn, DbInventoryReturnItem, DbInventoryTransaction, DbProfile,
  DbPurchaseOrder, DbPurchaseOrderItem, DbReceipt, DbReceiptItem, DbReconciliation,
  DbReconciliationLine, DbRole, DbSite, DbSupplier, DbWorkOrder, InventoryItemForm,
  InventoryItemTab, InventorySection, InventorySummaryView, LocationForm, MovementForm,
  PurchaseOrderForm, ReceivingForm, ReturnForm, SupplierForm,
  InventoryLocationItemHealth, InventoryLocationHealthSummary,
} from "./types";
import {
  emptyInventoryItemForm, emptyLocationForm, emptyMovementForm, emptyPurchaseOrderForm,
  emptyReceivingForm, emptyReturnForm, emptySupplierForm,
} from "./constants";
import { buildItemSnapshots, numberOrNaN } from "./utils";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { InventorySummaryCards } from "./components/inventory-summary-cards";
import { SectionTabs } from "./components/section-tabs";
import { StockTable } from "./components/stock-table";
import { PurchaseOrdersTable } from "./components/purchase-orders-table";
import { ReceiptsTable } from "./components/receipts-table";
import { ReturnsTable } from "./components/returns-table";
import { ReconciliationTable } from "./components/reconciliation-table";
import { SuppliersTable } from "./components/suppliers-table";
import { MovementsTable } from "./components/movements-table";
import { InventoryItemFormModal } from "./components/modals/inventory-item-form-modal";
import { InventoryItemDetailModal } from "./components/modals/inventory-item-detail-modal";
import { InventoryStockHealthItemsModal, InventoryStockHealthLocationsModal, suggestedOrderQuantity } from "./components/modals/inventory-stock-health-modal";
import { StockMovementModal } from "./components/modals/stock-movement-modal";
import { SupplierFormModal } from "./components/modals/supplier-form-modal";
import { LocationFormModal } from "./components/modals/location-form-modal";
import { PurchaseOrderModal } from "./components/modals/purchase-order-modal";
import { PurchaseOrderDetailModal } from "./components/modals/purchase-order-detail-modal";
import { ReceivePOModal } from "./components/modals/receive-po-modal";
import { ReturnModal } from "./components/modals/return-modal";
import { ReconciliationStartModal } from "./components/modals/reconciliation-start-modal";
import { ReconciliationDetailModal } from "./components/modals/reconciliation-detail-modal";
import { ItemNoteModal } from "./components/modals/item-note-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, active: true, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const itemSelect = "id,sku,part_number,barcode,name,description,category,manufacturer,unit,unit_cost,unit_price,reorder_level,reorder_quantity,taxable,track_stock,preferred_supplier_id,notes,active,created_at,updated_at";
const locationSelect = "id,name,code,location_type,site_id,technician_id,vehicle_identifier,notes,active,created_at,updated_at";
const transactionSelect = "id,inventory_item_id,location_id,work_order_id,technician_id,supplier_id,purchase_order_id,receipt_id,return_id,reconciliation_id,from_location_id,to_location_id,transfer_group_id,transaction_type,quantity,unit_cost,reference,notes,created_by,created_at";
const supplierSelect = "id,supplier_number,name,contact_name,email,phone,website,address1,address2,city,province_state,postal_code,country,payment_terms_days,notes,active,created_at,updated_at";
const poSelect = "id,po_number,supplier_id,destination_location_id,status,ordered_at,expected_date,shipping_amount,tax_amount,notes,created_by,approved_by,approved_at,created_at,updated_at";
const poItemSelect = "id,purchase_order_id,inventory_item_id,description,supplier_sku,quantity_ordered,quantity_received,unit_cost,created_at,updated_at";
const receiptSelect = "id,receipt_number,purchase_order_id,location_id,received_at,packing_slip,status,notes,created_by,created_at";
const receiptItemSelect = "id,receipt_id,purchase_order_item_id,inventory_item_id,quantity_received,quantity_damaged,unit_cost,created_at";
const returnSelect = "id,return_number,return_type,supplier_id,purchase_order_id,work_order_id,technician_id,customer_id,location_id,status,returned_at,reason,notes,created_by,created_at";
const returnItemSelect = "id,return_id,inventory_item_id,quantity,condition,unit_cost,created_at";
const reconciliationSelect = "id,reconciliation_number,location_id,status,started_at,posted_at,notes,created_by,posted_by,created_at,updated_at";
const reconciliationLineSelect = "id,reconciliation_id,inventory_item_id,system_quantity,counted_quantity,unit_cost,reason,created_at,updated_at";
const itemSupplierSelect = "id,inventory_item_id,supplier_id,supplier_sku,last_unit_cost,lead_time_days,preferred,active,created_at,updated_at";
const noteSelect = "id,inventory_item_id,note,created_by,created_at";

function localDateTimeInputNow() {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InventoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<DbInventoryItem[]>([]);
  const [locations, setLocations] = useState<DbInventoryLocation[]>([]);
  const [transactions, setTransactions] = useState<DbInventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [itemSuppliers, setItemSuppliers] = useState<DbInventoryItemSupplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<DbPurchaseOrder[]>([]);
  const [poItems, setPOItems] = useState<DbPurchaseOrderItem[]>([]);
  const [receipts, setReceipts] = useState<DbReceipt[]>([]);
  const [receiptItems, setReceiptItems] = useState<DbReceiptItem[]>([]);
  const [returns, setReturns] = useState<DbInventoryReturn[]>([]);
  const [returnItems, setReturnItems] = useState<DbInventoryReturnItem[]>([]);
  const [reconciliations, setReconciliations] = useState<DbReconciliation[]>([]);
  const [reconciliationLines, setReconciliationLines] = useState<DbReconciliationLine[]>([]);
  const [itemNotes, setItemNotes] = useState<DbInventoryItemNote[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);

  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<InventorySection>("stock");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [stockLocationFilter, setStockLocationFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");
  const [summaryView, setSummaryView] = useState<InventorySummaryView | null>(null);
  const [summaryLocationId, setSummaryLocationId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemTab, setItemTab] = useState<InventoryItemTab>("overview");
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<string | null>(null);

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<"create"|"edit">("create");
  const [itemForm, setItemForm] = useState<InventoryItemForm>(emptyInventoryItemForm);
  const [itemFormError, setItemFormError] = useState<string|null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [movementError, setMovementError] = useState<string|null>(null);
  const [savingMovement, setSavingMovement] = useState(false);

  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierMode, setSupplierMode] = useState<"create"|"edit">("create");
  const [editingSupplierId, setEditingSupplierId] = useState<string|null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [supplierError, setSupplierError] = useState<string|null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocationForm);
  const [locationError, setLocationError] = useState<string|null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const [poOpen, setPOOpen] = useState(false);
  const [poForm, setPOForm] = useState<PurchaseOrderForm>(emptyPurchaseOrderForm);
  const [poError, setPOError] = useState<string|null>(null);
  const [savingPO, setSavingPO] = useState(false);
  const [savingPOStatus, setSavingPOStatus] = useState(false);

  const [receivingOpen, setReceivingOpen] = useState(false);
  const [receivingForm, setReceivingForm] = useState<ReceivingForm>(emptyReceivingForm);
  const [receivingError, setReceivingError] = useState<string|null>(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnForm, setReturnForm] = useState<ReturnForm>(emptyReturnForm);
  const [returnError, setReturnError] = useState<string|null>(null);
  const [savingReturn, setSavingReturn] = useState(false);

  const [reconciliationStartOpen, setReconciliationStartOpen] = useState(false);
  const [reconciliationLocationId, setReconciliationLocationId] = useState("");
  const [reconciliationNotes, setReconciliationNotes] = useState("");
  const [reconciliationError, setReconciliationError] = useState<string|null>(null);
  const [savingReconciliation, setSavingReconciliation] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string|null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNoticeState|null>(null);

  const itemMap = useMemo(() => new Map(items.map(x=>[x.id,x])), [items]);
  const locationMap = useMemo(() => new Map(locations.map(x=>[x.id,x])), [locations]);
  const supplierMap = useMemo(() => new Map(suppliers.map(x=>[x.id,x])), [suppliers]);
  const poMap = useMemo(() => new Map(purchaseOrders.map(x=>[x.id,x])), [purchaseOrders]);
  const profileMap = useMemo(() => new Map(profiles.map(x=>[x.id,x])), [profiles]);
  const workOrderMap = useMemo(() => new Map(workOrders.map(x=>[x.id,x])), [workOrders]);
  const customerMap = useMemo(() => new Map(customers.map(x=>[x.id,x])), [customers]);

  const myRoles = useMemo(() => roles.filter(r=>r.user_id===currentUserId).map(r=>r.role), [roles,currentUserId]);
  const canManage = myRoles.some(r=>["admin","manager","inventory"].includes(r));
  const canFieldMove = myRoles.some(r=>["admin","manager","inventory","dispatcher","technician"].includes(r));
  const canAddNote = canFieldMove;

  const showNotice = useCallback((type: ActionNoticeState["type"], message: string) => setActionNotice({type,message}), []);
  useEffect(()=>{ if(!actionNotice)return; const timer=window.setTimeout(()=>setActionNotice(null),7000); return()=>window.clearTimeout(timer); },[actionNotice]);

  const loadInventory = useCallback(async () => {
    setError(null); setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if(authError || !authData.user){ setAuthRequired(true); setLoading(false); return; }
    setAuthRequired(false); setCurrentUserId(authData.user.id);
    const results = await Promise.all([
      supabase.from("inventory_items").select(itemSelect).order("name"),
      supabase.from("inventory_locations").select(locationSelect).order("name"),
      supabase.from("inventory_transactions").select(transactionSelect).order("created_at",{ascending:false}),
      supabase.from("inventory_suppliers").select(supplierSelect).order("name"),
      supabase.from("inventory_item_suppliers").select(itemSupplierSelect),
      supabase.from("inventory_purchase_orders").select(poSelect).order("created_at",{ascending:false}),
      supabase.from("inventory_purchase_order_items").select(poItemSelect),
      supabase.from("inventory_receipts").select(receiptSelect).order("received_at",{ascending:false}),
      supabase.from("inventory_receipt_items").select(receiptItemSelect),
      supabase.from("inventory_returns").select(returnSelect).order("returned_at",{ascending:false}),
      supabase.from("inventory_return_items").select(returnItemSelect),
      supabase.from("inventory_reconciliations").select(reconciliationSelect).order("created_at",{ascending:false}),
      supabase.from("inventory_reconciliation_lines").select(reconciliationLineSelect),
      supabase.from("inventory_item_notes").select(noteSelect).order("created_at",{ascending:false}),
      supabase.from("profiles").select("id,full_name,email,active").order("full_name",{ascending:true,nullsFirst:false}),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("sites").select("id,customer_id,name,city,province_state,active").order("name"),
      supabase.from("work_orders").select("id,work_order_number,title,status,customer_id,site_id").order("requested_at",{ascending:false}),
      supabase.from("customers").select("id,name,status").order("name"),
    ]);
    const firstError = results.find(r=>r.error)?.error;
    if(firstError){ setError(firstError.message); setLoading(false); return; }
    setItems((results[0].data??[]) as DbInventoryItem[]);
    setLocations((results[1].data??[]) as DbInventoryLocation[]);
    setTransactions((results[2].data??[]) as DbInventoryTransaction[]);
    setSuppliers((results[3].data??[]) as DbSupplier[]);
    setItemSuppliers((results[4].data??[]) as DbInventoryItemSupplier[]);
    setPurchaseOrders((results[5].data??[]) as DbPurchaseOrder[]);
    setPOItems((results[6].data??[]) as DbPurchaseOrderItem[]);
    setReceipts((results[7].data??[]) as DbReceipt[]);
    setReceiptItems((results[8].data??[]) as DbReceiptItem[]);
    setReturns((results[9].data??[]) as DbInventoryReturn[]);
    setReturnItems((results[10].data??[]) as DbInventoryReturnItem[]);
    setReconciliations((results[11].data??[]) as DbReconciliation[]);
    setReconciliationLines((results[12].data??[]) as DbReconciliationLine[]);
    setItemNotes((results[13].data??[]) as DbInventoryItemNote[]);
    setProfiles((results[14].data??[]) as DbProfile[]);
    setRoles((results[15].data??[]) as DbRole[]);
    setSites((results[16].data??[]) as DbSite[]);
    setWorkOrders((results[17].data??[]) as DbWorkOrder[]);
    setCustomers((results[18].data??[]) as DbCustomer[]);
    setLoading(false);
  },[supabase]);

  useEffect(()=>{ void loadInventory(); },[loadInventory]);
  useEffect(()=>{
    if(authRequired) return;
    const tables=["inventory_items","inventory_locations","inventory_transactions","inventory_suppliers","inventory_item_suppliers","inventory_purchase_orders","inventory_purchase_order_items","inventory_receipts","inventory_receipt_items","inventory_returns","inventory_return_items","inventory_reconciliations","inventory_reconciliation_lines","inventory_item_notes"];
    let channel=supabase.channel("fieldops-inventory-live");
    for(const table of tables){ channel=channel.on("postgres_changes",{event:"*",schema:"public",table},()=>void loadInventory()); }
    channel.subscribe();
    return()=>{ void supabase.removeChannel(channel); };
  },[supabase,loadInventory,authRequired]);

  const snapshots = useMemo(()=>buildItemSnapshots(items,transactions),[items,transactions]);
  const stockLocationMap = useMemo(()=>new Map(locations.map(location=>[location.id,location] as const)),[locations]);
  const activeStockLocations = useMemo(()=>locations.filter(location=>location.active),[locations]);
  const activeTrackedItems = useMemo(()=>items.filter(item=>item.active&&item.track_stock),[items]);

  const locationItemHealth = useMemo<InventoryLocationItemHealth[]>(()=>{
    const balances = new Map<string,number>();
    for(const tx of transactions){
      if(!tx.location_id) continue;
      const key=`${tx.location_id}:${tx.inventory_item_id}`;
      balances.set(key,(balances.get(key)??0)+Number(tx.quantity||0));
    }
    return activeStockLocations.flatMap(location=>activeTrackedItems.map(item=>{
      const onHand=balances.get(`${location.id}:${item.id}`)??0;
      const stockStatus:InventoryLocationItemHealth["stockStatus"]=onHand<=0?"out":onHand<=Number(item.reorder_level||0)?"low":"ok";
      return {location,item,onHand,stockStatus,value:onHand*Number(item.unit_cost||0)};
    }));
  },[activeStockLocations,activeTrackedItems,transactions]);

  // Replenishment coverage is location-specific. Draft coverage becomes
  // "Waiting for approval"; approved/ordered/partially received coverage is
  // considered committed and is removed from the reorder-action list.
  const replenishmentHealth = useMemo<InventoryLocationItemHealth[]>(()=>locationItemHealth.map(row=>{
    const openPOs=purchaseOrders.filter(po=>
      po.destination_location_id===row.location.id &&
      ["draft","approved","ordered","partially_received"].includes(po.status)
    );

    let draftCoverage=0;
    let committedCoverage=0;
    const draftNumbers:string[]=[];
    const committedNumbers:string[]=[];

    for(const po of openPOs){
      const remaining=poItems
        .filter(line=>line.purchase_order_id===po.id&&line.inventory_item_id===row.item.id)
        .reduce((sum,line)=>sum+Math.max(0,Number(line.quantity_ordered)-Number(line.quantity_received)),0);

      if(remaining<=0) continue;

      if(po.status==="draft"){
        draftCoverage+=remaining;
        draftNumbers.push(po.po_number);
      }else{
        committedCoverage+=remaining;
        committedNumbers.push(po.po_number);
      }
    }

    const target=suggestedOrderQuantity(row);
    const totalCoverage=draftCoverage+committedCoverage;
    const replenishmentStatus:InventoryLocationItemHealth["replenishmentStatus"]=
      committedCoverage>=target
        ?"on_order"
        : totalCoverage>=target&&draftCoverage>0
        ?"waiting_approval"
        :"needs_po";

    return {
      ...row,
      replenishmentStatus,
      replenishmentCoveredQuantity:totalCoverage,
      replenishmentTargetQuantity:target,
      replenishmentPONumbers:
        replenishmentStatus==="on_order"
          ?committedNumbers
          :replenishmentStatus==="waiting_approval"
          ?draftNumbers
          :[...committedNumbers,...draftNumbers],
    };
  }),[locationItemHealth,purchaseOrders,poItems]);

  const actionLocationHealth = useMemo(
    ()=>replenishmentHealth.filter(row=>row.replenishmentStatus!=="on_order"),
    [replenishmentHealth]
  );

  const locationHealthSummaries = useMemo<InventoryLocationHealthSummary[]>(()=>activeStockLocations.map(location=>{
    const physicalRows=locationItemHealth.filter(row=>row.location.id===location.id);
    const actionRows=actionLocationHealth.filter(row=>row.location.id===location.id);
    return {
      location,
      totalItems: physicalRows.length,
      lowStock: actionRows.filter(row=>row.stockStatus==="low").length,
      outOfStock: actionRows.filter(row=>row.stockStatus==="out").length,
      healthy: physicalRows.filter(row=>row.stockStatus==="ok").length,
      inventoryValue: physicalRows.reduce((sum,row)=>sum+row.value,0),
    };
  }),[activeStockLocations,locationItemHealth,actionLocationHealth]);

  const scopedLocationHealth = useMemo(()=>stockLocationFilter==="all"?locationItemHealth:locationItemHealth.filter(row=>row.location.id===stockLocationFilter),[locationItemHealth,stockLocationFilter]);
  const scopedActionLocationHealth = useMemo(()=>stockLocationFilter==="all"?actionLocationHealth:actionLocationHealth.filter(row=>row.location.id===stockLocationFilter),[actionLocationHealth,stockLocationFilter]);
  const scopedLocationSummaries = useMemo(()=>stockLocationFilter==="all"?locationHealthSummaries:locationHealthSummaries.filter(row=>row.location.id===stockLocationFilter),[locationHealthSummaries,stockLocationFilter]);

  const scopedSnapshots = useMemo(()=>{
    if(stockLocationFilter==="all") return snapshots;
    return snapshots.map(snapshot=>{
      const health=locationItemHealth.find(row=>row.location.id===stockLocationFilter&&row.item.id===snapshot.item.id);
      const locationTransactions=transactions.filter(tx=>tx.inventory_item_id===snapshot.item.id&&tx.location_id===stockLocationFilter);
      const onHand=snapshot.item.track_stock?(health?.onHand??0):0;
      const stockStatus = !snapshot.item.track_stock ? "ok" as const : health?.stockStatus??"out" as const;
      const lastMovementAt=locationTransactions.reduce<string|null>((latest,tx)=>!latest||new Date(tx.created_at)>new Date(latest)?tx.created_at:latest,null);
      return {...snapshot,onHand,stockStatus,value:onHand*Number(snapshot.item.unit_cost||0),locationCount:Math.abs(onHand)>0.000001?1:0,lastMovementAt};
    });
  },[snapshots,transactions,stockLocationFilter,locationItemHealth]);

  const selectedStockLocation = stockLocationFilter==="all"?null:stockLocationMap.get(stockLocationFilter)??null;
  const filteredSnapshots = useMemo(()=>{
    const q=search.trim().toLowerCase();

    // When All Locations + Low/Out is selected, the filter must operate on
    // item-location stock positions rather than global item totals. An item
    // can be healthy overall while still being low/out at a specific location.
    if(stockLocationFilter==="all"&&(stockFilter==="low"||stockFilter==="out")){
      return locationItemHealth
        .filter(row=>row.stockStatus===stockFilter)
        .filter(row=>{
          const i=row.item;
          const searchOk=!q||[i.name,i.sku,i.part_number,i.barcode,i.category,i.manufacturer,row.location.name,row.location.code].some(v=>v?.toLowerCase().includes(q));
          const activeOk=activeFilter==="all"||(activeFilter==="active"?i.active:!i.active);
          return searchOk&&activeOk;
        })
        .map(row=>{
          const locationTransactions=transactions.filter(tx=>tx.inventory_item_id===row.item.id&&tx.location_id===row.location.id);
          const lastMovementAt=locationTransactions.reduce<string|null>((latest,tx)=>!latest||new Date(tx.created_at)>new Date(latest)?tx.created_at:latest,null);
          return {
            item:row.item,
            onHand:row.onHand,
            stockStatus:row.stockStatus,
            value:row.value,
            locationCount:1,
            lastMovementAt,
            scopeLocationId:row.location.id,
            scopeLocationName:row.location.name,
          };
        });
    }

    return scopedSnapshots.filter(snapshot=>{
      const i=snapshot.item;
      const searchOk=!q||[i.name,i.sku,i.part_number,i.barcode,i.category,i.manufacturer].some(v=>v?.toLowerCase().includes(q));
      const activeOk=activeFilter==="all"||(activeFilter==="active"?i.active:!i.active);
      const stockOk=stockFilter==="all"||snapshot.stockStatus===stockFilter;
      return searchOk&&activeOk&&stockOk;
    });
  },[scopedSnapshots,search,activeFilter,stockFilter,stockLocationFilter,locationItemHealth,transactions]);
  const totalStockPositions=scopedLocationHealth.length;
  const lowStock=scopedActionLocationHealth.filter(row=>row.stockStatus==="low").length;
  const outOfStock=scopedActionLocationHealth.filter(row=>row.stockStatus==="out").length;
  const inventoryValue=scopedLocationHealth.reduce((sum,row)=>sum+row.value,0);
  const selectedSummaryLocation = summaryLocationId?stockLocationMap.get(summaryLocationId)??null:null;
  const selectedSummaryHealthRows = useMemo(()=>{
    if(!summaryLocationId||!summaryView)return [];
    const rows=replenishmentHealth.filter(row=>row.location.id===summaryLocationId);
    if(summaryView==="low")return rows.filter(row=>row.stockStatus==="low"&&row.replenishmentStatus!=="on_order");
    if(summaryView==="out")return rows.filter(row=>row.stockStatus==="out"&&row.replenishmentStatus!=="on_order");
    return rows;
  },[replenishmentHealth,summaryLocationId,summaryView]);

  const selectedSnapshot=selectedItemId?snapshots.find(s=>s.item.id===selectedItemId)??null:null;
  const selectedPO=selectedPOId?purchaseOrders.find(p=>p.id===selectedPOId)??null:null;
  const selectedReconciliation=selectedReconciliationId?reconciliations.find(r=>r.id===selectedReconciliationId)??null:null;

  function openItem(id:string){ setSelectedItemId(id); setItemTab("overview"); }
  function openNewItem(){ setItemFormMode("create"); setItemForm(emptyInventoryItemForm); setItemFormError(null); setItemFormOpen(true); }
  function openEditItem(){ if(!selectedSnapshot)return; const i=selectedSnapshot.item; setItemFormMode("edit"); setItemForm({sku:i.sku??"",partNumber:i.part_number??"",barcode:i.barcode??"",name:i.name,description:i.description??"",category:i.category??"",manufacturer:i.manufacturer??"",unit:i.unit,unitCost:String(i.unit_cost),unitPrice:String(i.unit_price),reorderLevel:String(i.reorder_level),reorderQuantity:String(i.reorder_quantity),taxable:i.taxable,trackStock:i.track_stock,preferredSupplierId:i.preferred_supplier_id??"",notes:i.notes??"",active:i.active}); setItemFormError(null); setItemFormOpen(true); }

  async function saveItem(){ const name=itemForm.name.trim(); const unitCost=numberOrNaN(itemForm.unitCost); const unitPrice=numberOrNaN(itemForm.unitPrice); const reorderLevel=numberOrNaN(itemForm.reorderLevel); const reorderQuantity=numberOrNaN(itemForm.reorderQuantity); if(!name){setItemFormError("Item name is required.");return;} if([unitCost,unitPrice,reorderLevel,reorderQuantity].some(v=>typeof v!=="number"||Number.isNaN(v)||v<0)){setItemFormError("Costs and reorder quantities must be valid non-negative numbers.");return;} setSavingItem(true); setItemFormError(null); showNotice("info",itemFormMode==="create"?"Creating inventory item…":"Saving inventory item…"); const args={p_sku:itemForm.sku||null,p_part_number:itemForm.partNumber||null,p_barcode:itemForm.barcode||null,p_name:name,p_description:itemForm.description||null,p_category:itemForm.category||null,p_manufacturer:itemForm.manufacturer||null,p_unit:itemForm.unit||"each",p_unit_cost:unitCost,p_unit_price:unitPrice,p_reorder_level:reorderLevel,p_reorder_quantity:reorderQuantity,p_taxable:itemForm.taxable,p_track_stock:itemForm.trackStock,p_preferred_supplier_id:itemForm.preferredSupplierId||null,p_notes:itemForm.notes||null,p_active:itemForm.active}; const {data,error:saveError}=itemFormMode==="create"?await supabase.rpc("fieldops_create_inventory_item",args):await supabase.rpc("fieldops_update_inventory_item",{p_inventory_item_id:selectedSnapshot?.item.id,...args}); if(saveError){setItemFormError(saveError.message);showNotice("error",saveError.message);setSavingItem(false);return;} await loadInventory(); if(itemFormMode==="create"){const result=data as {inventory_item_id?:string}|null;if(result?.inventory_item_id)setSelectedItemId(result.inventory_item_id);} setItemFormOpen(false); setSavingItem(false); showNotice("success",itemFormMode==="create"?"Inventory item created.":"Inventory item updated."); }

  function openMovement(itemId?:string){ setMovementForm({...emptyMovementForm,itemId:itemId??"",locationId:locations.find(l=>l.active)?.id??""}); setMovementError(null); setMovementOpen(true); }
  async function saveMovement(){ const qty=numberOrNaN(movementForm.quantity); const cost=numberOrNaN(movementForm.unitCost,{allowEmpty:true}); if(!movementForm.itemId||!movementForm.locationId){setMovementError("Choose an item and location.");return;} if(typeof qty!=="number"||Number.isNaN(qty)||qty===0){setMovementError("Enter a valid non-zero quantity.");return;} if(movementForm.movementType!=="adjustment"&&qty<0){setMovementError("Quantity must be greater than zero for this movement.");return;} if(movementForm.movementType==="transfer"&&!movementForm.toLocationId){setMovementError("Choose the destination location.");return;} if(movementForm.movementType==="consume"&&!movementForm.workOrderId){setMovementError("Choose the work order where the material was consumed.");return;} if(typeof cost==="number"&&cost<0){setMovementError("Unit cost cannot be negative.");return;} setSavingMovement(true); const {error:saveError}=await supabase.rpc("fieldops_post_inventory_movement",{p_movement_type:movementForm.movementType,p_inventory_item_id:movementForm.itemId,p_location_id:movementForm.locationId,p_to_location_id:movementForm.toLocationId||null,p_work_order_id:movementForm.workOrderId||null,p_technician_id:movementForm.technicianId||null,p_quantity:qty,p_unit_cost:cost,p_reference:movementForm.reference||null,p_notes:movementForm.notes||null}); if(saveError){setMovementError(saveError.message);showNotice("error",saveError.message);setSavingMovement(false);return;} await loadInventory(); setMovementOpen(false); setSavingMovement(false); showNotice("success","Stock movement posted."); }

  function openNewSupplier(){ setSupplierMode("create");setEditingSupplierId(null);setSupplierForm(emptySupplierForm);setSupplierError(null);setSupplierOpen(true); }
  function openEditSupplier(s:DbSupplier){setSupplierMode("edit");setEditingSupplierId(s.id);setSupplierForm({name:s.name,contactName:s.contact_name??"",email:s.email??"",phone:s.phone??"",website:s.website??"",address1:s.address1??"",address2:s.address2??"",city:s.city??"",provinceState:s.province_state??"",postalCode:s.postal_code??"",country:s.country??"Canada",paymentTermsDays:String(s.payment_terms_days),notes:s.notes??"",active:s.active});setSupplierError(null);setSupplierOpen(true);}
  async function saveSupplier(){ const terms=Number(supplierForm.paymentTermsDays); if(!supplierForm.name.trim()){setSupplierError("Supplier name is required.");return;} if(!Number.isInteger(terms)||terms<0){setSupplierError("Payment terms must be zero or more whole days.");return;} setSavingSupplier(true); const payload={name:supplierForm.name.trim(),contact_name:supplierForm.contactName||null,email:supplierForm.email||null,phone:supplierForm.phone||null,website:supplierForm.website||null,address1:supplierForm.address1||null,address2:supplierForm.address2||null,city:supplierForm.city||null,province_state:supplierForm.provinceState||null,postal_code:supplierForm.postalCode||null,country:supplierForm.country||"Canada",payment_terms_days:terms,notes:supplierForm.notes||null,active:supplierForm.active}; const query=supplierMode==="create"?supabase.from("inventory_suppliers").insert(payload):supabase.from("inventory_suppliers").update(payload).eq("id",editingSupplierId??""); const {error:saveError}=await query; if(saveError){setSupplierError(saveError.message);showNotice("error",saveError.message);setSavingSupplier(false);return;} await loadInventory();setSupplierOpen(false);setSavingSupplier(false);showNotice("success",supplierMode==="create"?"Supplier created.":"Supplier updated.");}

  function openNewLocation(){setLocationForm(emptyLocationForm);setLocationError(null);setLocationOpen(true);}
  async function saveLocation(){if(!locationForm.name.trim()){setLocationError("Location name is required.");return;}setSavingLocation(true);const {error:saveError}=await supabase.from("inventory_locations").insert({name:locationForm.name.trim(),code:locationForm.code||null,location_type:locationForm.locationType,site_id:locationForm.siteId||null,technician_id:locationForm.technicianId||null,vehicle_identifier:locationForm.vehicleIdentifier||null,notes:locationForm.notes||null,active:locationForm.active});if(saveError){setLocationError(saveError.message);showNotice("error",saveError.message);setSavingLocation(false);return;}await loadInventory();setLocationOpen(false);setSavingLocation(false);showNotice("success","Inventory location created.");}

  function openNewPO(){setPOForm(emptyPurchaseOrderForm);setPOError(null);setPOOpen(true);}
  function openSummary(view:InventorySummaryView){setSummaryLocationId(null);setSummaryView(view);}
  function openPOForHealthRows(rows:InventoryLocationItemHealth[]){
    const actionable=rows.filter(row=>row.replenishmentStatus!=="waiting_approval"&&row.replenishmentStatus!=="on_order");
    if(!actionable.length){
      showNotice("info","These items are already covered by an open purchase order.");
      return;
    }

    const locationIds=[...new Set(actionable.map(row=>row.location.id))];
    if(locationIds.length!==1){
      showNotice("error","Create replenishment POs one stock location at a time.");
      return;
    }

    const uniqueRows=[...new Map(actionable.map(row=>[row.item.id,row] as const)).values()];
    const supplierIds=uniqueRows.map(row=>{
      const relation=itemSuppliers.find(link=>link.inventory_item_id===row.item.id&&link.active&&link.preferred);
      return row.item.preferred_supplier_id||relation?.supplier_id||"";
    });
    const nonEmpty=[...new Set(supplierIds.filter(Boolean))];
    const supplierId=nonEmpty.length===1&&supplierIds.every(id=>id===nonEmpty[0])?nonEmpty[0]:"";
    const lines=uniqueRows.map(row=>{
      const preferredRelation=itemSuppliers.find(link=>link.inventory_item_id===row.item.id&&link.active&&(supplierId?link.supplier_id===supplierId:link.preferred));
      const target=row.replenishmentTargetQuantity??suggestedOrderQuantity(row);
      const covered=row.replenishmentCoveredQuantity??0;
      return {
        itemId:row.item.id,
        quantity:String(Math.max(1,target-covered)),
        unitCost:String(preferredRelation?.last_unit_cost??row.item.unit_cost??0),
        supplierSku:preferredRelation?.supplier_sku??"",
      };
    });
    const location=actionable[0].location;
    setPOForm({
      ...emptyPurchaseOrderForm,
      destinationLocationId:location.id,
      supplierId,
      notes:`Stock replenishment for ${location.name}.`,
      lines,
    });
    setPOError(null);
    setSummaryLocationId(null);
    setSummaryView(null);
    setPOOpen(true);
  }

  async function savePO(){
    const shipping=numberOrNaN(poForm.shippingAmount);
    const tax=numberOrNaN(poForm.taxAmount);
    if(!poForm.destinationLocationId){setPOError("Choose the stock location this purchase order will replenish.");return;}
    if(!poForm.supplierId){setPOError("Choose a supplier.");return;}
    if(typeof shipping!=="number"||typeof tax!=="number"||Number.isNaN(shipping)||Number.isNaN(tax)||shipping<0||tax<0){setPOError("Shipping and tax must be valid non-negative numbers.");return;}
    const lines=poForm.lines.filter(l=>l.itemId).map(l=>({inventory_item_id:l.itemId,quantity:Number(l.quantity),unit_cost:l.unitCost,supplier_sku:l.supplierSku}));
    if(!lines.length||lines.some(l=>!Number.isFinite(l.quantity)||l.quantity<=0)){setPOError("Add at least one valid PO line with quantity greater than zero.");return;}

    setSavingPO(true);
    const {data,error:saveError}=await supabase.rpc("fieldops_create_replenishment_purchase_order",{
      p_destination_location_id:poForm.destinationLocationId,
      p_supplier_id:poForm.supplierId,
      p_expected_date:poForm.expectedDate||null,
      p_shipping_amount:shipping,
      p_tax_amount:tax,
      p_notes:poForm.notes||null,
      p_lines:lines,
    });
    if(saveError){
      setPOError(saveError.message);
      showNotice("error",saveError.message);
      setSavingPO(false);
      return;
    }

    await loadInventory();
    const result=data as {purchase_order_id?:string}|null;
    if(result?.purchase_order_id)setSelectedPOId(result.purchase_order_id);
    setPOOpen(false);
    setSavingPO(false);
    showNotice("success","Purchase order created and linked to its replenishment location.");
  }

  async function setPOStatus(status:"approved"|"ordered"|"closed"|"cancelled"){
    if(!selectedPO)return;
    setSavingPOStatus(true);
    const {error:saveError}=await supabase.rpc("fieldops_set_purchase_order_status",{p_purchase_order_id:selectedPO.id,p_status:status});
    if(saveError){showNotice("error",saveError.message);setSavingPOStatus(false);return;}
    await loadInventory();
    setSavingPOStatus(false);
    showNotice("success",`Purchase order marked ${status.replace(/_/g," ")}.`);
  }

  function openReceiving(){
    setReceivingForm({...emptyReceivingForm,locationId:"",receivedAt:localDateTimeInputNow()});
    setReceivingError(null);
    setReceivingOpen(true);
  }

  function selectReceivingPO(id:string){
    if(!id){
      setReceivingForm(current=>({...current,purchaseOrderId:"",lines:[]}));
      return;
    }

    const lines=poItems
      .filter(l=>l.purchase_order_id===id&&l.quantity_received<l.quantity_ordered)
      .map(l=>({
        purchaseOrderItemId:l.id,
        inventoryItemId:l.inventory_item_id,
        quantityReceived:String(l.quantity_ordered-l.quantity_received),
        quantityDamaged:"0",
        unitCost:String(l.unit_cost),
      }));

    setReceivingForm(current=>({...current,purchaseOrderId:id,lines}));
  }

  async function saveReceipt(){
    if(!receivingForm.purchaseOrderId||!receivingForm.locationId){
      setReceivingError("Choose a receiving location and purchase order.");
      return;
    }

    const selectedReceivingPO=purchaseOrders.find(po=>po.id===receivingForm.purchaseOrderId);
    if(selectedReceivingPO?.destination_location_id&&selectedReceivingPO.destination_location_id!==receivingForm.locationId){
      setReceivingError("This purchase order belongs to a different replenishment location.");
      return;
    }

    const lines=receivingForm.lines
      .map(l=>({
        purchase_order_item_id:l.purchaseOrderItemId,
        inventory_item_id:l.inventoryItemId,
        quantity_received:Number(l.quantityReceived),
        quantity_damaged:Number(l.quantityDamaged),
        unit_cost:l.unitCost,
      }))
      .filter(l=>Number.isFinite(l.quantity_received)&&l.quantity_received>0);

    if(!lines.length){setReceivingError("Enter at least one quantity to receive.");return;}
    if(lines.some(l=>!Number.isFinite(l.quantity_damaged)||l.quantity_damaged<0||l.quantity_damaged>l.quantity_received)){
      setReceivingError("Damaged quantities must be between zero and the received quantity.");
      return;
    }

    const exceedsRemaining=lines.some(line=>{
      const poi=poItems.find(item=>item.id===line.purchase_order_item_id);
      return !poi||line.quantity_received>Number(poi.quantity_ordered)-Number(poi.quantity_received);
    });
    if(exceedsRemaining){
      setReceivingError("A received quantity is greater than the remaining PO quantity.");
      return;
    }

    setSavingReceipt(true);
    const receivedAt=receivingForm.receivedAt?new Date(receivingForm.receivedAt).toISOString():null;
    const {error:saveError}=await supabase.rpc("fieldops_receive_purchase_order",{
      p_purchase_order_id:receivingForm.purchaseOrderId,
      p_location_id:receivingForm.locationId,
      p_received_at:receivedAt,
      p_packing_slip:receivingForm.packingSlip||null,
      p_notes:receivingForm.notes||null,
      p_lines:lines,
    });
    if(saveError){
      setReceivingError(saveError.message);
      showNotice("error",saveError.message);
      setSavingReceipt(false);
      return;
    }

    await loadInventory();
    setReceivingOpen(false);
    setSavingReceipt(false);
    showNotice("success","Receipt posted. Only the quantity actually received was added to stock and received-cost reporting.");
  }

  function openReturn(){setReturnForm({...emptyReturnForm,returnType:canManage?"supplier":"work_order",locationId:locations.find(l=>l.active)?.id??""});setReturnError(null);setReturnOpen(true);}
  async function saveReturn(){if(!returnForm.locationId||!returnForm.reason.trim()){setReturnError("Choose a location and enter the return reason.");return;}if(returnForm.returnType==="supplier"&&!returnForm.supplierId){setReturnError("Choose the supplier for this return.");return;}if(returnForm.returnType==="work_order"&&!returnForm.workOrderId){setReturnError("Choose the work order returning stock.");return;}if(returnForm.returnType==="technician"&&!returnForm.technicianId){setReturnError("Choose the technician returning stock.");return;}if(returnForm.returnType==="customer"&&!returnForm.customerId){setReturnError("Choose the customer returning stock.");return;}const lines=returnForm.lines.filter(l=>l.itemId).map(l=>({inventory_item_id:l.itemId,quantity:Number(l.quantity),condition:l.condition,unit_cost:l.unitCost}));if(!lines.length||lines.some(l=>!Number.isFinite(l.quantity)||l.quantity<=0)){setReturnError("Add at least one valid return item.");return;}setSavingReturn(true);const {error:saveError}=await supabase.rpc("fieldops_post_inventory_return",{p_return_type:returnForm.returnType,p_supplier_id:returnForm.supplierId||null,p_purchase_order_id:returnForm.purchaseOrderId||null,p_work_order_id:returnForm.workOrderId||null,p_technician_id:returnForm.technicianId||null,p_customer_id:returnForm.customerId||null,p_location_id:returnForm.locationId,p_reason:returnForm.reason,p_notes:returnForm.notes||null,p_lines:lines});if(saveError){setReturnError(saveError.message);showNotice("error",saveError.message);setSavingReturn(false);return;}await loadInventory();setReturnOpen(false);setSavingReturn(false);showNotice("success","Inventory return posted.");}

  function openStartReconciliation(){setReconciliationLocationId("");setReconciliationNotes("");setReconciliationError(null);setReconciliationStartOpen(true);}
  async function startReconciliation(){if(!reconciliationLocationId){setReconciliationError("Choose the location to count.");return;}setSavingReconciliation(true);const {data,error:saveError}=await supabase.rpc("fieldops_start_inventory_reconciliation",{p_location_id:reconciliationLocationId,p_notes:reconciliationNotes||null});if(saveError){setReconciliationError(saveError.message);showNotice("error",saveError.message);setSavingReconciliation(false);return;}await loadInventory();const result=data as {reconciliation_id?:string}|null;if(result?.reconciliation_id)setSelectedReconciliationId(result.reconciliation_id);setReconciliationStartOpen(false);setSavingReconciliation(false);showNotice("success","Reconciliation started. Enter the physical counts.");}
  function changeReconciliationLine(id:string,counted:string,reason:string){setReconciliationLines(current=>current.map(l=>l.id===id?{...l,counted_quantity:counted.trim()===""?null:Number(counted),reason}:l));}
  async function persistReconciliationCounts(){if(!selectedReconciliation)return false;const lines=reconciliationLines.filter(l=>l.reconciliation_id===selectedReconciliation.id);for(const line of lines){if(line.counted_quantity!==null&&(!Number.isFinite(line.counted_quantity)||line.counted_quantity<0)){showNotice("error","Physical counts must be valid non-negative numbers.");return false;}const {error:saveError}=await supabase.from("inventory_reconciliation_lines").update({counted_quantity:line.counted_quantity,reason:line.reason||null}).eq("id",line.id);if(saveError){showNotice("error",saveError.message);return false;}}return true;}
  async function saveReconciliationCounts(){if(!selectedReconciliation)return;setSavingReconciliation(true);const ok=await persistReconciliationCounts();if(ok){await loadInventory();showNotice("success","Physical counts saved.");}setSavingReconciliation(false);}
  async function postReconciliation(){if(!selectedReconciliation)return;setSavingReconciliation(true);const ok=await persistReconciliationCounts();if(!ok){setSavingReconciliation(false);return;}const {error:saveError}=await supabase.rpc("fieldops_post_inventory_reconciliation",{p_reconciliation_id:selectedReconciliation.id});if(saveError){showNotice("error",saveError.message);setSavingReconciliation(false);return;}await loadInventory();setSavingReconciliation(false);showNotice("success","Reconciliation posted and stock variances recorded.");}

  function openNote(){setNoteText("");setNoteError(null);setNoteOpen(true);}
  async function saveNote(){if(!selectedItemId||noteText.trim().length<3){setNoteError("Enter at least 3 characters.");return;}setSavingNote(true);const {error:saveError}=await supabase.from("inventory_item_notes").insert({inventory_item_id:selectedItemId,note:noteText.trim()});if(saveError){setNoteError(saveError.message);showNotice("error",saveError.message);setSavingNote(false);return;}await loadInventory();setNoteOpen(false);setSavingNote(false);showNotice("success","Inventory note added.");}

  if(authRequired) return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="max-w-md border border-border bg-card p-6 text-center"><div className="text-xl font-black">FieldOps sign-in required</div><p className="mt-2 text-sm text-muted-foreground">Sign in to view company inventory.</p></div></main>;

  const sectionInfo: Record<InventorySection,{title:string;description:string}>={
    stock:{title:"Stock",description:"Current quantity-based items, reorder health, locations and stock value."},
    purchase_orders:{title:"Purchase Orders",description:"Create, approve, order and track supplier purchase orders."},
    receiving:{title:"Receiving",description:"Receive complete or partial purchase orders into controlled stock locations."},
    returns:{title:"Returns",description:"Return stock to suppliers or bring unused stock back from technicians and work orders."},
    reconciliation:{title:"Reconciliation",description:"Physical cycle counts with permanent variance adjustments and audit history."},
    suppliers:{title:"Suppliers",description:"Vendor contacts, terms and purchasing relationships."},
    movements:{title:"Stock Movements",description:"Permanent ledger of receipts, issues, transfers, returns, consumption and adjustments."},
  };

  return <main className="min-h-screen bg-background text-foreground"><ActionNotice notice={actionNotice} onClose={()=>setActionNotice(null)}/><div className="grid min-h-screen grid-cols-[236px_1fr]"><aside className="border-r border-border bg-card"><CompanyBrand className="border-b border-border px-5 py-4" nameClassName="text-lg font-black" compact /><nav className="space-y-1 p-3">{navigation.map(n=>{const Icon=n.icon;return <Link key={n.label} href={n.href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${n.active?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4"/>{n.label}</Link>})}</nav></aside><section className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-6"><div className="flex h-10 w-[420px] items-center gap-2 border border-border px-3 text-sm text-muted-foreground"><Search className="h-4 w-4"/>Search work orders, customers, technicians...</div><div className="flex items-center gap-2"><FieldOpsThemeToggle/><button className="flex h-10 w-10 items-center justify-center border border-border" aria-label="Notifications"><Bell className="h-4 w-4"/></button></div></header><div className="p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-sm font-bold text-primary">Inventory</div><h1 className="mt-1 text-3xl font-black">Inventory Management</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Control stock from purchase order through receiving, issue/consumption, returns, transfers and physical reconciliation. Serialized equipment remains in Assets.</p></div><button onClick={()=>void loadInventory()} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Refresh</button></div>{error&&<div className="mt-5 border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}<div className="mt-6"><InventorySummaryCards totalItems={totalStockPositions} lowStock={lowStock} outOfStock={outOfStock} inventoryValue={inventoryValue} scopeLabel={selectedStockLocation?.name??"All locations"} onView={openSummary}/></div><div className="mt-6"><SectionTabs value={section} onChange={setSection}/></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{sectionInfo[section].title}</h2><p className="mt-1 text-xs text-muted-foreground">{sectionInfo[section].description}</p></div><div className="flex flex-wrap gap-2">{section==="stock"&&<>{canManage&&<button onClick={openNewLocation} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black"><MapPin className="h-4 w-4"/>New Location</button>}{canFieldMove&&<button onClick={()=>openMovement()} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black"><RotateCcw className="h-4 w-4"/>Stock Movement</button>}{canManage&&<button onClick={openNewItem} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4"/>New Item</button>}</>}{section==="purchase_orders"&&canManage&&<button onClick={openNewPO} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><ShoppingCart className="h-4 w-4"/>New Purchase Order</button>}{section==="receiving"&&canManage&&<button onClick={openReceiving} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><ClipboardCheck className="h-4 w-4"/>Receive PO</button>}{section==="returns"&&canFieldMove&&<button onClick={openReturn} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><RotateCcw className="h-4 w-4"/>New Return</button>}{section==="reconciliation"&&canManage&&<button onClick={openStartReconciliation} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><ClipboardCheck className="h-4 w-4"/>Start Reconciliation</button>}{section==="suppliers"&&canManage&&<button onClick={openNewSupplier} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4"/>New Supplier</button>}{section==="movements"&&canFieldMove&&<button onClick={()=>openMovement()} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4"/>Record Movement</button>}</div></div>{section==="stock"&&<><div className="mt-4 flex flex-wrap items-center gap-3 border border-border bg-card p-3"><div className="flex min-w-[280px] flex-1 items-center gap-2 border border-border bg-background px-3"><Search className="h-4 w-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Search item, SKU, part number, barcode, category or manufacturer"/></div><Filter className="h-4 w-4 text-muted-foreground"/><select value={stockLocationFilter} onChange={e=>setStockLocationFilter(e.target.value)} className="h-10 border border-border bg-background px-3 text-xs font-bold"><option value="all">All locations</option>{locations.filter(location=>location.active).map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select><select value={stockFilter} onChange={e=>setStockFilter(e.target.value)} className="h-10 border border-border bg-background px-3 text-xs font-bold"><option value="all">All stock</option><option value="ok">Healthy</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><select value={activeFilter} onChange={e=>setActiveFilter(e.target.value)} className="h-10 border border-border bg-background px-3 text-xs font-bold"><option value="active">Active items</option><option value="inactive">Inactive items</option><option value="all">All items</option></select></div><div className="mt-4">{loading&&!items.length?<div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading inventory…</div>:<StockTable snapshots={filteredSnapshots} onOpen={openItem}/>}</div></>}{section==="purchase_orders"&&<div className="mt-4"><PurchaseOrdersTable orders={purchaseOrders} lines={poItems} supplierMap={supplierMap} onOpen={setSelectedPOId}/></div>}{section==="receiving"&&<div className="mt-4"><ReceiptsTable receipts={receipts} poMap={poMap} locationMap={locationMap}/></div>}{section==="returns"&&<div className="mt-4"><ReturnsTable returns={returns} locationMap={locationMap} supplierMap={supplierMap} workOrderMap={workOrderMap} profileMap={profileMap} customerMap={customerMap}/></div>}{section==="reconciliation"&&<div className="mt-4"><ReconciliationTable reconciliations={reconciliations} locationMap={locationMap} onOpen={setSelectedReconciliationId}/></div>}{section==="suppliers"&&<div className="mt-4"><SuppliersTable suppliers={suppliers} onEdit={openEditSupplier}/></div>}{section==="movements"&&<div className="mt-4"><MovementsTable movements={transactions} itemMap={itemMap} locationMap={locationMap} workOrderMap={workOrderMap} profileMap={profileMap}/></div>}</div></section></div>

  {summaryView&&!summaryLocationId&&<InventoryStockHealthLocationsModal view={summaryView} summaries={scopedLocationSummaries} onSelectLocation={setSummaryLocationId} onClose={()=>{setSummaryLocationId(null);setSummaryView(null)}}/>}
  {summaryView&&summaryLocationId&&selectedSummaryLocation&&<InventoryStockHealthItemsModal view={summaryView} locationName={selectedSummaryLocation.name} rows={selectedSummaryHealthRows} canManage={canManage} onBack={()=>setSummaryLocationId(null)} onOpenItem={id=>{setSummaryLocationId(null);setSummaryView(null);openItem(id)}} onCreatePO={openPOForHealthRows} onClose={()=>{setSummaryLocationId(null);setSummaryView(null)}}/>}
  {selectedSnapshot&&<InventoryItemDetailModal snapshot={selectedSnapshot} tab={itemTab} transactions={transactions.filter(t=>t.inventory_item_id===selectedSnapshot.item.id)} locations={locations} suppliers={suppliers} itemSuppliers={itemSuppliers.filter(x=>x.inventory_item_id===selectedSnapshot.item.id)} purchaseOrders={purchaseOrders} poItems={poItems.filter(x=>x.inventory_item_id===selectedSnapshot.item.id)} workOrders={workOrders} notes={itemNotes.filter(n=>n.inventory_item_id===selectedSnapshot.item.id)} canManage={canManage} canAddNote={canAddNote} onTabChange={setItemTab} onEdit={openEditItem} onMovement={()=>openMovement(selectedSnapshot.item.id)} onAddNote={openNote} onClose={()=>setSelectedItemId(null)}/>} 
  {itemFormOpen&&<InventoryItemFormModal mode={itemFormMode} form={itemForm} suppliers={suppliers} error={itemFormError} saving={savingItem} onChange={setItemForm} onSave={()=>void saveItem()} onClose={()=>setItemFormOpen(false)}/>} 
  {movementOpen&&<StockMovementModal form={movementForm} items={items} locations={locations} profiles={profiles} workOrders={workOrders} canManage={canManage} error={movementError} saving={savingMovement} onChange={setMovementForm} onSave={()=>void saveMovement()} onClose={()=>setMovementOpen(false)}/>} 
  {supplierOpen&&<SupplierFormModal mode={supplierMode} form={supplierForm} error={supplierError} saving={savingSupplier} onChange={setSupplierForm} onSave={()=>void saveSupplier()} onClose={()=>setSupplierOpen(false)}/>} 
  {locationOpen&&<LocationFormModal form={locationForm} sites={sites} profiles={profiles} error={locationError} saving={savingLocation} onChange={setLocationForm} onSave={()=>void saveLocation()} onClose={()=>setLocationOpen(false)}/>} 
  {poOpen&&<PurchaseOrderModal form={poForm} suppliers={suppliers} items={items} locations={locations} error={poError} saving={savingPO} onChange={setPOForm} onSave={()=>void savePO()} onClose={()=>setPOOpen(false)}/>} 
  {selectedPO&&<PurchaseOrderDetailModal po={selectedPO} lines={poItems.filter(l=>l.purchase_order_id===selectedPO.id)} supplier={supplierMap.get(selectedPO.supplier_id)??null} location={selectedPO.destination_location_id?locationMap.get(selectedPO.destination_location_id)??null:null} itemMap={itemMap} canManage={canManage} saving={savingPOStatus} onStatus={s=>void setPOStatus(s)} onClose={()=>setSelectedPOId(null)}/>} 
  {receivingOpen&&<ReceivePOModal form={receivingForm} purchaseOrders={purchaseOrders} poItems={poItems} items={items} locations={locations} error={receivingError} saving={savingReceipt} onChange={setReceivingForm} onSelectPO={selectReceivingPO} onSave={()=>void saveReceipt()} onClose={()=>setReceivingOpen(false)}/>} 
  {returnOpen&&<ReturnModal form={returnForm} items={items} locations={locations} suppliers={suppliers} purchaseOrders={purchaseOrders} workOrders={workOrders} profiles={profiles} customers={customers} canManage={canManage} error={returnError} saving={savingReturn} onChange={setReturnForm} onSave={()=>void saveReturn()} onClose={()=>setReturnOpen(false)}/>} 
  {reconciliationStartOpen&&<ReconciliationStartModal locationId={reconciliationLocationId} notes={reconciliationNotes} locations={locations} error={reconciliationError} saving={savingReconciliation} onLocationChange={setReconciliationLocationId} onNotesChange={setReconciliationNotes} onSave={()=>void startReconciliation()} onClose={()=>setReconciliationStartOpen(false)}/>} 
  {selectedReconciliation&&<ReconciliationDetailModal reconciliation={selectedReconciliation} lines={reconciliationLines.filter(l=>l.reconciliation_id===selectedReconciliation.id)} itemMap={itemMap} location={locationMap.get(selectedReconciliation.location_id)??null} canManage={canManage} saving={savingReconciliation} onLineChange={changeReconciliationLine} onSaveCounts={()=>void saveReconciliationCounts()} onPost={()=>void postReconciliation()} onClose={()=>setSelectedReconciliationId(null)}/>} 
  {noteOpen&&<ItemNoteModal note={noteText} error={noteError} saving={savingNote} onChange={setNoteText} onSave={()=>void saveNote()} onClose={()=>setNoteOpen(false)}/>} 
  </main>;
}
