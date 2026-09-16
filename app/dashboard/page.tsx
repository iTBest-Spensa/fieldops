"use client";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Package,
  ReceiptText,
  RefreshCw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { CompanyBrand } from "@/components/company-brand";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";

type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string | null;
  site_id: string | null;
  title: string;
  priority: string | null;
  status: string;
  billing_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  requested_at: string | null;
  completed_at: string | null;
  estimated_duration_minutes: number | null;
};

type DbAssignment = {
  id: string;
  work_order_id: string;
  technician_id: string;
  assignment_role: string | null;
  assignment_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  assigned_at: string | null;
  released_at: string | null;
};

type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean | null;
};

type DbRole = { user_id: string; role: string };
type DbCustomer = { id: string; name: string };

type DbInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  work_order_id: string | null;
  status: string;
  due_date: string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  balance_due: number | string | null;
  created_at: string | null;
};

type DbPayment = {
  id: string;
  invoice_id: string | null;
  amount: number | string | null;
  payment_method: string | null;
  status: string | null;
  reference: string | null;
  received_at: string | null;
  voided_at: string | null;
};

type DbInventoryItem = {
  id: string;
  sku: string | null;
  part_number: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  manufacturer: string | null;
  unit: string;
  unit_cost: number | string | null;
  unit_price: number | string | null;
  reorder_level: number | string | null;
  reorder_quantity: number | string | null;
  taxable: boolean;
  track_stock: boolean;
  preferred_supplier_id: string | null;
  notes: string | null;
  active: boolean;
};

type DbInventoryLocation = {
  id: string;
  name: string;
  code: string | null;
  location_type: string | null;
  active: boolean;
};

type DbInventoryTransaction = {
  inventory_item_id: string;
  location_id: string | null;
  transaction_type: string | null;
  quantity: number | string | null;
  unit_cost: number | string | null;
  created_at: string | null;
};

type DbSupplier = {
  id: string;
  name: string;
  active: boolean;
};

type DbItemSupplier = {
  inventory_item_id: string;
  supplier_id: string;
  supplier_sku: string | null;
  last_unit_cost: number | string | null;
  preferred: boolean;
  active: boolean;
};

type DbPurchaseOrder = {
  id: string;
  po_number: string;
  destination_location_id: string | null;
  status: "draft" | "approved" | "ordered" | "partially_received" | "received" | "closed" | "cancelled";
};

type DbPurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  quantity_ordered: number | string;
  quantity_received: number | string;
};

type ReplenishmentCoverage = {
  status: "needs_po" | "waiting_approval" | "on_order";
  target: number;
  covered: number;
  draftCovered: number;
  committedCovered: number;
  poNumbers: string[];
};

type DbTimeEntry = {
  id: string;
  technician_id: string;
  work_order_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  activity_type: string;
  billable: boolean;
  billing_rate: number | null;
  pay_rate: number | null;
};

type DbMaterialUsage = {
  id: string;
  work_order_id: string;
  inventory_item_id: string | null;
  description: string;
  quantity: number;
  quantity_returned: number;
  unit_cost: number;
  created_at: string;
};

type DbWorkOrderEvent = {
  id: string;
  work_order_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type ModalKey =
  | "today_unassigned"
  | "assigned_work_orders"
  | "available_techs"
  | "billing_ready"
  | "attention"
  | "partial_payments"
  | "revenue_expenses"
  | "best_technician"
  | "inventory_alerts"
  | "payment_mix"
  | "inventory_value"
  | "inventory_items"
  | "pipeline";

type AttentionCategory = "urgent" | "billing" | "overdue" | "inventory";

type Drill =
  | { kind: "root" }
  | { kind: "today_job"; workOrderId: string }
  | { kind: "assigned_work_order"; workOrderId: string }
  | { kind: "technician"; technicianId: string }
  | { kind: "billing_work_order"; workOrderId: string }
  | { kind: "partial_invoice"; invoiceId: string }
  | { kind: "revenue_group"; group: "revenue" | "labour" | "materials" }
  | { kind: "technician_detail"; technicianId: string }
  | { kind: "inventory_location"; locationId: string }
  | { kind: "inventory_item"; locationId: string; itemId: string }
  | { kind: "attention_category"; category: AttentionCategory }
  | { kind: "attention_work_order"; category: "urgent" | "billing"; workOrderId: string }
  | { kind: "attention_invoice"; invoiceId: string }
  | { kind: "payment_mode"; mode: "cash" | "digital" | "check" }
  | { kind: "inventory_value_day"; dayKey: string }
  | { kind: "inventory_item_day"; dayKey: string }
  | { kind: "pipeline_stage"; label: string; statuses: string[] };

type InventoryPosition = {
  location: DbInventoryLocation;
  item: DbInventoryItem;
  onHand: number;
  status: "out" | "low" | "ok";
  value: number;
};

type WeekPoint = { key: string; label: string; inbound: number; outbound: number };
type PaymentMode = { key: "cash" | "digital" | "check"; label: string; amount: number; percent: number };
type TechnicianRank = { technicianId: string; name: string; minutes: number; hours: number; billableValue: number };

type AssignmentDraft = {
  workOrder: DbWorkOrder;
  technicianId: string;
  start: string;
  end: string;
  error: string | null;
};

type PaymentDraft = {
  invoice: DbInvoice;
  amount: string;
  method: "cash" | "tap";
  reference: string;
  error: string | null;
};

type PODraft = {
  locationId: string;
  itemId: string;
  supplierId: string;
  quantity: string;
  unitCost: string;
  expectedDate: string;
  error: string | null;
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Accounts", icon: ReceiptText, href: "/accounts" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const inProgressStatuses = new Set(["travelling", "on_site", "working", "waiting"]);
const activeAssignedStatuses = new Set(["assigned", "travelling", "on_site", "working", "waiting", "finished", "billing_ready"]);
const openStatuses = new Set(["requested", "planned", "assigned", "travelling", "on_site", "working", "waiting", "finished", "billing_ready"]);
const statusStages = [
  { key: "assigned", label: "Assigned" },
  { key: "travelling", label: "Travelling" },
  { key: "on_site", label: "On Site" },
  { key: "working", label: "Working" },
  { key: "waiting", label: "Waiting" },
  { key: "finished", label: "Finished" },
] as const;
const technicianBarClasses = ["bg-emerald-500", "bg-blue-500", "bg-orange-500", "bg-violet-500", "bg-rose-500"];

function localDateKey(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function dateKeyFromIso(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localDateKey(date);
}

function money(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value);
}

function statusLabel(status: string | null | undefined) {
  return (status ?? "unknown").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatClock(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTimeInput(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function statusTone(status: string) {
  if (status === "travelling" || status === "on_site") return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300";
  if (status === "working") return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  if (status === "waiting") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "finished" || status === "billing_ready") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "assigned") return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  return "border-border bg-muted text-muted-foreground";
}

function priorityTone(priority: string | null) {
  if (priority === "emergency" || priority === "urgent") return "text-rose-600 dark:text-rose-400";
  if (priority === "high") return "text-amber-700 dark:text-amber-300";
  return "text-muted-foreground";
}

function weekDays(now: Date | null) {
  if (!now) return [] as { key: string; label: string }[];
  const current = new Date(now);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(current.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { key: localDateKey(date), label: date.toLocaleDateString([], { weekday: "short" }) };
  });
}

function startOfCurrentWeek(now: Date | null) {
  if (!now) return null;
  const date = new Date(now);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

function endOfCurrentWeek(now: Date | null) {
  const start = startOfCurrentWeek(now);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function inCurrentWeek(value: string | null | undefined, start: Date | null, end: Date | null) {
  if (!value || !start || !end) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

function timeEntryMinutes(entry: DbTimeEntry) {
  if (Number.isFinite(Number(entry.duration_minutes))) return Math.max(0, Number(entry.duration_minutes ?? 0));
  if (!entry.ended_at) return 0;
  const start = new Date(entry.started_at).getTime();
  const end = new Date(entry.ended_at).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 60000 : 0;
}

function paymentMode(method: string | null | undefined) {
  const value = (method ?? "").toLowerCase();
  if (value.includes("cash")) return "cash" as const;
  if (value.includes("check") || value.includes("cheque")) return "check" as const;
  return "digital" as const;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function suggestedOrderQuantity(position: InventoryPosition) {
  const configured = Number(position.item.reorder_quantity ?? 0);
  if (configured > 0) return configured;
  return Math.max(1, Number(position.item.reorder_level ?? 0) - Math.max(0, position.onHand));
}

function SummaryCard({ label, value, helper, detailHint, icon: Icon, onClick, accent = "default" }: {
  label: string;
  value: string | number;
  helper: string;
  detailHint: string;
  icon: typeof ClipboardList;
  onClick: () => void;
  accent?: "default" | "warning" | "danger" | "success";
}) {
  const accentClass = accent === "danger" ? "border-rose-500/35 bg-rose-500/10" : accent === "warning" ? "border-amber-500/35 bg-amber-500/10" : accent === "success" ? "border-emerald-500/35 bg-emerald-500/10" : "border-border bg-card";
  const iconClass = accent === "danger" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : accent === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : accent === "success" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary";
  return (
    <button type="button" onClick={onClick} className={`group min-w-0 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-black tracking-tight">{value}</div>
          <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{helper}</div>
          <div className="mt-2 text-[10px] font-black text-primary">{detailHint}</div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-4 w-4" /></div>
      </div>
    </button>
  );
}

function DrillRow({ title, subtitle, right, onClick, tone = "default" }: {
  key?: string | number;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneClass = tone === "danger" ? "border-rose-500/30 bg-rose-500/5" : tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : tone === "success" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card";
  const content = (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-black">{title}</div>
        {subtitle ? <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : onClick ? <div className="shrink-0 text-lg font-black text-primary">›</div> : null}
    </div>
  );
  return onClick ? <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition hover:bg-muted/35 ${toneClass}`}>{content}</button> : <div className={`rounded-xl border p-3 ${toneClass}`}>{content}</div>;
}

function DashboardModal({ title, description, wide, onBack, onClose, children }: {
  title: string;
  description: string;
  wide?: boolean;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button type="button" aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <section className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ${wide ? "max-w-[1180px]" : "max-w-[920px]"}`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {onBack ? <button type="button" onClick={onBack} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button> : null}
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-primary">Dashboard Details</div>
              <h2 className="mt-1 text-xl font-black">{title}</h2>
              <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

function WeeklyLineChart({ points }: { points: WeekPoint[] }) {
  const width = 880, height = 300, left = 58, right = 20, top = 20, bottom = 48;
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.inbound, point.outbound]));
  const x = (index: number) => left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * (width - left - right));
  const y = (value: number) => top + (height - top - bottom) - (value / maxValue) * (height - top - bottom);
  const inLine = points.map((point, index) => `${x(index)},${y(point.inbound)}`).join(" ");
  const outLine = points.map((point, index) => `${x(index)},${y(point.outbound)}`).join(" ");
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background/55 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[285px] w-full" role="img" aria-label="Weekly inventory value movement">
        {[0, .25, .5, .75, 1].map((ratio) => {
          const value = maxValue * ratio;
          return <g key={ratio}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="stroke-border" /><text x={left - 8} y={y(value) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{compactMoney(value)}</text></g>;
        })}
        {points.map((point, index) => <text key={point.key} x={x(index)} y={height - 16} textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold">{point.label}</text>)}
        <polyline points={inLine} fill="none" className="stroke-emerald-500" strokeWidth="3" />
        <polyline points={outLine} fill="none" className="stroke-orange-500" strokeWidth="3" />
        {points.map((point, index) => <g key={`d-${point.key}`}><circle cx={x(index)} cy={y(point.inbound)} r="4.5" className="fill-emerald-500" /><circle cx={x(index)} cy={y(point.outbound)} r="4.5" className="fill-orange-500" /></g>)}
      </svg>
    </div>
  );
}

function PaymentDonut({ modes }: { modes: PaymentMode[] }) {
  const cash = modes.find((mode) => mode.key === "cash")?.percent ?? 0;
  const digital = modes.find((mode) => mode.key === "digital")?.percent ?? 0;
  const background = `conic-gradient(rgb(16 185 129) 0% ${cash}%, rgb(59 130 246) ${cash}% ${cash + digital}%, rgb(245 158 11) ${cash + digital}% 100%)`;
  const total = modes.reduce((sum, mode) => sum + mode.amount, 0);
  return (
    <div className="mt-4 grid gap-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background }}><div className="absolute inset-8 flex flex-col items-center justify-center rounded-full border border-border bg-card text-center"><div className="text-[9px] font-black uppercase text-muted-foreground">Week total</div><div className="mt-1 text-lg font-black">{money(total)}</div></div></div>
      <div className="space-y-2">{modes.map((mode) => <div key={mode.key} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border p-3"><span className={`h-2.5 w-2.5 rounded-full ${mode.key === "cash" ? "bg-emerald-500" : mode.key === "digital" ? "bg-blue-500" : "bg-amber-500"}`} /><div><div className="text-xs font-black">{mode.label}</div><div className="text-[10px] text-muted-foreground">{mode.percent.toFixed(1)}%</div></div><div className="text-xs font-black">{money(mode.amount)}</div></div>)}</div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);
  const [assignments, setAssignments] = useState<DbAssignment[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<DbInventoryItem[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<DbInventoryLocation[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<DbInventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [itemSuppliers, setItemSuppliers] = useState<DbItemSupplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<DbPurchaseOrder[]>([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<DbPurchaseOrderItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<DbTimeEntry[]>([]);
  const [materialUsages, setMaterialUsages] = useState<DbMaterialUsage[]>([]);
  const [workOrderEvents, setWorkOrderEvents] = useState<DbWorkOrderEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [modalKey, setModalKey] = useState<ModalKey | null>(null);
  const [drillPath, setDrillPath] = useState<Drill[]>([{ kind: "root" }]);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [poDraft, setPODraft] = useState<PODraft | null>(null);
  const [savingPO, setSavingPO] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const loadDashboard = useCallback(async () => {
    setError(null);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { setAuthRequired(true); setLoading(false); return; }
    setAuthRequired(false);
    setCurrentUserId(authData.user.id);
    const results = await Promise.all([
      supabase.from("work_orders").select("id,work_order_number,customer_id,site_id,title,priority,status,billing_status,scheduled_start,scheduled_end,requested_at,completed_at,estimated_duration_minutes").order("requested_at", { ascending: false }),
      supabase.from("work_order_assignments").select("id,work_order_id,technician_id,assignment_role,assignment_status,scheduled_start,scheduled_end,assigned_at,released_at"),
      supabase.from("profiles").select("id,full_name,email,active").eq("active", true),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("customers").select("id,name"),
      supabase.from("invoices").select("id,invoice_number,customer_id,work_order_id,status,due_date,total,amount_paid,balance_due,created_at").order("created_at", { ascending: false }),
      supabase.from("payments").select("id,invoice_id,amount,payment_method,status,reference,received_at,voided_at").order("received_at", { ascending: false }),
      supabase.from("inventory_items").select("id,sku,part_number,barcode,name,description,category,manufacturer,unit,unit_cost,unit_price,reorder_level,reorder_quantity,taxable,track_stock,preferred_supplier_id,notes,active").eq("active", true).order("name"),
      supabase.from("inventory_locations").select("id,name,code,location_type,active").eq("active", true).order("name"),
      supabase.from("inventory_transactions").select("inventory_item_id,location_id,transaction_type,quantity,unit_cost,created_at").order("created_at", { ascending: true }),
      supabase.from("inventory_suppliers").select("id,name,active").eq("active", true).order("name"),
      supabase.from("inventory_item_suppliers").select("inventory_item_id,supplier_id,supplier_sku,last_unit_cost,preferred,active").eq("active", true),
      supabase.from("inventory_purchase_orders").select("id,po_number,destination_location_id,status").order("created_at", { ascending: false }),
      supabase.from("inventory_purchase_order_items").select("id,purchase_order_id,inventory_item_id,quantity_ordered,quantity_received"),
      supabase.from("time_entries").select("id,technician_id,work_order_id,started_at,ended_at,duration_minutes,activity_type,billable,billing_rate,pay_rate").order("started_at", { ascending: false }),
      supabase.from("material_usage").select("id,work_order_id,inventory_item_id,description,quantity,quantity_returned,unit_cost,created_at").order("created_at", { ascending: false }),
      supabase.from("work_order_events").select("id,work_order_id,event_type,old_status,new_status,details,created_at").order("created_at", { ascending: true }),
    ]);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) { setError(firstError.message); setLoading(false); return; }
    setWorkOrders((results[0].data ?? []) as DbWorkOrder[]);
    setAssignments((results[1].data ?? []) as DbAssignment[]);
    setProfiles((results[2].data ?? []) as DbProfile[]);
    setRoles((results[3].data ?? []) as DbRole[]);
    setCustomers((results[4].data ?? []) as DbCustomer[]);
    setInvoices((results[5].data ?? []) as DbInvoice[]);
    setPayments((results[6].data ?? []) as DbPayment[]);
    setInventoryItems((results[7].data ?? []) as DbInventoryItem[]);
    setInventoryLocations((results[8].data ?? []) as DbInventoryLocation[]);
    setInventoryTransactions((results[9].data ?? []) as DbInventoryTransaction[]);
    setSuppliers((results[10].data ?? []) as DbSupplier[]);
    setItemSuppliers((results[11].data ?? []) as DbItemSupplier[]);
    setPurchaseOrders((results[12].data ?? []) as DbPurchaseOrder[]);
    setPurchaseOrderItems((results[13].data ?? []) as DbPurchaseOrderItem[]);
    setTimeEntries((results[14].data ?? []) as DbTimeEntry[]);
    setMaterialUsages((results[15].data ?? []) as DbMaterialUsage[]);
    setWorkOrderEvents((results[16].data ?? []) as DbWorkOrderEvent[]);
    setLastUpdatedAt(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => { setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (authRequired) return;
    let timer: number | null = null;
    const refreshSoon = () => { if (timer !== null) window.clearTimeout(timer); timer = window.setTimeout(() => void loadDashboard(), 250); };
    const channel = supabase.channel("fieldops-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_order_assignments" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_transactions" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_purchase_orders" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_purchase_order_items" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "material_usage" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_order_events" }, refreshSoon)
      .subscribe();
    return () => { if (timer !== null) window.clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [authRequired, loadDashboard, supabase]);

  const currentDrill = drillPath[drillPath.length - 1];
  const todayKey = now ? localDateKey(now) : "";
  const weekStart = useMemo(() => startOfCurrentWeek(now), [now]);
  const weekEnd = useMemo(() => endOfCurrentWeek(now), [now]);
  const week = useMemo(() => weekDays(now), [now]);
  const customerMap = useMemo(() => new Map(customers.map((row) => [row.id, row.name])), [customers]);
  const profileMap = useMemo(() => new Map(profiles.map((row) => [row.id, row])), [profiles]);
  const itemMap = useMemo(() => new Map(inventoryItems.map((row) => [row.id, row])), [inventoryItems]);
  const locationMap = useMemo(() => new Map(inventoryLocations.map((row) => [row.id, row])), [inventoryLocations]);
  const supplierMap = useMemo(() => new Map(suppliers.map((row) => [row.id, row])), [suppliers]);
  const canManageInventory = useMemo(() => currentUserId ? roles.some((role) => role.user_id === currentUserId && ["admin", "manager", "inventory"].includes(role.role)) : false, [currentUserId, roles]);
  const canManageBilling = useMemo(() => currentUserId ? roles.some((role) => role.user_id === currentUserId && ["admin", "manager", "billing"].includes(role.role)) : false, [currentUserId, roles]);

  const currentAssignmentMap = useMemo(() => {
    const map = new Map<string, DbAssignment>();
    for (const assignment of assignments) {
      if (assignment.released_at || (assignment.assignment_role && assignment.assignment_role !== "primary") || ["declined", "removed", "completed"].includes(assignment.assignment_status ?? "")) continue;
      const current = map.get(assignment.work_order_id);
      if (!current || new Date(assignment.assigned_at ?? 0).getTime() >= new Date(current.assigned_at ?? 0).getTime()) map.set(assignment.work_order_id, assignment);
    }
    return map;
  }, [assignments]);

  const technicianIds = useMemo(() => new Set(roles.filter((role) => role.role === "technician").map((role) => role.user_id)), [roles]);
  const activeTechnicians = useMemo(() => profiles.filter((profile) => profile.active !== false && technicianIds.has(profile.id)).sort((a, b) => (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "")), [profiles, technicianIds]);
  const busyTechnicianIds = useMemo(() => new Set(workOrders.filter((wo) => inProgressStatuses.has(wo.status)).map((wo) => currentAssignmentMap.get(wo.id)?.technician_id).filter(Boolean) as string[]), [workOrders, currentAssignmentMap]);
  const availableTechs = useMemo(() => activeTechnicians.filter((tech) => !busyTechnicianIds.has(tech.id)), [activeTechnicians, busyTechnicianIds]);
  const todaysUnassignedJobs = useMemo(() => workOrders.filter((wo) => openStatuses.has(wo.status) && !currentAssignmentMap.has(wo.id) && (dateKeyFromIso(wo.scheduled_start) === todayKey || dateKeyFromIso(wo.requested_at) === todayKey)), [workOrders, currentAssignmentMap, todayKey]);
  const assignedWorkOrders = useMemo(() => workOrders.filter((wo) => activeAssignedStatuses.has(wo.status) && currentAssignmentMap.has(wo.id)), [workOrders, currentAssignmentMap]);
  const billingReadyOrders = useMemo(() => workOrders.filter((wo) => wo.billing_status === "ready"), [workOrders]);
  const billingReviewOrders = useMemo(() => workOrders.filter((wo) => wo.billing_status === "review_required"), [workOrders]);
  const partialInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== "void" && Number(invoice.amount_paid ?? 0) > 0 && Number(invoice.balance_due ?? 0) > 0).sort((a, b) => Number(b.balance_due ?? 0) - Number(a.balance_due ?? 0)), [invoices]);
  const partialRemaining = partialInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due ?? 0), 0);
  const overdueInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== "void" && Number(invoice.balance_due ?? 0) > 0 && invoice.due_date && invoice.due_date.slice(0, 10) < todayKey), [invoices, todayKey]);
  const urgentOrders = useMemo(() => workOrders.filter((wo) => ["urgent", "emergency"].includes(wo.priority ?? "") && openStatuses.has(wo.status)), [workOrders]);

  // IMPORTANT: exactly mirrors the Inventory module: every active tracked item is evaluated at every active location.
  // No transaction at a location means 0 on hand at that location.
  const inventoryPositions = useMemo<InventoryPosition[]>(() => {
    const balances = new Map<string, number>();
    for (const tx of inventoryTransactions) {
      if (!tx.location_id) continue;
      const key = `${tx.location_id}:${tx.inventory_item_id}`;
      balances.set(key, (balances.get(key) ?? 0) + Number(tx.quantity ?? 0));
    }
    return inventoryLocations.flatMap((location) => inventoryItems.filter((item) => item.active && item.track_stock).map((item) => {
      const onHand = balances.get(`${location.id}:${item.id}`) ?? 0;
      const status: InventoryPosition["status"] = onHand <= 0 ? "out" : onHand <= Number(item.reorder_level ?? 0) ? "low" : "ok";
      return { location, item, onHand, status, value: onHand * Number(item.unit_cost ?? 0) };
    }));
  }, [inventoryItems, inventoryLocations, inventoryTransactions]);

  const replenishmentCoverage = useMemo(() => {
    const map = new Map<string, ReplenishmentCoverage>();

    for (const position of inventoryPositions) {
      const target = suggestedOrderQuantity(position);
      let draftCovered = 0;
      let committedCovered = 0;
      const draftNumbers: string[] = [];
      const committedNumbers: string[] = [];

      for (const po of purchaseOrders) {
        if (po.destination_location_id !== position.location.id) continue;
        if (!["draft", "approved", "ordered", "partially_received"].includes(po.status)) continue;

        const remaining = purchaseOrderItems
          .filter((line) => line.purchase_order_id === po.id && line.inventory_item_id === position.item.id)
          .reduce(
            (sum, line) =>
              sum +
              Math.max(
                0,
                Number(line.quantity_ordered) - Number(line.quantity_received),
              ),
            0,
          );

        if (remaining <= 0) continue;

        if (po.status === "draft") {
          draftCovered += remaining;
          draftNumbers.push(po.po_number);
        } else {
          committedCovered += remaining;
          committedNumbers.push(po.po_number);
        }
      }

      const covered = draftCovered + committedCovered;
      const status: ReplenishmentCoverage["status"] =
        committedCovered >= target
          ? "on_order"
          : covered >= target && draftCovered > 0
            ? "waiting_approval"
            : "needs_po";

      map.set(`${position.location.id}:${position.item.id}`, {
        status,
        target,
        covered,
        draftCovered,
        committedCovered,
        poNumbers:
          status === "on_order"
            ? committedNumbers
            : status === "waiting_approval"
              ? draftNumbers
              : [...committedNumbers, ...draftNumbers],
      });
    }

    return map;
  }, [inventoryPositions, purchaseOrders, purchaseOrderItems]);

  const coverageFor = (position: InventoryPosition) =>
    replenishmentCoverage.get(`${position.location.id}:${position.item.id}`) ?? {
      status: "needs_po" as const,
      target: suggestedOrderQuantity(position),
      covered: 0,
      draftCovered: 0,
      committedCovered: 0,
      poNumbers: [],
    };

  // Approved / ordered coverage removes the item from the action list. A
  // draft that fully covers the target remains visible as Waiting for Approval.
  const outPositions = useMemo(
    () =>
      inventoryPositions.filter(
        (row) =>
          row.status === "out" &&
          replenishmentCoverage.get(`${row.location.id}:${row.item.id}`)?.status !== "on_order",
      ),
    [inventoryPositions, replenishmentCoverage],
  );
  const lowPositions = useMemo(
    () =>
      inventoryPositions.filter(
        (row) =>
          row.status === "low" &&
          replenishmentCoverage.get(`${row.location.id}:${row.item.id}`)?.status !== "on_order",
      ),
    [inventoryPositions, replenishmentCoverage],
  );
  const outLocations = useMemo(() => inventoryLocations.filter((location) => outPositions.some((row) => row.location.id === location.id)), [inventoryLocations, outPositions]);
  const attentionCount = urgentOrders.length + billingReviewOrders.length + overdueInvoices.length + outPositions.length;
  const attentionCategoryCount = [urgentOrders.length, billingReviewOrders.length, overdueInvoices.length, outPositions.length].filter((count) => count > 0).length;

  const weekPayments = useMemo(() => payments.filter((payment) => !payment.voided_at && (payment.status ?? "").toLowerCase() !== "void" && inCurrentWeek(payment.received_at, weekStart, weekEnd)), [payments, weekStart, weekEnd]);
  const paymentModes = useMemo<PaymentMode[]>(() => {
    const totals = { cash: 0, digital: 0, check: 0 };
    for (const payment of weekPayments) totals[paymentMode(payment.payment_method)] += Number(payment.amount ?? 0);
    const total = totals.cash + totals.digital + totals.check;
    return [
      { key: "cash", label: "Cash", amount: totals.cash, percent: total ? (totals.cash / total) * 100 : 0 },
      { key: "digital", label: "Digital", amount: totals.digital, percent: total ? (totals.digital / total) * 100 : 0 },
      { key: "check", label: "Check", amount: totals.check, percent: total ? (totals.check / total) * 100 : 0 },
    ];
  }, [weekPayments]);
  const weeklyRevenue = weekPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const weeklyLabourExpense = useMemo(() => timeEntries.reduce((sum, entry) => inCurrentWeek(entry.started_at, weekStart, weekEnd) && entry.ended_at ? sum + (timeEntryMinutes(entry) / 60) * Number(entry.pay_rate ?? 0) : sum, 0), [timeEntries, weekStart, weekEnd]);
  const weeklyMaterialExpense = useMemo(() => materialUsages.reduce((sum, usage) => inCurrentWeek(usage.created_at, weekStart, weekEnd) ? sum + Math.max(0, Number(usage.quantity ?? 0) - Number(usage.quantity_returned ?? 0)) * Number(usage.unit_cost ?? 0) : sum, 0), [materialUsages, weekStart, weekEnd]);
  const weeklyExpenses = weeklyLabourExpense + weeklyMaterialExpense;
  const weeklyNet = weeklyRevenue - weeklyExpenses;

  const technicianRanking = useMemo<TechnicianRank[]>(() => {
    const map = new Map<string, { minutes: number; billableValue: number }>();
    for (const entry of timeEntries) {
      if (!entry.billable || !entry.ended_at || !inCurrentWeek(entry.started_at, weekStart, weekEnd)) continue;
      const minutes = timeEntryMinutes(entry);
      const current = map.get(entry.technician_id) ?? { minutes: 0, billableValue: 0 };
      current.minutes += minutes;
      current.billableValue += (minutes / 60) * Number(entry.billing_rate ?? 0);
      map.set(entry.technician_id, current);
    }
    return [...map.entries()].map(([technicianId, value]) => ({ technicianId, name: profileMap.get(technicianId)?.full_name ?? profileMap.get(technicianId)?.email ?? "Unknown technician", minutes: value.minutes, hours: value.minutes / 60, billableValue: value.billableValue })).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [timeEntries, weekStart, weekEnd, profileMap]);
  const bestTechnician = technicianRanking[0] ?? null;

  const weeklyInventoryValue = useMemo<WeekPoint[]>(() => {
    const map = new Map<string, WeekPoint>(week.map((day) => [day.key, { key: day.key, label: day.label, inbound: 0, outbound: 0 }]));
    for (const tx of inventoryTransactions) {
      const target = map.get(dateKeyFromIso(tx.created_at)); if (!target) continue;
      const quantity = Number(tx.quantity ?? 0); const cost = Number(tx.unit_cost ?? itemMap.get(tx.inventory_item_id)?.unit_cost ?? 0); const value = Math.abs(quantity) * cost;
      if (quantity >= 0) target.inbound += value; else target.outbound += value;
    }
    return week.map((day) => map.get(day.key)!);
  }, [inventoryTransactions, itemMap, week]);
  const weeklyInventoryItems = useMemo<WeekPoint[]>(() => {
    const map = new Map<string, { label: string; inbound: Set<string>; outbound: Set<string> }>(week.map((day) => [day.key, { label: day.label, inbound: new Set<string>(), outbound: new Set<string>() }]));
    for (const tx of inventoryTransactions) {
      const target = map.get(dateKeyFromIso(tx.created_at)); if (!target) continue;
      if (Number(tx.quantity ?? 0) >= 0) target.inbound.add(tx.inventory_item_id); else target.outbound.add(tx.inventory_item_id);
    }
    return week.map((day) => { const row = map.get(day.key)!; return { key: day.key, label: row.label, inbound: row.inbound.size, outbound: row.outbound.size }; });
  }, [inventoryTransactions, week]);

  const pipelineGroups = useMemo(() => [
    { label: "Queue", statuses: ["requested", "planned"] },
    { label: "Assigned", statuses: ["assigned"] },
    { label: "Travel / On Site", statuses: ["travelling", "on_site"] },
    { label: "Working / Waiting", statuses: ["working", "waiting"] },
    { label: "Finished / Billing", statuses: ["finished", "billing_ready"] },
  ].map((group) => ({ ...group, count: workOrders.filter((wo) => group.statuses.includes(wo.status)).length })), [workOrders]);

  function openModal(key: ModalKey) { setModalKey(key); setDrillPath([{ kind: "root" }]); setActionMessage(null); setConfirmDeactivate(false); setReviewNote(""); }
  function pushDrill(drill: Drill) { setDrillPath((path) => [...path, drill]); setActionMessage(null); setConfirmDeactivate(false); setReviewNote(""); }
  function popDrill() { setDrillPath((path) => path.length > 1 ? path.slice(0, -1) : path); setActionMessage(null); setConfirmDeactivate(false); setReviewNote(""); }

  function technicianAvailability(technicianId: string, start: Date, end: Date, workOrderId: string) {
    const conflicts = assignments.some((assignment) => assignment.technician_id === technicianId && assignment.work_order_id !== workOrderId && !["removed", "declined"].includes(assignment.assignment_status ?? "") && assignment.scheduled_start && assignment.scheduled_end && rangesOverlap(start, end, new Date(assignment.scheduled_start), new Date(assignment.scheduled_end))) || timeEntries.some((entry) => entry.technician_id === technicianId && entry.work_order_id !== workOrderId && rangesOverlap(start, end, new Date(entry.started_at), entry.ended_at ? new Date(entry.ended_at) : end));
    return !conflicts;
  }

  function openAssignment(workOrder: DbWorkOrder) {
    const start = workOrder.scheduled_start ? new Date(workOrder.scheduled_start) : new Date(now ?? new Date());
    if (!workOrder.scheduled_start) start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const end = workOrder.scheduled_end ? new Date(workOrder.scheduled_end) : new Date(start.getTime() + Math.max(15, Number(workOrder.estimated_duration_minutes ?? 60)) * 60000);
    setAssignmentDraft({ workOrder, technicianId: "", start: formatDateTimeInput(start), end: formatDateTimeInput(end), error: null });
  }

  async function confirmAssignment() {
    if (!assignmentDraft) return;
    const start = new Date(assignmentDraft.start), end = new Date(assignmentDraft.end);
    if (!assignmentDraft.technicianId) { setAssignmentDraft({ ...assignmentDraft, error: "Select a technician." }); return; }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) { setAssignmentDraft({ ...assignmentDraft, error: "Enter a valid start and end time." }); return; }
    if (!technicianAvailability(assignmentDraft.technicianId, start, end, assignmentDraft.workOrder.id)) { setAssignmentDraft({ ...assignmentDraft, error: "That technician has a time conflict." }); return; }
    setSavingAssignment(true);
    const { error: rpcError } = await supabase.rpc("fieldops_reassign_work_order", { p_work_order_id: assignmentDraft.workOrder.id, p_from_assignment_id: null, p_to_technician_id: assignmentDraft.technicianId, p_scheduled_start: start.toISOString(), p_scheduled_end: end.toISOString() });
    setSavingAssignment(false);
    if (rpcError) { setAssignmentDraft({ ...assignmentDraft, error: rpcError.message }); return; }
    setAssignmentDraft(null); await loadDashboard(); setActionMessage("Technician assigned successfully.");
  }

  function openPayment(invoice: DbInvoice) { setPaymentDraft({ invoice, amount: String(Number(invoice.balance_due ?? 0).toFixed(2)), method: "cash", reference: "", error: null }); }
  async function savePayment() {
    if (!paymentDraft) return;
    const amount = Number(paymentDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(paymentDraft.invoice.balance_due ?? 0) + .005) { setPaymentDraft({ ...paymentDraft, error: "Enter a payment greater than zero and not above the balance due." }); return; }
    setSavingPayment(true);
    const { error: rpcError } = await supabase.rpc("fieldops_record_invoice_payment", { p_invoice_id: paymentDraft.invoice.id, p_amount: amount, p_payment_method: paymentDraft.method, p_received_at: new Date().toISOString(), p_reference: paymentDraft.reference.trim() || null, p_notes: "Recorded from Dashboard deep-dive." });
    setSavingPayment(false);
    if (rpcError) { setPaymentDraft({ ...paymentDraft, error: rpcError.message }); return; }
    setPaymentDraft(null); await loadDashboard(); setActionMessage("Payment recorded successfully.");
  }

  function preferredSupplierFor(item: DbInventoryItem) {
    const relation = itemSuppliers.find((link) => link.inventory_item_id === item.id && link.active && link.preferred) ?? itemSuppliers.find((link) => link.inventory_item_id === item.id && link.active);
    return item.preferred_supplier_id || relation?.supplier_id || "";
  }

  function openPO(position: InventoryPosition) {
    const coverage = coverageFor(position);
    if (coverage.status === "waiting_approval" || coverage.status === "on_order") {
      setActionMessage(
        coverage.status === "waiting_approval"
          ? `Waiting for approval: ${coverage.poNumbers.join(", ") || "an open draft PO"} already covers this reorder target.`
          : "An approved/ordered PO already covers this reorder target.",
      );
      return;
    }

    const supplierId = preferredSupplierFor(position.item);
    const relation = itemSuppliers.find((link) => link.inventory_item_id === position.item.id && link.active && (!supplierId || link.supplier_id === supplierId));
    setPODraft({
      locationId: position.location.id,
      itemId: position.item.id,
      supplierId,
      quantity: String(Math.max(1, coverage.target - coverage.covered)),
      unitCost: String(relation?.last_unit_cost ?? position.item.unit_cost ?? 0),
      expectedDate: "",
      error: null,
    });
  }

  async function createPO() {
    if (!poDraft) return;
    const item = itemMap.get(poDraft.itemId), location = locationMap.get(poDraft.locationId);
    const quantity = Number(poDraft.quantity), unitCost = Number(poDraft.unitCost);
    if (!item || !location) return;
    if (!poDraft.supplierId) { setPODraft({ ...poDraft, error: "Choose a supplier before creating the PO." }); return; }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) { setPODraft({ ...poDraft, error: "Quantity must be above zero and unit cost cannot be negative." }); return; }
    const relation = itemSuppliers.find((link) => link.inventory_item_id === item.id && link.supplier_id === poDraft.supplierId && link.active);
    setSavingPO(true);
    const { data, error: rpcError } = await supabase.rpc("fieldops_create_replenishment_purchase_order", { p_destination_location_id: location.id, p_supplier_id: poDraft.supplierId, p_expected_date: poDraft.expectedDate || null, p_shipping_amount: 0, p_tax_amount: 0, p_notes: `Dashboard replenishment for ${location.name}.`, p_lines: [{ inventory_item_id: item.id, quantity, unit_cost: unitCost, supplier_sku: relation?.supplier_sku ?? null }] });
    setSavingPO(false);
    if (rpcError) { setPODraft({ ...poDraft, error: rpcError.message }); return; }
    const poNumber = data && typeof data === "object" && "po_number" in data ? String((data as { po_number?: unknown }).po_number ?? "") : "";
    setPODraft(null); await loadDashboard(); setActionMessage(poNumber ? `${poNumber} created as a draft purchase order.` : "Draft purchase order created.");
  }

  async function deactivateInventoryItem(item: DbInventoryItem) {
    if (!canManageInventory) { setActionMessage("Only Admin, Manager or Inventory can deactivate items."); return; }
    const args = { p_inventory_item_id: item.id, p_sku: item.sku, p_part_number: item.part_number, p_barcode: item.barcode, p_name: item.name, p_description: item.description, p_category: item.category, p_manufacturer: item.manufacturer, p_unit: item.unit || "each", p_unit_cost: Number(item.unit_cost ?? 0), p_unit_price: Number(item.unit_price ?? 0), p_reorder_level: Number(item.reorder_level ?? 0), p_reorder_quantity: Number(item.reorder_quantity ?? 0), p_taxable: item.taxable, p_track_stock: item.track_stock, p_preferred_supplier_id: item.preferred_supplier_id, p_notes: item.notes, p_active: false };
    const { error: rpcError } = await supabase.rpc("fieldops_update_inventory_item", args);
    if (rpcError) { setActionMessage(rpcError.message); return; }
    setConfirmDeactivate(false); await loadDashboard(); popDrill(); setActionMessage(`${item.name} was deactivated.`);
  }

  async function resolveBillingReview(workOrderId: string) {
    if (!canManageBilling) { setActionMessage("Only Admin, Manager or Billing can resolve billing review."); return; }
    if (reviewNote.trim().length < 5) { setActionMessage("Enter a resolution note of at least 5 characters."); return; }
    setSavingReview(true);
    const { error: rpcError } = await supabase.rpc("fieldops_resolve_billing_review", { p_work_order_id: workOrderId, p_note: reviewNote.trim() });
    setSavingReview(false);
    if (rpcError) { setActionMessage(rpcError.message); return; }
    await loadDashboard(); popDrill(); setActionMessage("Billing review resolved.");
  }

  async function createInvoice(workOrderId: string) {
    if (!canManageBilling) { setActionMessage("Only Admin, Manager or Billing can create an invoice."); return; }
    const { data, error: rpcError } = await supabase.rpc("fieldops_create_invoice_from_work_order", { p_work_order_id: workOrderId });
    if (rpcError) { setActionMessage(rpcError.message); return; }
    const number = data && typeof data === "object" && "invoice_number" in data ? String((data as { invoice_number?: unknown }).invoice_number ?? "") : "";
    await loadDashboard(); setActionMessage(number ? `${number} created.` : "Invoice created.");
  }

  const eventsByWorkOrder = useMemo(() => {
    const map = new Map<string, DbWorkOrderEvent[]>();
    for (const event of workOrderEvents) map.set(event.work_order_id, [...(map.get(event.work_order_id) ?? []), event]);
    return map;
  }, [workOrderEvents]);

  function stageTime(workOrder: DbWorkOrder, stage: string) {
    if (stage === "assigned") return currentAssignmentMap.get(workOrder.id)?.assigned_at ?? null;
    const event = (eventsByWorkOrder.get(workOrder.id) ?? []).find((row) => row.new_status === stage);
    if (event) return event.created_at;
    if (stage === "finished") return workOrder.completed_at;
    return null;
  }

  function statusLine(workOrder: DbWorkOrder) {
    let currentIndex = statusStages.findIndex((stage) => stage.key === workOrder.status);
    if (workOrder.status === "billing_ready") currentIndex = statusStages.length - 1;
    if (currentIndex < 0) currentIndex = 0;
    return <div className="mt-4 overflow-x-auto pb-1"><div className="flex min-w-[650px] items-start">{statusStages.map((stage, index) => <div key={stage.key} className="relative flex min-w-0 flex-1 flex-col items-center text-center">{index < statusStages.length - 1 ? <div className={`absolute left-1/2 top-[7px] h-0.5 w-full ${index < currentIndex ? "bg-primary" : "bg-border"}`} /> : null}<div className={`relative z-10 h-3.5 w-3.5 rounded-full border-2 ${index <= currentIndex ? "border-primary bg-background" : "border-border bg-background"}`} /><div className={`mt-1.5 text-[9px] font-black ${index <= currentIndex ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{formatClock(stageTime(workOrder, stage.key))}</div></div>)}</div></div>;
  }

  function modalTitle() {
    if (currentDrill.kind === "inventory_location") return `${locationMap.get(currentDrill.locationId)?.name ?? "Location"} · Out of Stock`;
    if (currentDrill.kind === "inventory_item") return itemMap.get(currentDrill.itemId)?.name ?? "Inventory Item";
    if (currentDrill.kind === "attention_category") return currentDrill.category === "urgent" ? "Urgent / Emergency Work" : currentDrill.category === "billing" ? "Billing Review Required" : currentDrill.category === "overdue" ? "Overdue Invoices" : "Out-of-Stock Inventory";
    if (currentDrill.kind === "today_job" || currentDrill.kind === "assigned_work_order" || currentDrill.kind === "billing_work_order" || currentDrill.kind === "attention_work_order") return workOrders.find((wo) => wo.id === currentDrill.workOrderId)?.work_order_number ?? "Work Order";
    if (currentDrill.kind === "partial_invoice" || currentDrill.kind === "attention_invoice") return invoices.find((invoice) => invoice.id === currentDrill.invoiceId)?.invoice_number ?? "Invoice";
    if (currentDrill.kind === "technician" || currentDrill.kind === "technician_detail") return profileMap.get(currentDrill.technicianId)?.full_name ?? "Technician";
    if (currentDrill.kind === "revenue_group") return currentDrill.group === "revenue" ? "Revenue Received" : currentDrill.group === "labour" ? "Technician Pay Expense" : "Material Expense";
    if (currentDrill.kind === "payment_mode") return `${statusLabel(currentDrill.mode)} Payments`;
    if (currentDrill.kind === "inventory_value_day" || currentDrill.kind === "inventory_item_day") return `Inventory Activity · ${currentDrill.dayKey}`;
    if (currentDrill.kind === "pipeline_stage") return currentDrill.label;
    switch (modalKey) {
      case "today_unassigned": return "Today's Unassigned Jobs";
      case "assigned_work_orders": return "Assigned Work Orders";
      case "available_techs": return "Available Technicians";
      case "billing_ready": return "Billing Ready";
      case "attention": return "Attention Required";
      case "partial_payments": return "Partially Paid Invoices";
      case "revenue_expenses": return "Revenue vs Expenses";
      case "best_technician": return "Top 5 Technicians · Monday to Sunday";
      case "inventory_alerts": return "Inventory Alerts";
      case "payment_mix": return "Payment Mode Mix";
      case "inventory_value": return "Weekly Inventory Value Movement";
      case "inventory_items": return "Weekly Inventory Item Activity";
      case "pipeline": return "Work Order Pipeline";
      default: return "Dashboard Details";
    }
  }

  function modalDescription() {
    if (currentDrill.kind === "inventory_location") return "Only items with zero or negative on-hand quantity at this location are listed. Open an item to replenish it or deactivate it.";
    if (currentDrill.kind === "inventory_item") return "This is the affected item/location position. The suggested purchase quantity uses the item's configured reorder quantity, or the reorder level when no reorder quantity is configured.";
    if (currentDrill.kind === "attention_category") return "Each row below is an individual issue behind the Attention Required total. Open one to see the exact problem and available action.";
    if (currentDrill.kind === "attention_work_order") return currentDrill.category === "billing" ? "This work order requires billing review. Review the reason and resolve it only after the correction has been checked." : "This urgent work order needs operational attention. If it is unassigned, you can assign it from here.";
    if (currentDrill.kind === "attention_invoice") return "This invoice is past due and still has an unpaid balance. You can record a Cash or Tap payment from this window.";
    if (currentDrill.kind === "today_job") return "This job is unassigned today. Review the job, then open technician assignment to choose an available technician.";
    if (currentDrill.kind === "assigned_work_order") return "A simple status line showing how far this assigned work order has moved and the recorded time each stage was reached.";
    if (currentDrill.kind === "technician") return "This technician is currently available. The list below shows today's scheduled assignments and recorded actual work.";
    if (currentDrill.kind === "billing_work_order") return "This work order is at the billing handoff. Create an invoice if it is ready, or review the billing issue if review is required.";
    if (currentDrill.kind === "partial_invoice") return "This invoice has already received a partial payment. Review total, paid and remaining balance, then record another payment if needed.";
    if (currentDrill.kind === "revenue_group") return "The underlying records used to calculate this weekly financial figure.";
    if (currentDrill.kind === "technician_detail") return "Daily billable hours and charged value for this technician during the current Monday-to-Sunday week.";
    if (currentDrill.kind === "payment_mode") return "The individual current-week payments that make up this payment-mode slice.";
    if (currentDrill.kind === "inventory_value_day") return "The inventory transactions on this day that make up the cash/value movement graph.";
    if (currentDrill.kind === "inventory_item_day") return "The distinct inventory items moved on this day that make up the item-activity graph.";
    if (currentDrill.kind === "pipeline_stage") return "The work orders currently counted in this pipeline stage.";
    switch (modalKey) {
      case "today_unassigned": return "Only jobs scheduled or requested today that do not currently have a primary technician assignment.";
      case "assigned_work_orders": return "Only work orders that currently have a primary technician assignment. Open one to see its compact status timeline.";
      case "available_techs": return "Technicians not currently inside Travelling, On Site, Working or Waiting work. Open a technician to inspect today's activity.";
      case "billing_ready": return "Work orders waiting at the billing handoff. Open one for the exact billing state and next action.";
      case "attention": return `${attentionCount} individual issue${attentionCount === 1 ? "" : "s"} are active across ${attentionCategoryCount} issue categor${attentionCategoryCount === 1 ? "y" : "ies"}. The large number is the issue count, not the number of category cards below.`;
      case "partial_payments": return "Invoices where some money has been paid but a balance still remains. Open an invoice to see the exact numbers and record another payment.";
      case "revenue_expenses": return "Current-week payments received compared with direct technician-pay and material-consumption costs. Open any figure to see the records behind it.";
      case "best_technician": return "Top five technicians by billable hours charged this week. The vertical bars are Monday through Sunday; open a technician for their exact daily records.";
      case "inventory_alerts": return `${outLocations.length} location${outLocations.length === 1 ? "" : "s"} currently contain at least one zero-stock item position. Open a location, then an item, to take replenishment action.`;
      case "payment_mix": return "Current-week payments grouped as Cash, Digital and Check/Cheque. Open a mode to see the payments behind the percentage.";
      case "inventory_value": return "Current-week dollar value of inventory moving in and out. Open a day to see the transactions behind the graph.";
      case "inventory_items": return "Current-week distinct SKU activity. Open a day to see the exact items that moved.";
      case "pipeline": return "Active work grouped by operational stage. Open a stage to see the work orders counted there.";
      default: return "";
    }
  }

  function billingReviewReason(workOrderId: string) {
    const events = (eventsByWorkOrder.get(workOrderId) ?? []).filter((event) => event.event_type === "billing_review_required");
    const latest = events[events.length - 1];
    if (!latest) return "Billing data changed after billing was prepared.";
    const reason = latest.details?.reason;
    return typeof reason === "string" ? reason.replace(/_/g, " ") : "Billing data changed after billing was prepared.";
  }

  function renderRoot() {
    if (modalKey === "inventory_alerts") return <div className="space-y-2">{outLocations.length === 0 ? <DrillRow title="No zero-stock locations" subtitle="Every active tracked item has stock above zero at every active inventory location." tone="success" /> : outLocations.map((location) => { const count = outPositions.filter((row) => row.location.id === location.id).length; return <DrillRow key={location.id} title={location.name} subtitle={`${count} item${count === 1 ? "" : "s"} at 0 or below · ${statusLabel(location.location_type)}`} right={<span className="text-sm font-black text-rose-600">{count}</span>} tone="danger" onClick={() => pushDrill({ kind: "inventory_location", locationId: location.id })} />; })}</div>;

    if (modalKey === "attention") {
      const categories = [
        { key: "urgent" as const, label: "Urgent / Emergency Work", count: urgentOrders.length, subtitle: "High-priority open work orders that may need dispatch action.", tone: "danger" as const },
        { key: "billing" as const, label: "Billing Review Required", count: billingReviewOrders.length, subtitle: "Work orders whose billing needs human review before proceeding.", tone: "danger" as const },
        { key: "overdue" as const, label: "Overdue Invoices", count: overdueInvoices.length, subtitle: "Invoices past due with an unpaid balance.", tone: "warning" as const },
        { key: "inventory" as const, label: "Out-of-Stock Inventory", count: outPositions.length, subtitle: "Zero-stock item/location positions that may need replenishment.", tone: "danger" as const },
      ];
      return <div><div className="mb-4 rounded-xl border border-border bg-muted/25 p-4"><div className="text-2xl font-black">{attentionCount} individual issues</div><div className="mt-1 text-xs text-muted-foreground">Grouped into {attentionCategoryCount} active categories. The number above counts individual issues; the cards below are categories. Open a category to see every issue inside it.</div></div>{attentionCount === 0 ? <DrillRow title="No active attention issues" subtitle="There are no urgent work, billing-review, overdue-invoice or zero-stock issues right now." tone="success" /> : <div className="grid gap-3 md:grid-cols-2">{categories.filter((category) => category.count > 0).map((category) => <DrillRow key={category.key} title={category.label} subtitle={category.subtitle} right={<span className="text-xl font-black">{category.count}</span>} tone={category.tone} onClick={() => pushDrill({ kind: "attention_category", category: category.key })} />)}</div>}</div>;
    }

    if (modalKey === "today_unassigned") return <div className="space-y-2">{todaysUnassignedJobs.length ? todaysUnassignedJobs.map((wo) => <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={`${customerMap.get(wo.customer_id ?? "") ?? "Unknown customer"} · ${statusLabel(wo.priority)} priority`} tone={["urgent", "emergency"].includes(wo.priority ?? "") ? "danger" : "warning"} onClick={() => pushDrill({ kind: "today_job", workOrderId: wo.id })} />) : <DrillRow title="No unassigned jobs today" subtitle="Every job for today currently has a primary technician assignment." tone="success" />}</div>;
    if (modalKey === "assigned_work_orders") return <div className="space-y-2">{assignedWorkOrders.map((wo) => { const assignment = currentAssignmentMap.get(wo.id); const tech = assignment ? profileMap.get(assignment.technician_id) : null; return <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={`${tech?.full_name ?? tech?.email ?? "Technician"} · ${statusLabel(wo.status)}`} onClick={() => pushDrill({ kind: "assigned_work_order", workOrderId: wo.id })} />; })}</div>;
    if (modalKey === "available_techs") return <div className="grid gap-2 sm:grid-cols-2">{availableTechs.map((tech) => <DrillRow key={tech.id} title={tech.full_name ?? tech.email ?? "Technician"} subtitle="Available now · click to inspect today's work" tone="success" onClick={() => pushDrill({ kind: "technician", technicianId: tech.id })} />)}</div>;
    if (modalKey === "billing_ready") return <div className="space-y-2">{[...billingReviewOrders, ...billingReadyOrders].map((wo) => <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={wo.billing_status === "review_required" ? `Review required · ${billingReviewReason(wo.id)}` : "Ready to create/continue billing"} tone={wo.billing_status === "review_required" ? "warning" : "success"} onClick={() => pushDrill({ kind: "billing_work_order", workOrderId: wo.id })} />)}</div>;
    if (modalKey === "partial_payments") return <div className="space-y-2">{partialInvoices.length ? partialInvoices.map((invoice) => <DrillRow key={invoice.id} title={invoice.invoice_number} subtitle={`${customerMap.get(invoice.customer_id ?? "") ?? "Customer"} · Total ${money(invoice.total)} · Paid ${money(invoice.amount_paid)}`} right={<span className="font-black text-amber-600">{money(invoice.balance_due)}</span>} tone="warning" onClick={() => pushDrill({ kind: "partial_invoice", invoiceId: invoice.id })} />) : <DrillRow title="No partial balances" subtitle="There are no partially paid invoices with a remaining balance." tone="success" />}</div>;
    if (modalKey === "revenue_expenses") return <div className="grid gap-3 md:grid-cols-3"><DrillRow title="Revenue received" subtitle="Payments posted this week" right={<span className="text-xl font-black text-emerald-600">{money(weeklyRevenue)}</span>} tone="success" onClick={() => pushDrill({ kind: "revenue_group", group: "revenue" })} /><DrillRow title="Technician pay" subtitle="Direct pay cost from actual time entries" right={<span className="text-xl font-black text-rose-600">{money(weeklyLabourExpense)}</span>} tone="danger" onClick={() => pushDrill({ kind: "revenue_group", group: "labour" })} /><DrillRow title="Materials consumed" subtitle="Net consumed material cost" right={<span className="text-xl font-black text-rose-600">{money(weeklyMaterialExpense)}</span>} tone="danger" onClick={() => pushDrill({ kind: "revenue_group", group: "materials" })} /></div>;
    if (modalKey === "best_technician") {
      const max = Math.max(1, ...week.flatMap((day) => technicianRanking.map((tech) => timeEntries.filter((entry) => entry.technician_id === tech.technicianId && entry.billable && entry.ended_at && dateKeyFromIso(entry.started_at) === day.key).reduce((sum, entry) => sum + timeEntryMinutes(entry) / 60, 0))));
      return <div><div className="mb-4 flex flex-wrap gap-3">{technicianRanking.map((tech, index) => <button type="button" key={tech.technicianId} onClick={() => pushDrill({ kind: "technician_detail", technicianId: tech.technicianId })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[10px] font-bold hover:bg-muted"><span className={`h-2.5 w-2.5 ${technicianBarClasses[index]}`} />{tech.name}</button>)}</div><div className="grid grid-cols-7 gap-3 rounded-xl border border-border p-4">{week.map((day) => <div key={day.key}><div className="flex h-64 items-end justify-center gap-1">{technicianRanking.map((tech, index) => { const hours = timeEntries.filter((entry) => entry.technician_id === tech.technicianId && entry.billable && entry.ended_at && dateKeyFromIso(entry.started_at) === day.key).reduce((sum, entry) => sum + timeEntryMinutes(entry) / 60, 0); return <button type="button" key={tech.technicianId} onClick={() => pushDrill({ kind: "technician_detail", technicianId: tech.technicianId })} className={`w-5 ${technicianBarClasses[index]}`} style={{ height: hours > 0 ? `${Math.max(4, (hours / max) * 100)}%` : "2px" }} title={`${tech.name}: ${hours.toFixed(1)} h`} />; })}</div><div className="mt-2 text-center text-[10px] font-black">{day.label}</div></div>)}</div></div>;
    }
    if (modalKey === "payment_mix") return <div><PaymentDonut modes={paymentModes} /><div className="mt-4 grid gap-2 sm:grid-cols-3">{paymentModes.map((mode) => <DrillRow key={mode.key} title={mode.label} subtitle={`${mode.percent.toFixed(1)}% of this week's payments`} right={<span className="font-black">{money(mode.amount)}</span>} onClick={() => pushDrill({ kind: "payment_mode", mode: mode.key })} />)}</div></div>;
    if (modalKey === "inventory_value") return <div><WeeklyLineChart points={weeklyInventoryValue} /><div className="mt-4 grid gap-2 sm:grid-cols-7">{weeklyInventoryValue.map((day) => <button key={day.key} type="button" onClick={() => pushDrill({ kind: "inventory_value_day", dayKey: day.key })} className="rounded-xl border border-border p-2 text-center hover:bg-muted"><div className="text-xs font-black">{day.label}</div><div className="mt-1 text-[9px] text-emerald-600">In {money(day.inbound)}</div><div className="text-[9px] text-orange-600">Out {money(day.outbound)}</div></button>)}</div></div>;
    if (modalKey === "inventory_items") return <div className="grid grid-cols-7 gap-3 rounded-xl border border-border p-4">{weeklyInventoryItems.map((day) => <button type="button" key={day.key} onClick={() => pushDrill({ kind: "inventory_item_day", dayKey: day.key })} className="rounded-xl border border-border p-3 text-center hover:bg-muted"><div className="text-xs font-black">{day.label}</div><div className="mt-3 text-2xl font-black">{day.inbound + day.outbound}</div><div className="text-[9px] text-muted-foreground">distinct movement counts</div></button>)}</div>;
    if (modalKey === "pipeline") return <div className="grid gap-3 md:grid-cols-5">{pipelineGroups.map((group) => <DrillRow key={group.label} title={group.label} subtitle="Click to see work orders in this stage" right={<span className="text-2xl font-black">{group.count}</span>} onClick={() => pushDrill({ kind: "pipeline_stage", label: group.label, statuses: group.statuses })} />)}</div>;
    return null;
  }

  function renderDrill() {
    if (currentDrill.kind === "root") return renderRoot();
    if (currentDrill.kind === "inventory_location") {
      const rows = outPositions.filter((row) => row.location.id === currentDrill.locationId);
      return (
        <div className="space-y-2">
          {rows.map((row) => {
            const coverage = coverageFor(row);
            const waiting = coverage.status === "waiting_approval";
            return (
              <DrillRow
                key={row.item.id}
                title={row.item.name}
                subtitle={`SKU ${row.item.sku ?? "—"} · On hand ${row.onHand} ${row.item.unit} · Reorder target ${coverage.target} · Open PO coverage ${coverage.covered}`}
                right={
                  waiting ? (
                    <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-300">
                      Waiting for approval
                    </span>
                  ) : (
                    <span className="font-black text-rose-600">0 stock</span>
                  )
                }
                tone={waiting ? "warning" : "danger"}
                onClick={() =>
                  pushDrill({
                    kind: "inventory_item",
                    locationId: currentDrill.locationId,
                    itemId: row.item.id,
                  })
                }
              />
            );
          })}
        </div>
      );
    }

    if (currentDrill.kind === "inventory_item") {
      const position = inventoryPositions.find((row) => row.location.id === currentDrill.locationId && row.item.id === currentDrill.itemId);
      if (!position) return null;

      const coverage = coverageFor(position);
      const supplierId = preferredSupplierFor(position.item);
      const supplier = supplierMap.get(supplierId);
      const waiting = coverage.status === "waiting_approval";

      return (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DrillRow title="Location" subtitle={position.location.name} />
            <DrillRow title="On hand" subtitle={`${position.onHand} ${position.item.unit}`} tone="danger" />
            <DrillRow title="Reorder level" subtitle={String(Number(position.item.reorder_level ?? 0))} />
            <DrillRow title="Configured reorder quantity" subtitle={String(Number(position.item.reorder_quantity ?? 0))} />
            <DrillRow title="Reorder target" subtitle={`${coverage.target} ${position.item.unit}`} tone="warning" />
            <DrillRow title="Open PO coverage" subtitle={`${coverage.covered} ${position.item.unit}${coverage.poNumbers.length ? ` · ${coverage.poNumbers.join(", ")}` : ""}`} tone={waiting ? "warning" : "default"} />
            <DrillRow title="Preferred supplier" subtitle={supplier?.name ?? "No preferred supplier configured"} />
          </div>

          {waiting ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="font-black text-amber-700 dark:text-amber-300">
                Waiting for approval
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The open draft PO already covers the reorder target, so another PO cannot be created. Once approved/ordered, this item leaves the Dashboard replenishment action list and becomes available to Receiving for this location.
              </p>
            </div>
          ) : null}

          {actionMessage ? (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm font-semibold">
              {actionMessage}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={popDrill} className="h-10 rounded-xl border border-border px-4 text-sm font-bold">
              Cancel
            </button>

            <button type="button" disabled={!canManageInventory} onClick={() => setConfirmDeactivate(true)} className="h-10 rounded-xl border border-rose-500/40 px-4 text-sm font-black text-rose-600 disabled:opacity-50">
              Deactivate Item
            </button>

            {!waiting && coverage.status !== "on_order" ? (
              <button type="button" disabled={!canManageInventory} onClick={() => openPO(position)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">
                <ShoppingCart className="h-4 w-4" /> Create PO
              </button>
            ) : null}
          </div>

          {confirmDeactivate ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="font-black text-rose-600">Deactivate {position.item.name}?</div>
              <p className="mt-1 text-xs text-muted-foreground">This deactivates the catalog item across FieldOps; it does not delete inventory history.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmDeactivate(false)} className="h-9 rounded-xl border border-border px-3 text-xs font-bold">Keep Active</button>
                <button type="button" onClick={() => void deactivateInventoryItem(position.item)} className="h-9 rounded-xl bg-rose-600 px-3 text-xs font-black text-white">Confirm Deactivate</button>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (currentDrill.kind === "attention_category") {
      if (currentDrill.category === "urgent") return <div className="space-y-2">{urgentOrders.map((wo) => <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={`${statusLabel(wo.priority)} priority · ${statusLabel(wo.status)}`} tone="danger" onClick={() => pushDrill({ kind: "attention_work_order", category: "urgent", workOrderId: wo.id })} />)}</div>;
      if (currentDrill.category === "billing") return <div className="space-y-2">{billingReviewOrders.map((wo) => <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={billingReviewReason(wo.id)} tone="warning" onClick={() => pushDrill({ kind: "attention_work_order", category: "billing", workOrderId: wo.id })} />)}</div>;
      if (currentDrill.category === "overdue") return <div className="space-y-2">{overdueInvoices.map((invoice) => <DrillRow key={invoice.id} title={invoice.invoice_number} subtitle={`${customerMap.get(invoice.customer_id ?? "") ?? "Customer"} · Due ${invoice.due_date ?? "—"}`} right={<span className="font-black text-rose-600">{money(invoice.balance_due)}</span>} tone="danger" onClick={() => pushDrill({ kind: "attention_invoice", invoiceId: invoice.id })} />)}</div>;
      return <div className="space-y-2">{outLocations.map((location) => { const count = outPositions.filter((row) => row.location.id === location.id).length; return <DrillRow key={location.id} title={location.name} subtitle={`${count} zero-stock item${count === 1 ? "" : "s"}`} tone="danger" onClick={() => pushDrill({ kind: "inventory_location", locationId: location.id })} />; })}</div>;
    }
    if (currentDrill.kind === "attention_work_order") {
      const wo = workOrders.find((row) => row.id === currentDrill.workOrderId); if (!wo) return null;
      if (currentDrill.category === "urgent") return <div><div className="grid gap-3 sm:grid-cols-2"><DrillRow title="Work order" subtitle={`${wo.work_order_number} · ${wo.title}`} /><DrillRow title="Priority" subtitle={statusLabel(wo.priority)} tone="danger" /><DrillRow title="Current status" subtitle={statusLabel(wo.status)} /><DrillRow title="Assignment" subtitle={currentAssignmentMap.has(wo.id) ? profileMap.get(currentAssignmentMap.get(wo.id)!.technician_id)?.full_name ?? "Assigned" : "Unassigned"} tone={currentAssignmentMap.has(wo.id) ? "default" : "warning"} /></div>{currentAssignmentMap.has(wo.id) ? statusLine(wo) : <div className="mt-5 flex justify-end"><button type="button" onClick={() => openAssignment(wo)} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Assign Technician</button></div>}</div>;
      const latest = (eventsByWorkOrder.get(wo.id) ?? []).filter((event) => event.event_type === "billing_review_required").slice(-1)[0];
      return <div><DrillRow title="Review reason" subtitle={billingReviewReason(wo.id)} tone="warning" />{latest?.details ? <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3"><div className="text-[10px] font-black uppercase text-muted-foreground">Recorded change details</div><pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(latest.details, null, 2)}</pre></div> : null}<label className="mt-4 block"><span className="mb-1.5 block text-xs font-black">Resolution note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card p-3 text-sm" placeholder="What was checked or corrected?" /></label>{actionMessage ? <div className="mt-3 rounded-xl border border-border bg-muted/25 p-3 text-sm">{actionMessage}</div> : null}<div className="mt-4 flex justify-end"><button type="button" disabled={savingReview || !canManageBilling} onClick={() => void resolveBillingReview(wo.id)} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">{savingReview ? "Resolving…" : "Resolve Review"}</button></div></div>;
    }
    if (currentDrill.kind === "attention_invoice" || currentDrill.kind === "partial_invoice") {
      const invoice = invoices.find((row) => row.id === currentDrill.invoiceId); if (!invoice) return null;
      return <div><div className="grid gap-3 sm:grid-cols-3"><DrillRow title="Invoice total" subtitle={money(invoice.total)} /><DrillRow title="Paid" subtitle={money(invoice.amount_paid)} tone="success" /><DrillRow title="Remaining" subtitle={money(invoice.balance_due)} tone="warning" /></div><div className="mt-3"><DrillRow title="Customer" subtitle={customerMap.get(invoice.customer_id ?? "") ?? "Unknown customer"} /><div className="mt-2"><DrillRow title="Due date" subtitle={invoice.due_date ?? "—"} tone={currentDrill.kind === "attention_invoice" ? "danger" : "default"} /></div></div><div className="mt-5 flex justify-end"><button type="button" disabled={!canManageBilling} onClick={() => openPayment(invoice)} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">Record Payment</button></div></div>;
    }
    if (currentDrill.kind === "today_job") {
      const wo = workOrders.find((row) => row.id === currentDrill.workOrderId); if (!wo) return null;
      return <div><div className="grid gap-3 sm:grid-cols-2"><DrillRow title="Customer" subtitle={customerMap.get(wo.customer_id ?? "") ?? "Unknown customer"} /><DrillRow title="Priority" subtitle={statusLabel(wo.priority)} tone={["urgent", "emergency"].includes(wo.priority ?? "") ? "danger" : "default"} /><DrillRow title="Scheduled" subtitle={wo.scheduled_start ? `${new Date(wo.scheduled_start).toLocaleDateString()} · ${formatClock(wo.scheduled_start)}` : "Not scheduled"} /><DrillRow title="Estimated duration" subtitle={`${Number(wo.estimated_duration_minutes ?? 60)} minutes`} /></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => openAssignment(wo)} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Assign Technician</button></div></div>;
    }
    if (currentDrill.kind === "assigned_work_order") { const wo = workOrders.find((row) => row.id === currentDrill.workOrderId); return wo ? <div><DrillRow title={`${wo.work_order_number} · ${wo.title}`} subtitle={`Current status: ${statusLabel(wo.status)}`} />{statusLine(wo)}</div> : null; }
    if (currentDrill.kind === "technician") {
      const tech = profileMap.get(currentDrill.technicianId); const todayAssignments = assignments.filter((assignment) => assignment.technician_id === currentDrill.technicianId && dateKeyFromIso(assignment.scheduled_start) === todayKey && !["removed", "declined"].includes(assignment.assignment_status ?? "")); const todayActual = timeEntries.filter((entry) => entry.technician_id === currentDrill.technicianId && dateKeyFromIso(entry.started_at) === todayKey);
      return <div><DrillRow title={tech?.full_name ?? tech?.email ?? "Technician"} subtitle="Available now" tone="success" /><h3 className="mt-5 text-sm font-black">Today's scheduled work</h3><div className="mt-2 space-y-2">{todayAssignments.length ? todayAssignments.map((assignment) => { const wo = workOrders.find((row) => row.id === assignment.work_order_id); return <DrillRow key={assignment.id} title={wo ? `${wo.work_order_number} · ${wo.title}` : "Work order"} subtitle={`${formatClock(assignment.scheduled_start)}–${formatClock(assignment.scheduled_end)}`} />; }) : <div className="text-xs text-muted-foreground">No scheduled assignments today.</div>}</div><h3 className="mt-5 text-sm font-black">Today's actual time</h3><div className="mt-2 space-y-2">{todayActual.length ? todayActual.map((entry) => { const wo = workOrders.find((row) => row.id === entry.work_order_id); return <DrillRow key={entry.id} title={wo ? `${wo.work_order_number} · ${wo.title}` : "Work order"} subtitle={`${statusLabel(entry.activity_type)} · ${formatClock(entry.started_at)}–${formatClock(entry.ended_at)}`} />; }) : <div className="text-xs text-muted-foreground">No actual time recorded today.</div>}</div></div>;
    }
    if (currentDrill.kind === "billing_work_order") {
      const wo = workOrders.find((row) => row.id === currentDrill.workOrderId); if (!wo) return null; const invoice = invoices.find((row) => row.work_order_id === wo.id && row.status !== "void");
      return <div><div className="grid gap-3 sm:grid-cols-2"><DrillRow title="Work order" subtitle={`${wo.work_order_number} · ${wo.title}`} /><DrillRow title="Billing status" subtitle={statusLabel(wo.billing_status)} tone={wo.billing_status === "review_required" ? "warning" : "success"} /><DrillRow title="Existing invoice" subtitle={invoice ? `${invoice.invoice_number} · ${statusLabel(invoice.status)}` : "No active invoice yet"} /><DrillRow title="Customer" subtitle={customerMap.get(wo.customer_id ?? "") ?? "Unknown customer"} /></div>{wo.billing_status === "review_required" ? <div className="mt-4"><DrillRow title="Review reason" subtitle={billingReviewReason(wo.id)} tone="warning" /><button type="button" onClick={() => pushDrill({ kind: "attention_work_order", category: "billing", workOrderId: wo.id })} className="mt-3 h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">Review Issue</button></div> : !invoice ? <div className="mt-5 flex justify-end"><button type="button" disabled={!canManageBilling} onClick={() => void createInvoice(wo.id)} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">Create Invoice</button></div> : null}{actionMessage ? <div className="mt-4 rounded-xl border border-border bg-muted/25 p-3 text-sm">{actionMessage}</div> : null}</div>;
    }
    if (currentDrill.kind === "revenue_group") {
      if (currentDrill.group === "revenue") return <div className="space-y-2">{weekPayments.map((payment) => { const invoice = invoices.find((row) => row.id === payment.invoice_id); return <DrillRow key={payment.id} title={invoice?.invoice_number ?? "Payment"} subtitle={`${statusLabel(payment.payment_method)} · ${payment.received_at ? new Date(payment.received_at).toLocaleString() : "—"}`} right={<span className="font-black text-emerald-600">{money(payment.amount)}</span>} />; })}</div>;
      if (currentDrill.group === "labour") return <div className="space-y-2">{timeEntries.filter((entry) => entry.ended_at && inCurrentWeek(entry.started_at, weekStart, weekEnd)).map((entry) => <DrillRow key={entry.id} title={profileMap.get(entry.technician_id)?.full_name ?? "Technician"} subtitle={`${workOrders.find((wo) => wo.id === entry.work_order_id)?.work_order_number ?? "WO"} · ${(timeEntryMinutes(entry) / 60).toFixed(2)} h @ ${money(entry.pay_rate)}/h`} right={<span className="font-black">{money((timeEntryMinutes(entry) / 60) * Number(entry.pay_rate ?? 0))}</span>} />)}</div>;
      return <div className="space-y-2">{materialUsages.filter((usage) => inCurrentWeek(usage.created_at, weekStart, weekEnd)).map((usage) => { const net = Math.max(0, Number(usage.quantity) - Number(usage.quantity_returned ?? 0)); return <DrillRow key={usage.id} title={usage.description} subtitle={`${workOrders.find((wo) => wo.id === usage.work_order_id)?.work_order_number ?? "WO"} · ${net} × ${money(usage.unit_cost)}`} right={<span className="font-black">{money(net * Number(usage.unit_cost))}</span>} />; })}</div>;
    }
    if (currentDrill.kind === "technician_detail") {
      const tech = technicianRanking.find((row) => row.technicianId === currentDrill.technicianId); const entries = timeEntries.filter((entry) => entry.technician_id === currentDrill.technicianId && entry.billable && entry.ended_at && inCurrentWeek(entry.started_at, weekStart, weekEnd));
      return <div><div className="grid gap-3 sm:grid-cols-2"><DrillRow title="Weekly billable hours" subtitle={`${tech?.hours.toFixed(2) ?? "0"} hours`} /><DrillRow title="Charged value" subtitle={money(tech?.billableValue ?? 0)} /></div><div className="mt-4 space-y-2">{entries.map((entry) => <DrillRow key={entry.id} title={week.find((day) => day.key === dateKeyFromIso(entry.started_at))?.label ?? dateKeyFromIso(entry.started_at)} subtitle={`${workOrders.find((wo) => wo.id === entry.work_order_id)?.work_order_number ?? "WO"} · ${(timeEntryMinutes(entry) / 60).toFixed(2)} h`} right={<span className="font-black">{money((timeEntryMinutes(entry) / 60) * Number(entry.billing_rate ?? 0))}</span>} />)}</div></div>;
    }
    if (currentDrill.kind === "payment_mode") { const rows = weekPayments.filter((payment) => paymentMode(payment.payment_method) === currentDrill.mode); return <div className="space-y-2">{rows.map((payment) => { const invoice = invoices.find((row) => row.id === payment.invoice_id); return <DrillRow key={payment.id} title={invoice?.invoice_number ?? "Payment"} subtitle={`${statusLabel(payment.payment_method)} · ${payment.received_at ? new Date(payment.received_at).toLocaleString() : "—"}${payment.reference ? ` · Ref ${payment.reference}` : ""}`} right={<span className="font-black">{money(payment.amount)}</span>} />; })}</div>; }
    if (currentDrill.kind === "inventory_value_day") { const rows = inventoryTransactions.filter((tx) => dateKeyFromIso(tx.created_at) === currentDrill.dayKey); return <div className="space-y-2">{rows.map((tx, index) => { const item = itemMap.get(tx.inventory_item_id), location = tx.location_id ? locationMap.get(tx.location_id) : null; const value = Math.abs(Number(tx.quantity ?? 0)) * Number(tx.unit_cost ?? item?.unit_cost ?? 0); return <DrillRow key={`${tx.inventory_item_id}-${index}`} title={item?.name ?? "Inventory item"} subtitle={`${location?.name ?? "No location"} · ${statusLabel(tx.transaction_type)} · Qty ${Number(tx.quantity ?? 0)}`} right={<span className="font-black">{money(value)}</span>} />; })}</div>; }
    if (currentDrill.kind === "inventory_item_day") { const ids: string[] = [...new Set<string>(inventoryTransactions.filter((tx) => dateKeyFromIso(tx.created_at) === currentDrill.dayKey).map((tx) => tx.inventory_item_id))]; return <div className="space-y-2">{ids.map((id) => { const item = itemMap.get(id), rows = inventoryTransactions.filter((tx) => tx.inventory_item_id === id && dateKeyFromIso(tx.created_at) === currentDrill.dayKey); return <DrillRow key={id} title={item?.name ?? "Inventory item"} subtitle={`${rows.length} movement${rows.length === 1 ? "" : "s"} · Net qty ${rows.reduce((sum, tx) => sum + Number(tx.quantity ?? 0), 0)}`} />; })}</div>; }
    if (currentDrill.kind === "pipeline_stage") { const rows = workOrders.filter((wo) => currentDrill.statuses.includes(wo.status)); return <div className="space-y-2">{rows.map((wo) => <DrillRow key={wo.id} title={`${wo.work_order_number} · ${wo.title}`} subtitle={`${customerMap.get(wo.customer_id ?? "") ?? "Customer"} · ${statusLabel(wo.status)}`} />)}</div>; }
    return null;
  }

  const manualRefresh = useCallback(async () => { if (refreshing) return; setRefreshing(true); try { await loadDashboard(); } finally { setRefreshing(false); } }, [loadDashboard, refreshing]);

  if (authRequired) return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6"><h1 className="text-2xl font-black">Sign in required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to view the live operations dashboard.</p></div></main>;

  const unassignedUrgent = todaysUnassignedJobs.filter((wo) => ["urgent", "emergency"].includes(wo.priority ?? "")).length;
  const inventoryAccent = outPositions.length > 0 ? "danger" as const : lowPositions.length > 0 ? "warning" as const : "success" as const;
  const attentionAccent = urgentOrders.length || billingReviewOrders.length || outPositions.length ? "danger" as const : overdueInvoices.length ? "warning" as const : "success" as const;

  return <main className="min-h-screen bg-background text-foreground">
    <div className="grid min-h-screen grid-cols-[236px_minmax(0,1fr)]">
      <FieldOpsSidebar />
      <section className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur"><div><div className="text-xs font-black uppercase tracking-[0.18em] text-primary">Operations</div><div className="text-sm font-semibold">FieldOps Dashboard</div></div><div className="flex items-center gap-2"><div className="hidden text-right md:block"><div className="text-[10px] font-black uppercase text-muted-foreground">Last updated</div><div className="text-xs font-semibold">{lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "—"}</div></div><button type="button" onClick={() => void manualRefresh()} disabled={refreshing} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing..." : "Refresh"}</button><FieldOpsThemeToggle /><button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background"><Bell className="h-4 w-4" /></button></div></header>
        <div className="p-5 lg:p-6">
          <div className="mb-5"><h1 className="text-3xl font-black tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Every number can be opened and traced to the underlying work, invoice, technician, payment or inventory position.</p></div>
          {error ? <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{error}</div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <SummaryCard label="Today's Unassigned Jobs" value={loading ? "—" : todaysUnassignedJobs.length} helper={todaysUnassignedJobs.length ? `${unassignedUrgent} urgent/emergency need assignment` : "Every job today has an assignment"} detailHint="View jobs → assign technician" icon={ClipboardList} onClick={() => openModal("today_unassigned")} accent={unassignedUrgent ? "danger" : todaysUnassignedJobs.length ? "warning" : "success"} />
            <SummaryCard label="Assigned Work Orders" value={loading ? "—" : assignedWorkOrders.length} helper="Jobs currently owned by a technician" detailHint="View jobs → status timeline" icon={Truck} onClick={() => openModal("assigned_work_orders")} />
            <SummaryCard label="Available Techs" value={loading ? "—" : availableTechs.length} helper={`${busyTechnicianIds.size} technicians currently busy`} detailHint="View technicians → today's work" icon={Users} onClick={() => openModal("available_techs")} accent={availableTechs.length ? "success" : "danger"} />
            <SummaryCard label="Billing Ready" value={loading ? "—" : billingReadyOrders.length} helper={billingReviewOrders.length ? `${billingReviewOrders.length} additionally require review` : "Ready for billing action"} detailHint="View work → billing action" icon={ReceiptText} onClick={() => openModal("billing_ready")} accent={billingReviewOrders.length ? "warning" : billingReadyOrders.length ? "default" : "success"} />
            <SummaryCard label="Attention Required" value={loading ? "—" : attentionCount} helper={`${attentionCount} issues across ${attentionCategoryCount} active categories`} detailHint="View categories → issue → action" icon={AlertTriangle} onClick={() => openModal("attention")} accent={attentionAccent} />
            <SummaryCard label="Partial Payment Pending" value={loading ? "—" : money(partialRemaining)} helper={`${partialInvoices.length} partially paid invoice${partialInvoices.length === 1 ? "" : "s"}`} detailHint="View invoices → record payment" icon={WalletCards} onClick={() => openModal("partial_payments")} accent={partialInvoices.length ? "warning" : "success"} />
            <SummaryCard label="Revenue vs Expenses" value={loading ? "—" : money(weeklyNet)} helper={`Revenue ${money(weeklyRevenue)} · direct costs ${money(weeklyExpenses)}`} detailHint="View figure → source records" icon={DollarSign} onClick={() => openModal("revenue_expenses")} accent={weeklyNet >= 0 ? "success" : "danger"} />
            <SummaryCard label="Best Technician" value={loading ? "—" : bestTechnician?.name ?? "No data"} helper={bestTechnician ? `${bestTechnician.hours.toFixed(1)} billable hours this week` : "No billable hours this week"} detailHint="View Mon–Sun chart → technician" icon={Users} onClick={() => openModal("best_technician")} accent={bestTechnician ? "success" : "default"} />
            <SummaryCard label="Inventory Alerts" value={loading ? "—" : outLocations.length} helper={`${outPositions.length} zero-stock item/location positions · ${lowPositions.length} low-stock`} detailHint="View locations → items → replenish" icon={Package} onClick={() => openModal("inventory_alerts")} accent={inventoryAccent} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between"><div><h2 className="font-black">Payment Mix</h2><p className="mt-1 text-[11px] text-muted-foreground">Current week · exact amount and percentage.</p></div><button type="button" onClick={() => openModal("payment_mix")} className="rounded-lg px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/10">View details</button></div><PaymentDonut modes={paymentModes} /></section>
            <section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between"><div><h2 className="font-black">Inventory Value Movement</h2><p className="mt-1 text-[11px] text-muted-foreground">Current week · dollar value in/out.</p></div><button type="button" onClick={() => openModal("inventory_value")} className="rounded-lg px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/10">View details</button></div><WeeklyLineChart points={weeklyInventoryValue} /></section>
            <section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between"><div><h2 className="font-black">Inventory Item Activity</h2><p className="mt-1 text-[11px] text-muted-foreground">Current week · distinct SKU activity.</p></div><button type="button" onClick={() => openModal("inventory_items")} className="rounded-lg px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/10">View details</button></div><div className="mt-4 grid grid-cols-7 gap-2">{weeklyInventoryItems.map((day) => <div key={day.key} className="rounded-xl border border-border p-2 text-center"><div className="text-[10px] font-black">{day.label}</div><div className="mt-2 text-xl font-black">{day.inbound + day.outbound}</div><div className="text-[8px] text-muted-foreground">moves</div></div>)}</div></section>
          </div>

          <section className="mt-5 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><div><h2 className="font-black">Work Order Pipeline</h2><p className="mt-1 text-[11px] text-muted-foreground">Open a stage to see the exact work orders behind the count.</p></div><button type="button" onClick={() => openModal("pipeline")} className="rounded-lg px-2 py-1 text-xs font-black text-primary hover:bg-primary/10">View details</button></div><div className="mt-4 grid gap-3 md:grid-cols-5">{pipelineGroups.map((group) => <div key={group.label} className="rounded-xl border border-border bg-muted/20 p-3"><div className="text-[10px] font-bold text-muted-foreground">{group.label}</div><div className="mt-1 text-2xl font-black">{group.count}</div></div>)}</div></section>
        </div>
      </section>
    </div>

    {modalKey ? <DashboardModal title={modalTitle()} description={modalDescription()} wide={["assigned_work_orders", "best_technician", "payment_mix", "inventory_value", "inventory_items", "today_unassigned"].includes(modalKey) || currentDrill.kind !== "root"} onBack={drillPath.length > 1 ? popDrill : undefined} onClose={() => { setModalKey(null); setDrillPath([{ kind: "root" }]); }}>{actionMessage && currentDrill.kind === "root" ? <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">{actionMessage}</div> : null}{renderDrill()}</DashboardModal> : null}

    {assignmentDraft ? <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/55" onClick={() => setAssignmentDraft(null)} /><section className="relative z-10 max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl"><div className="flex justify-between gap-4"><div><div className="text-xs font-black uppercase text-primary">Assign Technician</div><h2 className="mt-1 text-xl font-black">{assignmentDraft.workOrder.work_order_number} · {assignmentDraft.workOrder.title}</h2><p className="mt-1 text-xs text-muted-foreground">Choose an available technician for the selected time window.</p></div><button type="button" onClick={() => setAssignmentDraft(null)} className="h-9 w-9 rounded-xl border border-border"><X className="mx-auto h-4 w-4" /></button></div><div className="mt-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="space-y-3"><label className="block text-xs font-black">Start<input type="datetime-local" value={assignmentDraft.start} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, start: event.target.value, error: null })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label><label className="block text-xs font-black">End<input type="datetime-local" value={assignmentDraft.end} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, end: event.target.value, error: null })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label>{assignmentDraft.error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">{assignmentDraft.error}</div> : null}<button type="button" disabled={savingAssignment || !assignmentDraft.technicianId} onClick={() => void confirmAssignment()} className="h-10 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground disabled:opacity-50">{savingAssignment ? "Assigning…" : "Confirm Assignment"}</button></div><div className="grid gap-2 sm:grid-cols-2">{activeTechnicians.map((tech) => { const start = new Date(assignmentDraft.start), end = new Date(assignmentDraft.end); const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start; const available = valid && technicianAvailability(tech.id, start, end, assignmentDraft.workOrder.id); return <button type="button" key={tech.id} onClick={() => setAssignmentDraft({ ...assignmentDraft, technicianId: tech.id, error: null })} className={`rounded-xl border p-3 text-left ${assignmentDraft.technicianId === tech.id ? "border-primary bg-primary/10" : "border-border"}`}><div className="font-black">{tech.full_name ?? tech.email}</div><div className={`mt-1 text-[10px] font-black ${available ? "text-emerald-600" : "text-rose-600"}`}>{available ? "AVAILABLE FOR THIS JOB" : "TIME CONFLICT"}</div></button>; })}</div></div></section></div> : null}

    {paymentDraft ? <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/55" onClick={() => setPaymentDraft(null)} /><section className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl"><h3 className="text-lg font-black">Record Payment · {paymentDraft.invoice.invoice_number}</h3><p className="mt-1 text-xs text-muted-foreground">Balance due: {money(paymentDraft.invoice.balance_due)}</p><label className="mt-4 block text-xs font-black">Amount<input value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value, error: null })} inputMode="decimal" className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label><label className="mt-3 block text-xs font-black">Method<select value={paymentDraft.method} onChange={(event) => setPaymentDraft({ ...paymentDraft, method: event.target.value as "cash" | "tap" })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal"><option value="cash">Cash</option><option value="tap">Tap</option></select></label><label className="mt-3 block text-xs font-black">Reference<input value={paymentDraft.reference} onChange={(event) => setPaymentDraft({ ...paymentDraft, reference: event.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label>{paymentDraft.error ? <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">{paymentDraft.error}</div> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPaymentDraft(null)} className="h-10 rounded-xl border border-border px-4 text-sm font-bold">Cancel</button><button type="button" disabled={savingPayment} onClick={() => void savePayment()} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">{savingPayment ? "Saving…" : "Record Payment"}</button></div></section></div> : null}

    {poDraft ? <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/55" onClick={() => setPODraft(null)} /><section className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl">{(() => { const item = itemMap.get(poDraft.itemId), location = locationMap.get(poDraft.locationId); return <><div className="text-xs font-black uppercase text-primary">Create Purchase Order</div><h3 className="mt-1 text-lg font-black">{item?.name ?? "Inventory item"}</h3><p className="mt-1 text-xs text-muted-foreground">Replenish {location?.name ?? "location"}. Configured reorder quantity: {Number(item?.reorder_quantity ?? 0)}.</p><label className="mt-4 block text-xs font-black">Supplier<select value={poDraft.supplierId} onChange={(event) => setPODraft({ ...poDraft, supplierId: event.target.value, error: null })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal"><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-xs font-black">Quantity<input value={poDraft.quantity} onChange={(event) => setPODraft({ ...poDraft, quantity: event.target.value, error: null })} inputMode="decimal" className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label><label className="block text-xs font-black">Unit cost<input value={poDraft.unitCost} onChange={(event) => setPODraft({ ...poDraft, unitCost: event.target.value, error: null })} inputMode="decimal" className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label></div><label className="mt-3 block text-xs font-black">Expected date<input type="date" value={poDraft.expectedDate} onChange={(event) => setPODraft({ ...poDraft, expectedDate: event.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 font-normal" /></label>{poDraft.error ? <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">{poDraft.error}</div> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPODraft(null)} className="h-10 rounded-xl border border-border px-4 text-sm font-bold">Cancel</button><button type="button" disabled={savingPO} onClick={() => void createPO()} className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50">{savingPO ? "Creating…" : "Create Draft PO"}</button></div></>; })()}</section></div> : null}
  </main>;
}
