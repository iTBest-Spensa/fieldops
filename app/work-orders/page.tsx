"use client";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Filter,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";
import { createClient } from "@/lib/supabase/client";

import type { AssignTechnicianForm, DbAssignment, DbCustomer, DbEvent, DbInventoryItem, DbInventoryLocation, DbInventoryTransaction, DbMaterialUsage, DbNote, DbProfile, DbRateDefaults, DbRole, DbSite, DbTimeCorrection, DbTimeEntry, DbWorkOrder, EditWorkOrderForm, NewWorkOrderForm, ServerAvailability, SummaryView, TimeEditorForm, WorkOrderOverrun, WorkOrderStatus } from "./types";
import { emptyNewWorkOrderForm, priorities, workOrderStatuses } from "./constants";
import { billingStatusLabel, combineLocalDateAndTime, dateInputFromIso, dateTimeLocalInputFromIso, formatCompactDateTime, formatDateInput, formatLocalDateTime, formatLocalDateTime24, formatTime24, intervalsOverlap, isTerminalWorkOrderStatus, localDateTime, minutesLabel, priorityTone, safeDurationMinutes, statusLabel, statusTone, timeInputFromIso, varianceLabel } from "./utils";
import { SummaryCard } from "./components/summary-card";
import { ActionNotice } from "./components/action-notice";
import { SummaryModal } from "./components/modals/summary-modal";
import { WorkOrderDetailModal } from "./components/modals/work-order-detail-modal";
import { AssignTechnicianModal } from "./components/modals/assign-technician-modal";
import { TechnicianTimeModal } from "./components/modals/technician-time-modal";
import { BillingRecoveryModal } from "./components/modals/billing-recovery-modal";
import { NewWorkOrderModal } from "./components/modals/new-work-order-modal";
import { WorkOrderMaterialModal, WorkOrderMaterialReturnModal, materialStockKey, type AddMaterialForm, type MaterialStockBalances, type ReturnMaterialForm, type WorkOrderMaterialUsage } from "@/components/work-order-material-modal";

export default function WorkOrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<DbWorkOrder[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [assignments, setAssignments] = useState<DbAssignment[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [timeEntries, setTimeEntries] = useState<DbTimeEntry[]>([]);
  const [inventoryItems, setInventoryItems] = useState<DbInventoryItem[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<DbInventoryLocation[]>([]);
  const [materialUsages, setMaterialUsages] = useState<DbMaterialUsage[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<DbInventoryTransaction[]>([]);
  const [rateDefaults, setRateDefaults] = useState<DbRateDefaults>({ default_customer_billing_rate: 0, default_technician_pay_rate: 0 });
  const [localNowMs, setLocalNowMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [summaryView, setSummaryView] = useState<SummaryView | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "activity" | "notes">("overview");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditWorkOrderForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignTechnicianForm>({
    technicianId: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [notes, setNotes] = useState<DbNote[]>([]);
  const [timeCorrections, setTimeCorrections] = useState<DbTimeCorrection[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<WorkOrderStatus>("requested");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "customer">("internal");
  const [savingNote, setSavingNote] = useState(false);

  const [newWorkOrderOpen, setNewWorkOrderOpen] = useState(false);
  const [newWorkOrderForm, setNewWorkOrderForm] =
    useState<NewWorkOrderForm>(emptyNewWorkOrderForm);
  const [newWorkOrderError, setNewWorkOrderError] = useState<string | null>(null);
  const [savingWorkOrder, setSavingWorkOrder] = useState(false);
  const [localToday, setLocalToday] = useState("");

  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [timeEditorForm, setTimeEditorForm] = useState<TimeEditorForm>({
    technicianId: "",
    startedAt: "",
    endedAt: "",
    activityType: "work",
    billable: true,
    billingRate: "",
    payRate: "",
    reason: "",
  });
  const [savingTimeEditor, setSavingTimeEditor] = useState(false);
  const [timeEditorError, setTimeEditorError] = useState<string | null>(null);

  const [billingRecoveryOpen, setBillingRecoveryOpen] = useState(false);
  const [billingRecoveryReason, setBillingRecoveryReason] = useState("");
  const [savingBillingRecovery, setSavingBillingRecovery] = useState(false);
  const [billingRecoveryError, setBillingRecoveryError] = useState<string | null>(null);

  const emptyMaterialForm: AddMaterialForm = { locationId: "", selectedItems: [], activeInventoryItemId: "", notes: "" };
  const emptyMaterialReturnForm: ReturnMaterialForm = { locationId: "", quantity: "1", reason: "" };
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState<AddMaterialForm>(emptyMaterialForm);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [returnMaterialOpen, setReturnMaterialOpen] = useState(false);
  const [returnMaterialUsage, setReturnMaterialUsage] = useState<DbMaterialUsage | null>(null);
  const [returnMaterialForm, setReturnMaterialForm] = useState<ReturnMaterialForm>(emptyMaterialReturnForm);
  const [returnMaterialError, setReturnMaterialError] = useState<string | null>(null);
  const [savingMaterialReturn, setSavingMaterialReturn] = useState(false);

  const [serverAvailability, setServerAvailability] = useState<
    Map<string, ServerAvailability>
  >(new Map());
  const [serverAvailabilityLoading, setServerAvailabilityLoading] =
    useState(false);
  const [serverAvailabilityError, setServerAvailabilityError] =
    useState<string | null>(null);

  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!actionNotice) return;

    const timer = window.setTimeout(() => {
      setActionNotice(null);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  function showActionNotice(
    type: "success" | "error" | "info",
    message: string
  ) {
    setActionNotice({ type, message });
  }

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const siteMap = useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites]
  );

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const materialStockBalances = useMemo<MaterialStockBalances>(() => {
    const balances: MaterialStockBalances = {};
    for (const transaction of inventoryTransactions) {
      if (!transaction.location_id) continue;
      const key = materialStockKey(transaction.location_id, transaction.inventory_item_id);
      balances[key] = Number(balances[key] ?? 0) + Number(transaction.quantity ?? 0);
    }
    return balances;
  }, [inventoryTransactions]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, DbAssignment[]>();
    assignments.forEach((assignment) => {
      const existing = map.get(assignment.work_order_id) ?? [];
      existing.push(assignment);
      map.set(assignment.work_order_id, existing);
    });
    return map;
  }, [assignments]);

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  function restoreWorkOrdersReturnState() {
    try {
      const raw = window.sessionStorage.getItem(
        "fieldops:work-orders-return"
      );

      if (!raw) return;

      const saved = JSON.parse(raw) as {
        selectedOrderId?: string | null;
        summaryView?: SummaryView | null;
        detailTab?: "overview" | "activity" | "notes";
        savedAt?: number;
      };

      if (
        saved.savedAt &&
        Date.now() - saved.savedAt > 30 * 60 * 1000
      ) {
        window.sessionStorage.removeItem(
          "fieldops:work-orders-return"
        );
        return;
      }

      if (saved.summaryView) {
        setSummaryView(saved.summaryView);
      }

      if (saved.selectedOrderId) {
        setSelectedOrderId(saved.selectedOrderId);
      }

      if (saved.detailTab) {
        setDetailTab(saved.detailTab);
      }

      setEditMode(false);
      setAssignOpen(false);

      window.sessionStorage.removeItem(
        "fieldops:work-orders-return"
      );
    } catch {
      // Ignore unavailable or malformed session storage.
    }
  }

  const selectedOrderAllAssignments = selectedOrder
    ? assignmentMap.get(selectedOrder.id) ?? []
    : [];

  const selectedOrderAssignments = selectedOrderAllAssignments
    .filter(
      (assignment) =>
        assignment.assignment_role === "primary" &&
        ["assigned", "accepted"].includes(
          assignment.assignment_status
        ) &&
        !assignment.released_at
    )
    .sort((a, b) => {
      const aTime = a.assigned_at
        ? new Date(a.assigned_at).getTime()
        : 0;
      const bTime = b.assigned_at
        ? new Date(b.assigned_at).getTime()
        : 0;
      return bTime - aTime;
    });

  // The current primary assignment is the only normal assignment shown
  // on an active Work Order. Older technicians belong to audit/history.
  const selectedOrderPrimaryAssignment =
    selectedOrderAssignments[0] ?? null;

  // For terminal work orders only, keep the latest completed/released primary
  // technician available as the final technician who owned the job.
  const selectedOrderLatestHistoricalPrimaryAssignment =
    [...selectedOrderAllAssignments]
      .filter(
        (assignment) =>
          assignment.assignment_role === "primary" &&
          ["assigned", "accepted", "completed"].includes(
            assignment.assignment_status
          )
      )
      .sort((a, b) => {
        const aTime = a.assigned_at
          ? new Date(a.assigned_at).getTime()
          : 0;
        const bTime = b.assigned_at
          ? new Date(b.assigned_at).getTime()
          : 0;
        return bTime - aTime;
      })[0] ?? null;

  const selectedOrderDisplayAssignment =
    selectedOrderPrimaryAssignment ??
    (
      selectedOrder &&
      isTerminalWorkOrderStatus(selectedOrder.status)
        ? selectedOrderLatestHistoricalPrimaryAssignment
        : null
    );

  const selectedOrderDisplayAssignments =
    selectedOrderDisplayAssignment
      ? [selectedOrderDisplayAssignment]
      : [];

  const selectedOrderIsAssigned =
    selectedOrderDisplayAssignment !== null;

  const selectedOrderDispatchDate =
    selectedOrderDisplayAssignment?.scheduled_start ??
    selectedOrder?.scheduled_start ??
    null;

  const selectedOrderDispatchHref = selectedOrder
    ? `/dispatch?focus=${encodeURIComponent(selectedOrder.id)}${
        selectedOrderDispatchDate
          ? `&date=${encodeURIComponent(
              formatDateInput(new Date(selectedOrderDispatchDate))
            )}`
          : ""
      }${
        selectedOrderDisplayAssignment?.technician_id
          ? `&tech=${encodeURIComponent(
              selectedOrderDisplayAssignment.technician_id
            )}`
          : ""
      }${
        selectedOrderDisplayAssignment?.id
          ? `&assignment=${encodeURIComponent(
              selectedOrderDisplayAssignment.id
            )}`
          : ""
      }`
    : "/";

  const selectedOrderTimeEntries = selectedOrder
    ? timeEntries.filter((entry) => entry.work_order_id === selectedOrder.id)
    : [];

  const selectedOrderMaterialUsages = selectedOrder
    ? materialUsages.filter((usage) => usage.work_order_id === selectedOrder.id)
    : [];

  const editingTimeEntry = editingTimeEntryId
    ? selectedOrderTimeEntries.find(
        (entry) => entry.id === editingTimeEntryId
      ) ?? null
    : null;

  const timeEditorAssignment =
    selectedOrderAssignments.find(
      (assignment) =>
        assignment.technician_id === timeEditorForm.technicianId
    ) ??
    selectedOrderPrimaryAssignment ??
    null;

  const timeEditorPlannedStartIso =
    timeEditorAssignment?.scheduled_start ??
    selectedOrder?.scheduled_start ??
    null;

  const timeEditorPlannedEndIso =
    timeEditorAssignment?.scheduled_end ??
    selectedOrder?.scheduled_end ??
    null;

  const timeEditorPlannedMinutes = safeDurationMinutes(
    timeEditorPlannedStartIso,
    timeEditorPlannedEndIso
  );

  const timeEditorRecordedMinutes = editingTimeEntry
    ? safeDurationMinutes(
        editingTimeEntry.started_at,
        editingTimeEntry.ended_at
      )
    : null;

  const timeEditorActualMinutes = safeDurationMinutes(
    timeEditorForm.startedAt,
    timeEditorForm.endedAt
  );

  const timeEditorVariance = varianceLabel(
    timeEditorActualMinutes,
    timeEditorPlannedMinutes
  );

  const timeEditorAvailabilityStart =
    timeEditorPlannedStartIso
      ? new Date(timeEditorPlannedStartIso)
      : null;

  const timeEditorAvailabilityEnd =
    timeEditorPlannedEndIso
      ? new Date(timeEditorPlannedEndIso)
      : null;

  const assignAvailabilityStart =
    assignForm?.date && assignForm?.startTime
      ? combineLocalDateAndTime(
          assignForm.date,
          assignForm.startTime
        )
      : null;

  const assignAvailabilityEnd =
    assignForm?.date && assignForm?.endTime
      ? combineLocalDateAndTime(
          assignForm.date,
          assignForm.endTime
        )
      : null;

  const timeEditorAvailabilityStartKey =
    timeEditorPlannedStartIso ?? "";

  const timeEditorAvailabilityEndKey =
    timeEditorPlannedEndIso ?? "";

  const assignAvailabilityStartKey =
    assignForm?.date && assignForm?.startTime
      ? `${assignForm.date}T${assignForm.startTime}`
      : "";

  const assignAvailabilityEndKey =
    assignForm?.date && assignForm?.endTime
      ? `${assignForm.date}T${assignForm.endTime}`
      : "";

  const currentUserRoles = useMemo(
    () =>
      new Set(
        roles
          .filter((role) => role.user_id === currentUserId)
          .map((role) => role.role)
      ),
    [roles, currentUserId]
  );

  const isAdmin = currentUserRoles.has("admin");
  const canCorrectTime =
    isAdmin || currentUserRoles.has("manager");
  const canRecoverBilling =
    isAdmin ||
    currentUserRoles.has("manager") ||
    currentUserRoles.has("billing");
  const canManageMaterials =
    isAdmin ||
    currentUserRoles.has("manager") ||
    currentUserRoles.has("dispatcher") ||
    currentUserRoles.has("technician") ||
    currentUserRoles.has("inventory") ||
    currentUserRoles.has("billing");

  function technicianAvailabilityForWindow(
    technicianId: string,
    start: Date | null,
    end: Date | null,
    excludeWorkOrderId?: string | null
  ) {
    if (
      !start ||
      !end ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return {
        available: true,
        label: "Available time unavailable",
        freeWindows: [] as Array<{
          start: Date;
          end: Date;
        }>,
      };
    }

    // Availability is shown for the same normal Dispatch day:
    // 07:00 through 17:00 on the work-order scheduled date.
    const dayStart = new Date(start);
    dayStart.setHours(7, 0, 0, 0);

    const dayEnd = new Date(start);
    dayEnd.setHours(17, 0, 0, 0);

    const blocked: Array<{
      start: Date;
      end: Date;
    }> = [];

    for (const assignment of assignments) {
      if (assignment.technician_id !== technicianId) {
        continue;
      }

      if (
        excludeWorkOrderId &&
        assignment.work_order_id === excludeWorkOrderId
      ) {
        continue;
      }

      if (
        ["removed", "declined"].includes(
          assignment.assignment_status
        )
      ) {
        continue;
      }

      if (
        !assignment.scheduled_start ||
        !assignment.scheduled_end
      ) {
        continue;
      }

      const assignmentStart = new Date(
        assignment.scheduled_start
      );
      const assignmentEnd = new Date(
        assignment.scheduled_end
      );

      if (
        !intervalsOverlap(
          dayStart,
          dayEnd,
          assignmentStart,
          assignmentEnd
        )
      ) {
        continue;
      }

      blocked.push({
        start:
          assignmentStart < dayStart
            ? dayStart
            : assignmentStart,
        end:
          assignmentEnd > dayEnd
            ? dayEnd
            : assignmentEnd,
      });
    }

    for (const entry of timeEntries) {
      if (entry.technician_id !== technicianId) {
        continue;
      }

      if (
        excludeWorkOrderId &&
        entry.work_order_id === excludeWorkOrderId
      ) {
        continue;
      }

      const actualStart = new Date(entry.started_at);
      const actualEnd = entry.ended_at
        ? new Date(entry.ended_at)
        : dayEnd;

      if (
        !intervalsOverlap(
          dayStart,
          dayEnd,
          actualStart,
          actualEnd
        )
      ) {
        continue;
      }

      blocked.push({
        start:
          actualStart < dayStart
            ? dayStart
            : actualStart,
        end:
          actualEnd > dayEnd
            ? dayEnd
            : actualEnd,
      });
    }

    // Merge all scheduled/actual occupied periods so duplicated planned +
    // actual records do not split the same occupied window twice.
    const mergedBlocked = blocked
      .sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime()
      )
      .reduce<
        Array<{
          start: Date;
          end: Date;
        }>
      >((merged, current) => {
        const previous = merged.at(-1);

        if (
          !previous ||
          current.start > previous.end
        ) {
          merged.push({
            start: new Date(current.start),
            end: new Date(current.end),
          });
          return merged;
        }

        if (current.end > previous.end) {
          previous.end = new Date(current.end);
        }

        return merged;
      }, []);

    const freeWindows: Array<{
      start: Date;
      end: Date;
    }> = [];

    let cursor = new Date(dayStart);

    for (const occupied of mergedBlocked) {
      if (occupied.start > cursor) {
        freeWindows.push({
          start: new Date(cursor),
          end: new Date(occupied.start),
        });
      }

      if (occupied.end > cursor) {
        cursor = new Date(occupied.end);
      }
    }

    if (cursor < dayEnd) {
      freeWindows.push({
        start: new Date(cursor),
        end: new Date(dayEnd),
      });
    }

    const requestedFits = freeWindows.some(
      (window) =>
        start >= window.start &&
        end <= window.end
    );

    const label =
      freeWindows.length === 0
        ? "Available: none"
        : `Available ${freeWindows
            .map(
              (window) =>
                `${formatTime24(
                  window.start
                )}–${formatTime24(window.end)}`
            )
            .join(", ")}`;

    return {
      available: requestedFits,
      label,
      freeWindows,
    };
  }

  const technicianIds = useMemo(
    () =>
      new Set(
        roles
          .filter((role) => role.role === "technician")
          .map((role) => role.user_id)
      ),
    [roles]
  );

  const technicians = useMemo(
    () =>
      profiles
        .filter((profile) => technicianIds.has(profile.id))
        .sort((a, b) =>
          (a.full_name ?? a.email ?? "").localeCompare(
            b.full_name ?? b.email ?? ""
          )
        ),
    [profiles, technicianIds]
  );

  const summaryOrders = useMemo(() => {
    if (!summaryView) return [];

    if (summaryView === "requested") {
      return orders.filter((order) => order.status === "requested");
    }

    if (summaryView === "today") {
      if (!localToday) return [];
      return orders.filter(
        (order) =>
          order.scheduled_start &&
          formatDateInput(new Date(order.scheduled_start)) === localToday
      );
    }

    if (summaryView === "progress") {
      return orders.filter((order) =>
        ["travelling", "on_site", "working", "waiting"].includes(order.status)
      );
    }

    if (summaryView === "dispatch") {
      return orders.filter((order) => {
        if (["closed", "cancelled"].includes(order.status)) return false;

        const activeAssignments = (assignmentMap.get(order.id) ?? []).filter(
          (assignment) => assignment.assignment_status !== "removed"
        );

        return activeAssignments.length === 0;
      });
    }

    if (summaryView === "billing") {
      return orders.filter((order) => order.status === "billing_ready");
    }

    if (summaryView === "closed") {
      return orders.filter((order) => order.status === "closed");
    }

    return [];
  }, [summaryView, orders, localToday]);

  const loadOrders = useCallback(async () => {
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    setAuthRequired(false);
    setCurrentUserId(authData.user.id);
    setLoading(true);

    const [
      ordersResult,
      customersResult,
      sitesResult,
      assignmentsResult,
      profilesResult,
      rolesResult,
      timeEntriesResult,
      inventoryItemsResult,
      inventoryLocationsResult,
      materialUsagesResult,
      inventoryTransactionsResult,
      rateDefaultsResult,
    ] = await Promise.all([
      supabase.from("work_orders").select("*").order("requested_at", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
      supabase
        .from("sites")
        .select("id,customer_id,name,address1,city,province_state")
        .order("name"),
      supabase.from("work_order_assignments").select("*"),
      supabase.from("profiles").select("id,full_name,email").eq("active", true),
      supabase.from("user_roles").select("user_id,role"),
      supabase
        .from("time_entries")
        .select("id,work_order_id,technician_id,assignment_id,started_at,ended_at,duration_minutes,activity_type,billable,billing_rate,pay_rate,approval_status,ended_reason")
        .order("started_at", { ascending: false }),
      supabase.from("inventory_items").select("id,name,sku,unit,unit_cost,unit_price,track_stock,active").eq("active", true).order("name"),
      supabase.from("inventory_locations").select("id,name,location_type,active").eq("active", true).order("name"),
      supabase.from("material_usage").select("id,work_order_id,inventory_item_id,description,quantity,quantity_returned,unit_cost,unit_price,billable,recorded_by,created_at").order("created_at", { ascending: false }),
      supabase.from("inventory_transactions").select("inventory_item_id,location_id,quantity"),
      supabase.from("fieldops_settings").select("default_customer_billing_rate,default_technician_pay_rate").eq("id", 1).maybeSingle(),
    ]);

    const firstError =
      ordersResult.error ??
      customersResult.error ??
      sitesResult.error ??
      assignmentsResult.error ??
      profilesResult.error ??
      rolesResult.error ??
      timeEntriesResult.error ??
      inventoryItemsResult.error ??
      inventoryLocationsResult.error ??
      materialUsagesResult.error ??
      inventoryTransactionsResult.error ??
      rateDefaultsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setOrders((ordersResult.data ?? []) as DbWorkOrder[]);
    setCustomers((customersResult.data ?? []) as DbCustomer[]);
    setSites((sitesResult.data ?? []) as DbSite[]);
    setAssignments((assignmentsResult.data ?? []) as DbAssignment[]);
    setProfiles((profilesResult.data ?? []) as DbProfile[]);
    setRoles((rolesResult.data ?? []) as DbRole[]);
    setTimeEntries((timeEntriesResult.data ?? []) as DbTimeEntry[]);
    setInventoryItems((inventoryItemsResult.data ?? []) as DbInventoryItem[]);
    setInventoryLocations((inventoryLocationsResult.data ?? []) as DbInventoryLocation[]);
    setMaterialUsages((materialUsagesResult.data ?? []) as DbMaterialUsage[]);
    setInventoryTransactions((inventoryTransactionsResult.data ?? []) as DbInventoryTransaction[]);
    setRateDefaults((rateDefaultsResult.data ?? { default_customer_billing_rate: 0, default_technician_pay_rate: 0 }) as DbRateDefaults);
    setLoading(false);
  }, [supabase]);

  const loadDetails = useCallback(
    async (workOrderId: string) => {
      setDetailsLoading(true);

      const [eventsResult, notesResult, correctionsResult] = await Promise.all([
        supabase
          .from("work_order_events")
          .select("id,work_order_id,event_type,old_status,new_status,details,created_at")
          .eq("work_order_id", workOrderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("work_order_notes")
          .select("id,work_order_id,note,visibility,created_by,created_at")
          .eq("work_order_id", workOrderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("time_entry_corrections")
          .select("id,time_entry_id,work_order_id,technician_id,operation,original_values,corrected_values,reason,corrected_by,corrected_at")
          .eq("work_order_id", workOrderId)
          .order("corrected_at", { ascending: false }),
      ]);

      if (eventsResult.error || notesResult.error || correctionsResult.error) {
        setStatusError(eventsResult.error?.message ?? notesResult.error?.message ?? correctionsResult.error?.message ?? "Unable to load work-order details.");
      } else {
        setEvents((eventsResult.data ?? []) as DbEvent[]);
        setNotes((notesResult.data ?? []) as DbNote[]);
        setTimeCorrections((correctionsResult.data ?? []) as DbTimeCorrection[]);
      }

      setDetailsLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    const updateLocalClock = () => {
      setLocalToday(formatDateInput(new Date()));
      setLocalNowMs(Date.now());
    };
    updateLocalClock();

    const timer = window.setInterval(updateLocalClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    restoreWorkOrdersReturnState();

    const handlePageShow = () => {
      restoreWorkOrdersReturnState();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    if (loading || orders.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const focusId = params.get("focus");
    if (!focusId) return;
    const target = orders.find((order) => order.id === focusId);
    if (!target) return;
    setSelectedOrderId(target.id);
    setDetailTab("overview");
    setDraftStatus(target.status as WorkOrderStatus);
    setStatusError(null);
    if (params.get("time") === "1" && canCorrectTime) {
      // Keep the Work Order overview visible so the admin can see the whole
      // technician timeline and choose the exact segment to correct.
      showActionNotice("info", "Opened from Dispatch. Use Correct beside the affected segment; FieldOps will identify any previous/next conflict and where to start.");
    }
    const clean = new URL(window.location.href);
    clean.searchParams.delete("focus");
    clean.searchParams.delete("time");
    window.history.replaceState({}, "", `${clean.pathname}${clean.search}${clean.hash}`);
  }, [loading, orders, canCorrectTime]);


  useEffect(() => {
    if (!selectedOrderId) return;
    void loadDetails(selectedOrderId);
  }, [selectedOrderId, loadDetails]);

  useEffect(() => {
    if (!selectedOrder) return;
    setDraftStatus(selectedOrder.status as WorkOrderStatus);
  }, [selectedOrder]);

  useEffect(() => {
    if (authRequired) return;

    const channel = supabase
      .channel("fieldops-work-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        () => void loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_order_assignments" },
        () => void loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries" },
        () => void loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "material_usage" },
        () => void loadOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_order_events" },
        () => {
          if (selectedOrderId) void loadDetails(selectedOrderId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_order_notes" },
        () => {
          if (selectedOrderId) void loadDetails(selectedOrderId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadOrders, loadDetails, selectedOrderId, authRequired]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const customer = customerMap.get(order.customer_id)?.name ?? "";
      const site = order.site_id ? siteMap.get(order.site_id) : null;
      const technicianNames = (assignmentMap.get(order.id) ?? [])
        .map((assignment) => profileMap.get(assignment.technician_id)?.full_name ?? "")
        .join(" ");

      const matchesSearch =
        !query ||
        order.work_order_number.toLowerCase().includes(query) ||
        order.title.toLowerCase().includes(query) ||
        (order.description ?? "").toLowerCase().includes(query) ||
        customer.toLowerCase().includes(query) ||
        (site?.name ?? "").toLowerCase().includes(query) ||
        technicianNames.toLowerCase().includes(query);

      const activeStatuses = new Set([
        "requested",
        "planned",
        "assigned",
        "travelling",
        "on_site",
        "working",
        "waiting",
        "finished",
        "billing_ready",
      ]);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? activeStatuses.has(order.status)
          : order.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || order.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [
    orders,
    search,
    statusFilter,
    priorityFilter,
    customerMap,
    siteMap,
    assignmentMap,
    profileMap,
  ]);

  const workOrderOverruns = useMemo<WorkOrderOverrun[]>(() => {
    const result = new Map<string, WorkOrderOverrun>();

    for (const assignment of assignments) {
      const order = orders.find(
        (item) => item.id === assignment.work_order_id
      );

      if (!order) continue;

      const plannedEndIso =
        assignment.scheduled_end ?? order.scheduled_end;

      if (!plannedEndIso) continue;

      const plannedEndMs = new Date(plannedEndIso).getTime();

      const relatedEntries = timeEntries.filter(
        (entry) =>
          entry.work_order_id === assignment.work_order_id &&
          (
            entry.assignment_id === assignment.id ||
            entry.assignment_id === null
          )
      );

      if (relatedEntries.length === 0) continue;

      let latestActualEndMs = 0;
      let isActive = false;

      for (const entry of relatedEntries) {
        const endMs = entry.ended_at
          ? new Date(entry.ended_at).getTime()
          : localNowMs ?? 0;

        if (entry.ended_at === null) {
          isActive = true;
        }

        latestActualEndMs = Math.max(
          latestActualEndMs,
          endMs
        );
      }

      if (latestActualEndMs <= plannedEndMs) continue;

      const technician =
        profileMap.get(assignment.technician_id);

      const key = `${assignment.technician_id}:${order.id}`;

      result.set(key, {
        key,
        workOrderId: order.id,
        workOrderNumber: order.work_order_number,
        title: order.title,
        technicianId: assignment.technician_id,
        technicianName:
          technician?.full_name ??
          technician?.email ??
          "Technician",
        plannedEnd: plannedEndIso,
        actualEnd: isActive
          ? null
          : new Date(latestActualEndMs).toISOString(),
        overrunMinutes: Math.max(
          0,
          Math.round(
            (latestActualEndMs - plannedEndMs) / 60000
          )
        ),
        active: isActive,
      });
    }

    return [...result.values()].sort(
      (a, b) => b.overrunMinutes - a.overrunMinutes
    );
  }, [
    assignments,
    orders,
    timeEntries,
    localNowMs,
    profileMap,
  ]);

  const summary = useMemo(() => {
    const requested = orders.filter(
      (order) => order.status === "requested"
    ).length;
    const inProgress = orders.filter((order) =>
      ["travelling", "on_site", "working", "waiting"].includes(order.status)
    ).length;
    const scheduledToday = localToday
      ? orders.filter(
          (order) =>
            order.scheduled_start &&
            formatDateInput(new Date(order.scheduled_start)) === localToday
        ).length
      : 0;
    const needsDispatch = orders.filter((order) => {
      if (["closed", "cancelled"].includes(order.status)) return false;

      const activeAssignments = (assignmentMap.get(order.id) ?? []).filter(
        (assignment) => assignment.assignment_status !== "removed"
      );

      return activeAssignments.length === 0;
    }).length;
    const billingReady = orders.filter(
      (order) => order.status === "billing_ready"
    ).length;
    const closed = orders.filter(
      (order) => order.status === "closed"
    ).length;
    const overrun = workOrderOverruns.length;

    return {
      requested,
      inProgress,
      scheduledToday,
      needsDispatch,
      billingReady,
      closed,
      overrun,
    };
  }, [orders, localToday, assignmentMap, workOrderOverruns]);

  function openOrder(order: DbWorkOrder) {
    setSelectedOrderId(order.id);
    setDetailTab("overview");
    setStatusError(null);
    setDraftStatus(order.status as WorkOrderStatus);
    setEditMode(false);
    setEditForm(null);
    setAssignOpen(false);
    setAssignError(null);
  }

  useEffect(() => {
    if (!selectedOrder || (!timeEditorOpen && !assignOpen)) {
      setServerAvailability(new Map());
      setServerAvailabilityError(null);
      setServerAvailabilityLoading(false);
      return;
    }

    const selectedWorkOrderId = selectedOrder.id;

    const requestedStartKey =
      timeEditorOpen
        ? timeEditorAvailabilityStartKey
        : assignAvailabilityStartKey;

    const requestedEndKey =
      timeEditorOpen
        ? timeEditorAvailabilityEndKey
        : assignAvailabilityEndKey;

    if (!requestedStartKey || !requestedEndKey) {
      setServerAvailability(new Map());
      setServerAvailabilityError(
        "Work order schedule is not available."
      );
      setServerAvailabilityLoading(false);
      return;
    }

    const requestedStart = new Date(requestedStartKey);
    const requestedEnd = new Date(requestedEndKey);

    if (
      Number.isNaN(requestedStart.getTime()) ||
      Number.isNaN(requestedEnd.getTime()) ||
      requestedEnd <= requestedStart
    ) {
      setServerAvailability(new Map());
      setServerAvailabilityError(
        "Work order schedule is invalid."
      );
      setServerAvailabilityLoading(false);
      return;
    }

    const dayStart = new Date(requestedStart);
    dayStart.setHours(7, 0, 0, 0);

    const dayEnd = new Date(requestedStart);
    dayEnd.setHours(17, 0, 0, 0);

    let cancelled = false;

    async function loadServerAvailability() {
      setServerAvailabilityLoading(true);
      setServerAvailabilityError(null);

      const { data, error: availabilityError } =
        await supabase.rpc(
          "fieldops_get_technician_availability",
          {
            p_work_order_id: selectedWorkOrderId,
            p_day_start: dayStart.toISOString(),
            p_day_end: dayEnd.toISOString(),
            p_window_start: requestedStart.toISOString(),
            p_window_end: requestedEnd.toISOString(),
            p_exclude_time_entry_id:
              timeEditorOpen && editingTimeEntryId
                ? editingTimeEntryId
                : null,
          }
        );

      if (cancelled) return;

      if (availabilityError) {
        setServerAvailability(new Map());
        setServerAvailabilityError(
          availabilityError.message
        );
        setServerAvailabilityLoading(false);
        return;
      }

      const next = new Map<string, ServerAvailability>();

      for (const row of (data ?? []) as ServerAvailability[]) {
        next.set(row.technician_id, row);
      }

      setServerAvailability(next);
      setServerAvailabilityLoading(false);
    }

    void loadServerAvailability();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    selectedOrder?.id,
    timeEditorOpen,
    assignOpen,
    editingTimeEntryId,
    timeEditorAvailabilityStartKey,
    timeEditorAvailabilityEndKey,
    assignAvailabilityStartKey,
    assignAvailabilityEndKey,
  ]);

  function openAddTimeEditor(
    presetActivity: "work" | "break" = "work"
  ) {
    if (!selectedOrder || !canCorrectTime) return;

    const defaultTechnician =
      selectedOrderPrimaryAssignment?.technician_id ??
      technicians[0]?.id ??
      "";

    const startIso =
      selectedOrderPrimaryAssignment?.scheduled_start ??
      selectedOrder.scheduled_start;

    const endIso =
      selectedOrderPrimaryAssignment?.scheduled_end ??
      selectedOrder.scheduled_end;

    // Missing-time correction starts from the work order's planned schedule.
    // The authorized user can then move either actual boundary earlier/later.

    setEditingTimeEntryId(null);
    setTimeEditorError(null);
    setTimeEditorForm({
      technicianId: defaultTechnician,
      // Work/Labour starts from the planned work-order schedule by default.
      // Break/Lunch is intentionally blank because its actual time cannot
      // safely be inferred from the work-order schedule.
      startedAt:
        presetActivity === "break"
          ? ""
          : dateTimeLocalInputFromIso(startIso) ||
            dateTimeLocalInputFromIso(new Date().toISOString()),
      endedAt:
        presetActivity === "break"
          ? ""
          : dateTimeLocalInputFromIso(endIso),
      activityType: presetActivity,
      billable: presetActivity !== "break",
      billingRate: String(rateDefaults.default_customer_billing_rate ?? 0),
      payRate: String(rateDefaults.default_technician_pay_rate ?? 0),
      reason: "",
    });
    setTimeEditorOpen(true);
  }

  function openCorrectTimeEditor(entry: DbTimeEntry) {
    if (!canCorrectTime) return;

    setEditingTimeEntryId(entry.id);
    setTimeEditorError(null);
    setTimeEditorForm({
      technicianId: entry.technician_id,
      startedAt: dateTimeLocalInputFromIso(entry.started_at),
      endedAt: dateTimeLocalInputFromIso(entry.ended_at),
      activityType: entry.activity_type,
      billable: entry.billable,
      billingRate:
        entry.billing_rate === null
          ? ""
          : String(entry.billing_rate),
      payRate:
        entry.pay_rate === null
          ? ""
          : String(entry.pay_rate),
      reason: "",
    });
    setTimeEditorOpen(true);
  }

  async function saveTimeEditor() {
    if (!selectedOrder || !canCorrectTime) return;

    const failTime = (message: string) => {
      setTimeEditorError(message);
      showActionNotice(
        "error",
        `${
          editingTimeEntryId
            ? "Time correction"
            : "Time segment"
        } failed: ${message}`
      );
    };

    if (!timeEditorForm.technicianId) {
      failTime("Select a technician.");
      return;
    }

    if (!timeEditorForm.startedAt) {
      failTime("Actual start time is required.");
      return;
    }

    if (timeEditorForm.reason.trim().length < 5) {
      failTime(
        "Correction reason is required. Enter at least 5 characters before saving."
      );
      return;
    }

    const start = new Date(timeEditorForm.startedAt);
    const end = timeEditorForm.endedAt
      ? new Date(timeEditorForm.endedAt)
      : null;

    if (Number.isNaN(start.getTime())) {
      failTime("Actual start time is invalid.");
      return;
    }

    if (end && Number.isNaN(end.getTime())) {
      failTime("Actual end time is invalid.");
      return;
    }

    if (end && end <= start) {
      failTime(
        "Actual end time must be later than actual start time."
      );
      return;
    }

    if (
      isTerminalWorkOrderStatus(selectedOrder.status) &&
      !end
    ) {
      failTime(
        "A finished or closed work order cannot keep an open technician clock."
      );
      return;
    }

    const billingRate =
      timeEditorForm.billingRate.trim() === ""
        ? null
        : Number(timeEditorForm.billingRate);

    const payRate =
      timeEditorForm.payRate.trim() === ""
        ? null
        : Number(timeEditorForm.payRate);

    if (
      (billingRate !== null &&
        (!Number.isFinite(billingRate) ||
          billingRate < 0)) ||
      (payRate !== null &&
        (!Number.isFinite(payRate) ||
          payRate < 0))
    ) {
      failTime(
        "Billing and pay rates must be valid non-negative numbers."
      );
      return;
    }

    const proposedEndMs = end ? end.getTime() : Number.POSITIVE_INFINITY;
    const conflictingEntry = timeEntries
      .filter((entry) => entry.technician_id === timeEditorForm.technicianId && entry.id !== editingTimeEntryId)
      .map((entry) => ({
        entry,
        startMs: new Date(entry.started_at).getTime(),
        endMs: entry.ended_at ? new Date(entry.ended_at).getTime() : Number.POSITIVE_INFINITY,
      }))
      .filter(({ startMs, endMs }) => start.getTime() < endMs && proposedEndMs > startMs)
      .sort((a, b) => a.startMs - b.startMs)[0];

    if (conflictingEntry) {
      const conflictOrder = orders.find((order) => order.id === conflictingEntry.entry.work_order_id);
      const conflictLabel = `${conflictOrder?.work_order_number ?? "another Work Order"} · ${statusLabel(conflictingEntry.entry.activity_type)}`;
      const conflictWindow = `${formatLocalDateTime24(conflictingEntry.entry.started_at)} → ${conflictingEntry.entry.ended_at ? formatLocalDateTime24(conflictingEntry.entry.ended_at) : "ACTIVE"}`;
      const isPrevious = conflictingEntry.startMs <= start.getTime();
      failTime(
        `This change overlaps ${isPrevious ? "the previous" : "the next"} segment ${conflictLabel} (${conflictWindow}). ` +
        `Correct the ${isPrevious ? "END" : "START"} of that segment first, then return to this time entry.`
      );
      return;
    }

    const orderId = selectedOrder.id;
    const technicianId = timeEditorForm.technicianId;
    const technicianName =
      profileMap.get(technicianId)?.full_name ??
      profileMap.get(technicianId)?.email ??
      "Technician";

    setSavingTimeEditor(true);
    setTimeEditorError(null);
    showActionNotice(
      "info",
      editingTimeEntryId
        ? `Saving time correction for ${technicianName}…`
        : `Adding time segment for ${technicianName}…`
    );

    try {
      if (editingTimeEntryId) {
        const {
          data: correctionResult,
          error: correctionError,
        } = await supabase.rpc(
          "fieldops_correct_time_entry",
          {
            p_time_entry_id: editingTimeEntryId,
            p_started_at: start.toISOString(),
            p_ended_at: end
              ? end.toISOString()
              : null,
            p_activity_type:
              timeEditorForm.activityType,
            p_billable: timeEditorForm.billable,
            p_billing_rate: billingRate,
            p_pay_rate: payRate,
            p_reason:
              timeEditorForm.reason.trim(),
          }
        );

        if (correctionError) {
          failTime(correctionError.message);
          return;
        }

        if (!correctionResult) {
          failTime(
            "The database did not return a correction confirmation."
          );
          return;
        }

        await loadOrders();
        await loadDetails(orderId);

        setTimeEditorOpen(false);
        setEditingTimeEntryId(null);

        showActionNotice(
          "success",
          `${technicianName}'s technician time was corrected successfully.`
        );
      } else {
        const matchingAssignment =
          selectedOrderAssignments.find(
            (assignment) =>
              assignment.technician_id ===
              technicianId
          ) ?? null;

        const {
          data: addResult,
          error: addError,
        } = await supabase.rpc(
          "fieldops_add_time_entry",
          {
            p_work_order_id: orderId,
            p_technician_id: technicianId,
            p_assignment_id:
              matchingAssignment?.id ?? null,
            p_started_at: start.toISOString(),
            p_ended_at: end
              ? end.toISOString()
              : null,
            p_activity_type:
              timeEditorForm.activityType,
            p_billable: timeEditorForm.billable,
            p_billing_rate: billingRate,
            p_pay_rate: payRate,
            p_reason:
              timeEditorForm.reason.trim(),
          }
        );

        if (addError) {
          failTime(addError.message);
          return;
        }

        if (!addResult) {
          failTime(
            "The database did not return a time-entry confirmation."
          );
          return;
        }

        await loadOrders();
        await loadDetails(orderId);

        setTimeEditorOpen(false);
        setEditingTimeEntryId(null);

        showActionNotice(
          "success",
          `${technicianName} time segment added successfully: ${formatLocalDateTime24(
            start
          )}${
            end
              ? ` → ${formatLocalDateTime24(end)}`
              : " → ACTIVE"
          }.`
        );
      }
    } catch (error) {
      failTime(
        error instanceof Error
          ? error.message
          : "Unexpected time-entry error."
      );
    } finally {
      setSavingTimeEditor(false);
    }
  }

  function openMaterialModal() {
    if (!selectedOrder || !canManageMaterials) return;
    const location = inventoryLocations[0] ?? null;
    setMaterialError(null);
    setMaterialForm({ locationId: location?.id ?? "", selectedItems: [], activeInventoryItemId: "", notes: "" });
    setMaterialOpen(true);
  }

  async function saveMaterial() {
    if (!selectedOrder || !canManageMaterials) return;
    if (!materialForm.locationId) { setMaterialError("Choose the stock location the materials are coming from."); return; }
    if (materialForm.selectedItems.length === 0) { setMaterialError("Select at least one inventory item."); return; }
    const payload = materialForm.selectedItems.map(line => ({ inventory_item_id:line.inventoryItemId, location_id:line.locationId, quantity:Number(line.quantity), unit_price:Number(line.unitPrice), billable:line.billable }));
    if (payload.some(line => !line.inventory_item_id || !line.location_id || !Number.isFinite(line.quantity) || line.quantity<=0 || !Number.isFinite(line.unit_price) || line.unit_price<0)) { setMaterialError("Every selected item needs a quantity greater than zero and a valid non-negative client unit price."); return; }
    setSavingMaterial(true); setMaterialError(null);
    const {error:rpcError}=await supabase.rpc("fieldops_add_work_order_materials",{p_work_order_id:selectedOrder.id,p_location_id:materialForm.locationId,p_items:payload,p_notes:materialForm.notes.trim()||null});
    setSavingMaterial(false);
    if(rpcError){setMaterialError(rpcError.message);showActionNotice("error",`Material failed: ${rpcError.message}`);return;}
    setMaterialOpen(false); await loadOrders(); await loadDetails(selectedOrder.id); showActionNotice("success",`${payload.length} inventory item${payload.length===1?"":"s"} consumed and added to the Work Order.`);
  }

  function openReturnMaterialModal(usage: DbMaterialUsage) {
    if (!canManageMaterials) return;
    const remaining = Math.max(0, Number(usage.quantity) - Number(usage.quantity_returned || 0));
    setReturnMaterialUsage(usage);
    setReturnMaterialError(null);
    setReturnMaterialForm({
      locationId: inventoryLocations[0]?.id ?? "",
      quantity: String(remaining || 1),
      reason: "",
    });
    setReturnMaterialOpen(true);
  }

  async function saveMaterialReturn() {
    if (!returnMaterialUsage || !canManageMaterials) return;
    const quantity = Number(returnMaterialForm.quantity);
    const remaining = Math.max(0, Number(returnMaterialUsage.quantity) - Number(returnMaterialUsage.quantity_returned || 0));
    if (!returnMaterialForm.locationId) { setReturnMaterialError("Choose the location receiving the returned stock."); return; }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) { setReturnMaterialError(`Return quantity must be greater than zero and no more than ${remaining}.`); return; }
    if (returnMaterialForm.reason.trim().length < 3) { setReturnMaterialError("Enter a return reason of at least 3 characters."); return; }

    setSavingMaterialReturn(true);
    setReturnMaterialError(null);
    const { error: rpcError } = await supabase.rpc("fieldops_return_work_order_material", {
      p_material_usage_id: returnMaterialUsage.id,
      p_quantity: quantity,
      p_location_id: returnMaterialForm.locationId,
      p_reason: returnMaterialForm.reason.trim(),
    });
    setSavingMaterialReturn(false);
    if (rpcError) { setReturnMaterialError(rpcError.message); showActionNotice("error", `Material return failed: ${rpcError.message}`); return; }
    setReturnMaterialOpen(false);
    setReturnMaterialUsage(null);
    await loadOrders();
    if (selectedOrder) await loadDetails(selectedOrder.id);
    showActionNotice("success", "Material returned to Inventory and the net billable quantity was updated.");
  }

  function openBillingRecovery() {
    if (!selectedOrder || !canRecoverBilling) return;
    setBillingRecoveryReason("");
    setBillingRecoveryError(null);
    setBillingRecoveryOpen(true);
  }

  async function saveBillingRecovery() {
    if (!selectedOrder || !canRecoverBilling) return;

    const failBilling = (message: string) => {
      setBillingRecoveryError(message);
      showActionNotice(
        "error",
        `Billing recovery failed: ${message}`
      );
    };

    if (billingRecoveryReason.trim().length < 5) {
      failBilling(
        "Enter a billing recovery reason of at least 5 characters."
      );
      return;
    }

    const orderId = selectedOrder.id;

    setSavingBillingRecovery(true);
    setBillingRecoveryError(null);
    showActionNotice(
      "info",
      "Sending closed work order to Billing…"
    );

    try {
      const {
        data: recoveryResult,
        error: recoveryError,
      } = await supabase.rpc(
        "fieldops_recover_billing",
        {
          p_work_order_id: orderId,
          p_reason:
            billingRecoveryReason.trim(),
        }
      );

      if (recoveryError) {
        failBilling(recoveryError.message);
        return;
      }

      if (!recoveryResult) {
        failBilling(
          "The database did not return a billing recovery confirmation."
        );
        return;
      }

      await loadOrders();
      await loadDetails(orderId);

      setBillingRecoveryOpen(false);

      showActionNotice(
        "success",
        "Work order successfully returned to the Billing queue."
      );
    } catch (error) {
      failBilling(
        error instanceof Error
          ? error.message
          : "Unexpected billing recovery error."
      );
    } finally {
      setSavingBillingRecovery(false);
    }
  }

  function openInDispatch() {
    if (!selectedOrder) return;

    const dispatchRequest = {
      jobUuid: selectedOrder.id,
      date: selectedOrderDispatchDate
        ? formatDateInput(new Date(selectedOrderDispatchDate))
        : null,
      technicianUuid:
        selectedOrderPrimaryAssignment?.technician_id ?? null,
      requestedAt: Date.now(),
    };

    const returnState = {
      selectedOrderId: selectedOrder.id,
      summaryView,
      detailTab,
      savedAt: Date.now(),
    };

    try {
      window.sessionStorage.setItem(
        "fieldops:dispatch-locator",
        JSON.stringify(dispatchRequest)
      );

      window.sessionStorage.setItem(
        "fieldops:work-orders-return",
        JSON.stringify(returnState)
      );
    } catch {
      // Query-string locator still works if browser storage is unavailable.
    }

    // Keep the reliable fresh Dispatch navigation. Browser Back will restore
    // the exact Work Orders drill-down state saved above.
    window.location.assign(selectedOrderDispatchHref);
  }

  function beginEdit() {
    if (!selectedOrder) return;

    setStatusError(null);
    setEditForm({
      title: selectedOrder.title,
      description: selectedOrder.description ?? "",
      jobType: selectedOrder.job_type ?? "",
      priority: selectedOrder.priority,
      serviceArea: selectedOrder.service_area ?? "",
      scheduleDate: dateInputFromIso(selectedOrder.scheduled_start),
      startTime: timeInputFromIso(selectedOrder.scheduled_start),
      endTime: timeInputFromIso(selectedOrder.scheduled_end),
      travelDistanceKm: String(Number(selectedOrder.travel_distance_km || 0)),
    });
    setEditMode(true);
  }

  async function saveEdit() {
    if (!selectedOrder || !editForm) return;

    if (!editForm.title.trim()) {
      setStatusError("Work-order title cannot be empty.");
      return;
    }

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;

    const hasSchedule =
      Boolean(editForm.scheduleDate) ||
      Boolean(editForm.startTime) ||
      Boolean(editForm.endTime);

    if (hasSchedule) {
      if (
        !editForm.scheduleDate ||
        !editForm.startTime ||
        !editForm.endTime
      ) {
        setStatusError(
          "Enter schedule date, start, and end, or leave all three blank."
        );
        return;
      }

      const start = localDateTime(editForm.scheduleDate, editForm.startTime);
      const end = localDateTime(editForm.scheduleDate, editForm.endTime);

      if (end <= start) {
        setStatusError("Schedule end must be later than start.");
        return;
      }

      scheduledStart = start.toISOString();
      scheduledEnd = end.toISOString();
    }

    const travelDistanceKm = Number(editForm.travelDistanceKm || "0");
    if (!Number.isFinite(travelDistanceKm) || travelDistanceKm < 0) {
      setStatusError("Travel distance must be a non-negative number.");
      return;
    }

    setSavingEdit(true);
    setStatusError(null);

    const { error: updateError } = await supabase
      .from("work_orders")
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        job_type: editForm.jobType.trim() || null,
        priority: editForm.priority,
        service_area: editForm.serviceArea.trim() || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        travel_distance_km: travelDistanceKm,
      })
      .eq("id", selectedOrder.id);

    if (updateError) {
      setStatusError(updateError.message);
      setSavingEdit(false);
      return;
    }

    await supabase.from("work_order_events").insert({
      work_order_id: selectedOrder.id,
      event_type: "work_order_edited",
      details: { source: "work_orders_page" },
    });

    setSavingEdit(false);
    setEditMode(false);
    setEditForm(null);
    await loadOrders();
    await loadDetails(selectedOrder.id);
  }


  async function closeWorkOrder() {
    if (!selectedOrder) return;

    if (
      !window.confirm(
        `Close ${selectedOrder.work_order_number} - ${selectedOrder.title}?`
      )
    ) {
      return;
    }

    setStatusError(null);
    setSavingStatus(true);

    const { error: closeError } = await supabase.rpc(
      "fieldops_transition_work_order_status",
      {
        p_work_order_id: selectedOrder.id,
        p_new_status: "closed",
      }
    );

    if (closeError) {
      setStatusError(closeError.message);
      setSavingStatus(false);
      return;
    }

    setSavingStatus(false);
    await loadOrders();
    await loadDetails(selectedOrder.id);
  }

  function openAssignTechnician() {
    if (!selectedOrder) return;

    const currentAssignment = (assignmentMap.get(selectedOrder.id) ?? []).find(
      (assignment) => assignment.assignment_status !== "removed"
    );

    const defaultTechnician =
      currentAssignment?.technician_id ?? technicians[0]?.id ?? "";

    setAssignError(null);
    setAssignForm({
      technicianId: defaultTechnician,
      date:
        dateInputFromIso(currentAssignment?.scheduled_start ?? selectedOrder.scheduled_start) || localToday,
      startTime:
        timeInputFromIso(currentAssignment?.scheduled_start ?? selectedOrder.scheduled_start) || "08:00",
      endTime:
        timeInputFromIso(currentAssignment?.scheduled_end ?? selectedOrder.scheduled_end) || "09:00",
    });
    setAssignOpen(true);
  }

  async function saveAssignment() {
    if (!selectedOrder) return;

    const failAssignment = (message: string) => {
      setAssignError(message);
      showActionNotice(
        "error",
        `Assignment failed: ${message}`
      );
    };

    if (!assignForm.technicianId) {
      failAssignment("Select a technician.");
      return;
    }

    if (
      !assignForm.date ||
      !assignForm.startTime ||
      !assignForm.endTime
    ) {
      failAssignment(
        "Enter date, start, and end time."
      );
      return;
    }

    const start = localDateTime(
      assignForm.date,
      assignForm.startTime
    );
    const end = localDateTime(
      assignForm.date,
      assignForm.endTime
    );

    if (end <= start) {
      failAssignment(
        "End time must be later than start time."
      );
      return;
    }

    const orderId = selectedOrder.id;
    const technicianId = assignForm.technicianId;
    const technicianName =
      profileMap.get(technicianId)?.full_name ??
      profileMap.get(technicianId)?.email ??
      "Technician";

    const currentAssignment =
      (assignmentMap.get(orderId) ?? []).find(
        (assignment) =>
          assignment.assignment_role === "primary" &&
          !["removed", "declined", "completed"].includes(
            assignment.assignment_status
          )
      ) ?? null;

    setSavingAssignment(true);
    setAssignError(null);

    showActionNotice(
      "info",
      `Assigning ${technicianName}…`
    );

    try {
      const {
        data: assignmentResult,
        error: rpcError,
      } = await supabase.rpc(
        "fieldops_reassign_work_order",
        {
          p_work_order_id: orderId,
          p_from_assignment_id:
            currentAssignment?.id ?? null,
          p_to_technician_id: technicianId,
          p_scheduled_start: start.toISOString(),
          p_scheduled_end: end.toISOString(),
        }
      );

      if (rpcError) {
        failAssignment(rpcError.message);
        return;
      }

      const assignmentId =
        assignmentResult &&
        typeof assignmentResult === "object" &&
        "assignment_id" in assignmentResult &&
        typeof assignmentResult.assignment_id === "string"
          ? assignmentResult.assignment_id
          : null;

      if (!assignmentId) {
        failAssignment(
          "Supabase did not return the assignment ID. The assignment was not confirmed."
        );
        return;
      }

      // Verify the exact assignment row before displaying SUCCESS.
      const {
        data: confirmedAssignmentData,
        error: confirmError,
      } = await supabase
        .from("work_order_assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (confirmError || !confirmedAssignmentData) {
        failAssignment(
          confirmError?.message ??
            "The assignment was not found after saving."
        );
        return;
      }

      const confirmedAssignment =
        confirmedAssignmentData as DbAssignment;

      if (
        confirmedAssignment.work_order_id !== orderId ||
        confirmedAssignment.technician_id !== technicianId ||
        confirmedAssignment.assignment_role !== "primary" ||
        ["removed", "declined", "completed"].includes(
          confirmedAssignment.assignment_status
        )
      ) {
        failAssignment(
          "Supabase returned an assignment, but it is not the active primary technician assignment."
        );
        return;
      }

      // Immediately synchronize the local Work Order assignment state.
      // Remove any previously active primary row for this work order, then
      // install the exact row that Supabase just confirmed.
      setAssignments((current) => {
        const next = current.filter((assignment) => {
          if (assignment.id === confirmedAssignment.id) {
            return false;
          }

          if (
            assignment.work_order_id === orderId &&
            assignment.assignment_role === "primary" &&
            !["removed", "declined", "completed"].includes(
              assignment.assignment_status
            )
          ) {
            return false;
          }

          return true;
        });

        next.push(confirmedAssignment);
        return next;
      });

      // Keep status/schedule synchronized immediately while the full refresh runs.
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "assigned",
                scheduled_start:
                  confirmedAssignment.scheduled_start ??
                  order.scheduled_start,
                scheduled_end:
                  confirmedAssignment.scheduled_end ??
                  order.scheduled_end,
              }
            : order
        )
      );

      setDraftStatus("assigned");
      setAssignOpen(false);

      // Tell any open Dispatch tab to refresh immediately.
      // Also persists a marker so Dispatch can refresh when focused again.
      try {
        const update = JSON.stringify({
          workOrderId: orderId,
          technicianId,
          assignmentId,
          at: Date.now(),
        });

        window.localStorage.setItem(
          "fieldops:dispatch-assignment-updated",
          update
        );

        window.dispatchEvent(
          new CustomEvent(
            "fieldops:dispatch-assignment-updated",
            { detail: update }
          )
        );
      } catch {
        // Assignment remains valid even when browser storage is unavailable.
      }

      // Full DB refresh remains the final authority.
      await loadOrders();
      await loadDetails(orderId);

      // Re-read once more after the broad refresh to guard against a stale UI
      // snapshot replacing the exact confirmed assignment.
      const {
        data: finalAssignmentData,
        error: finalAssignmentError,
      } = await supabase
        .from("work_order_assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (
        finalAssignmentError ||
        !finalAssignmentData
      ) {
        failAssignment(
          finalAssignmentError?.message ??
            "Assignment was saved but could not be confirmed after refresh."
        );
        return;
      }

      const finalAssignment =
        finalAssignmentData as DbAssignment;

      setAssignments((current) => {
        const next = current.filter(
          (assignment) =>
            assignment.id !== finalAssignment.id &&
            !(
              assignment.work_order_id === orderId &&
              assignment.assignment_role === "primary" &&
              !["removed", "declined", "completed"].includes(
                assignment.assignment_status
              )
            )
        );

        next.push(finalAssignment);
        return next;
      });

      showActionNotice(
        "success",
        `${technicianName} assigned successfully. Work Order and Dispatch are synchronized.`
      );
    } catch (error) {
      failAssignment(
        error instanceof Error
          ? error.message
          : "Unexpected assignment error."
      );
    } finally {
      setSavingAssignment(false);
    }
  }

  async function waiveBilling() {
    if (!selectedOrder || !canRecoverBilling) return;
    const reason = window.prompt(`Reason to waive billing / mark ${selectedOrder.work_order_number} as No Charge?`);
    if (!reason) return;
    if (reason.trim().length < 5) {
      showActionNotice("error", "Waiver reason must be at least 5 characters.");
      return;
    }
    showActionNotice("info", `Waiving billing for ${selectedOrder.work_order_number}…`);
    const { error: rpcError } = await supabase.rpc("fieldops_waive_work_order_billing", {
      p_work_order_id: selectedOrder.id,
      p_reason: reason.trim(),
    });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadOrders();
    await loadDetails(selectedOrder.id);
    showActionNotice("success", "Billing waived / No Charge recorded with audit history.");
  }

  async function adminOverrideStatus() {
    if (!selectedOrder || !isAdmin) return;
    const next = window.prompt(
      `Admin Override for ${selectedOrder.work_order_number}. Enter exact status:
requested, planned, assigned, travelling, on_site, working, waiting, finished, billing_ready, closed, cancelled`,
      selectedOrder.status
    );
    if (!next || next === selectedOrder.status) return;
    const reason = window.prompt("Reason for this Admin status override (minimum 5 characters)?");
    if (!reason) return;
    if (reason.trim().length < 5) { showActionNotice("error", "Override reason must be at least 5 characters."); return; }
    showActionNotice("info", `Applying Admin Override: ${selectedOrder.status} → ${next}…`);
    const { error: rpcError } = await supabase.rpc("fieldops_admin_override_work_order_status", {
      p_work_order_id: selectedOrder.id,
      p_new_status: next.trim().toLowerCase(),
      p_reason: reason.trim(),
    });
    if (rpcError) { showActionNotice("error", rpcError.message); return; }
    await loadOrders();
    await loadDetails(selectedOrder.id);
    showActionNotice("success", "Admin status override recorded in Work Order activity.");
  }

  async function saveStatus() {
    if (
      !selectedOrder ||
      draftStatus === selectedOrder.status
    ) {
      return;
    }

    const orderId = selectedOrder.id;
    const previousStatus = selectedOrder.status;
    const nextStatus = draftStatus;

    setSavingStatus(true);
    setStatusError(null);
    showActionNotice(
      "info",
      `Updating status to ${statusLabel(nextStatus)}…`
    );

    try {
      const { data: transitionResult, error: transitionError } =
        await supabase.rpc(
          "fieldops_transition_work_order_status",
          {
            p_work_order_id: orderId,
            p_new_status: nextStatus,
          }
        );

      if (transitionError) {
        setStatusError(transitionError.message);
        showActionNotice(
          "error",
          `Status update failed: ${transitionError.message}`
        );
        return;
      }

      await loadOrders();
      await loadDetails(orderId);

      const autoBillingReady =
        transitionResult &&
        typeof transitionResult === "object" &&
        "auto_billing_ready" in transitionResult &&
        transitionResult.auto_billing_ready === true;

      showActionNotice(
        "success",
        autoBillingReady
          ? `Field work finished. ${selectedOrder.work_order_number} moved to Billing Ready automatically.`
          : `Status updated: ${statusLabel(previousStatus)} → ${statusLabel(nextStatus)}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected status update error.";

      setStatusError(message);
      showActionNotice(
        "error",
        `Status update failed: ${message}`
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function addNote() {
    if (!selectedOrder || !noteText.trim()) return;

    setSavingNote(true);
    setStatusError(null);

    const { error: noteError } = await supabase.from("work_order_notes").insert({
      work_order_id: selectedOrder.id,
      note: noteText.trim(),
      visibility: noteVisibility,
    });

    if (noteError) {
      setStatusError(noteError.message);
      setSavingNote(false);
      return;
    }

    setNoteText("");
    setSavingNote(false);
    await loadDetails(selectedOrder.id);
  }

  function openNewWorkOrder() {
    setNewWorkOrderError(null);
    const firstCustomer = customers[0] ?? null;
    const matchingSites = firstCustomer
      ? sites.filter((site) => site.customer_id === firstCustomer.id)
      : [];
    const firstSite = matchingSites[0] ?? null;

    setNewWorkOrderForm({
      ...emptyNewWorkOrderForm,
      customerId: firstCustomer?.id ?? "",
      siteId: firstSite?.id ?? "",
      scheduleDate: formatDateInput(new Date()),
      serviceArea: firstSite?.city ?? "",
    });
    setNewWorkOrderOpen(true);
  }

  async function createWorkOrder() {
    setNewWorkOrderError(null);

    const title = newWorkOrderForm.title.trim();
    if (!newWorkOrderForm.customerId) {
      setNewWorkOrderError("Select a customer.");
      return;
    }

    if (!title) {
      setNewWorkOrderError("Enter a work-order title.");
      return;
    }

    const duration = Number(newWorkOrderForm.estimatedDurationMinutes);
    if (!Number.isFinite(duration) || duration < 15) {
      setNewWorkOrderError("Estimated duration must be at least 15 minutes.");
      return;
    }

    const hasDate = Boolean(newWorkOrderForm.scheduleDate);
    const hasTime = Boolean(newWorkOrderForm.scheduleTime);

    if (hasDate !== hasTime) {
      setNewWorkOrderError(
        "Enter both a schedule date and start time, or leave both blank."
      );
      return;
    }

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;

    if (hasDate && hasTime) {
      const start = localDateTime(
        newWorkOrderForm.scheduleDate,
        newWorkOrderForm.scheduleTime
      );
      const end = new Date(start.getTime() + duration * 60 * 1000);
      scheduledStart = start.toISOString();
      scheduledEnd = end.toISOString();
    }

    const selectedSite = newWorkOrderForm.siteId
      ? sites.find((site) => site.id === newWorkOrderForm.siteId) ?? null
      : null;

    const requiredSkills = newWorkOrderForm.requiredSkills
      .split(",")
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);

    setSavingWorkOrder(true);

    const { data, error: insertError } = await supabase
      .from("work_orders")
      .insert({
        customer_id: newWorkOrderForm.customerId,
        site_id: newWorkOrderForm.siteId || null,
        title,
        description: newWorkOrderForm.description.trim() || null,
        job_type: newWorkOrderForm.jobType.trim() || null,
        priority: newWorkOrderForm.priority,
        status: scheduledStart ? "planned" : "requested",
        source: newWorkOrderForm.source,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        estimated_duration_minutes: Math.round(duration),
        required_skills: requiredSkills,
        service_area:
          newWorkOrderForm.serviceArea.trim() || selectedSite?.city || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setNewWorkOrderError(insertError.message);
      setSavingWorkOrder(false);
      return;
    }

    setSavingWorkOrder(false);
    setNewWorkOrderOpen(false);
    setNewWorkOrderForm(emptyNewWorkOrderForm);
    await loadOrders();

    if (data?.id) {
      setSelectedOrderId(data.id);
      setDetailTab("overview");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {actionNotice && (
        <ActionNotice
          actionNotice={actionNotice}
          onDismiss={() => setActionNotice(null)}
        />
      )}
      <FieldOpsSidebar fixed />

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="hidden max-w-xl flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                placeholder="Search work orders, customers, sites, technicians..."
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <FieldOpsThemeToggle />
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">Operations</div>
              <h1 className="mt-1 text-2xl font-bold">Work Orders</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage the complete job lifecycle from request through billing readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={openNewWorkOrder}
                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            </div>
          </section>

          {error && (
            <div className="mb-5 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
              {error}
            </div>
          )}

          {authRequired ? (
            <section className="rounded-2xl border border-border bg-card p-8 text-center">
              <h2 className="text-xl font-bold">Sign in to load work orders</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Work Orders uses the same protected Supabase data as Dispatch.
              </p>
              <Link
                href="/auth/login"
                className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                Sign in
              </Link>
            </section>
          ) : (
            <>
              <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                <SummaryCard
                  label="Requested"
                  value={summary.requested}
                  icon={ClipboardList}
                  onView={() => setSummaryView("requested")}
                />
                <SummaryCard
                  label="Scheduled today"
                  value={summary.scheduledToday}
                  icon={CalendarDays}
                  onView={() => setSummaryView("today")}
                />
                <SummaryCard
                  label="In progress"
                  value={summary.inProgress}
                  icon={Clock3}
                  onView={() => setSummaryView("progress")}
                />
                <SummaryCard
                  label="Needs dispatch"
                  value={summary.needsDispatch}
                  icon={Truck}
                  onView={() => setSummaryView("dispatch")}
                />
                <SummaryCard
                  label="Billing ready"
                  value={summary.billingReady}
                  icon={ReceiptText}
                  onView={() => setSummaryView("billing")}
                />
                <SummaryCard
                  label="Closed"
                  value={summary.closed}
                  icon={CheckCircle2}
                  onView={() => setSummaryView("closed")}
                />
                <SummaryCard
                  label="Overrun"
                  value={summary.overrun}
                  icon={Clock3}
                  onView={() => setSummaryView("overrun")}
                />
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="font-bold">Work order register</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {filteredOrders.length} of {orders.length} work orders shown
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative md:hidden">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-10 w-64 max-w-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                        placeholder="Search work orders..."
                      />
                    </div>

                    <label className="flex h-10 items-center gap-2 border border-border bg-background px-3">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="bg-transparent text-sm font-semibold outline-none"
                      >
                        <option value="active">Active work</option>
                        <option value="all">All statuses</option>
                        {workOrderStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex h-10 items-center gap-2 border border-border bg-background px-3">
                      <select
                        value={priorityFilter}
                        onChange={(event) => setPriorityFilter(event.target.value)}
                        className="bg-transparent text-sm font-semibold outline-none"
                      >
                        <option value="all">All priorities</option>
                        {priorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {statusLabel(priority)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[1180px]">
                    <div className="grid grid-cols-[240px_220px_120px_110px_190px_180px_130px] border-b border-border bg-muted/40 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <div className="py-3">Work Order</div>
                      <div className="py-3">Customer / Site</div>
                      <div className="py-3">Status</div>
                      <div className="py-3">Priority</div>
                      <div className="py-3">Schedule</div>
                      <div className="py-3">Technician</div>
                      <div className="py-3 text-right">Updated</div>
                    </div>

                    {loading ? (
                      <div className="p-6 text-sm text-muted-foreground">
                        Loading live work orders…
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground">
                        No work orders match the current filters.
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredOrders.map((order) => {
                          const customer = customerMap.get(order.customer_id);
                          const site = order.site_id ? siteMap.get(order.site_id) : null;
                          const techNames = (assignmentMap.get(order.id) ?? [])
                            .filter((assignment) => assignment.assignment_status !== "removed")
                            .map(
                              (assignment) =>
                                profileMap.get(assignment.technician_id)?.full_name ??
                                profileMap.get(assignment.technician_id)?.email ??
                                "Technician"
                            );

                          return (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => openOrder(order)}
                              className="grid w-full grid-cols-[240px_220px_120px_110px_190px_180px_130px] px-4 text-left transition hover:bg-row-hover"
                            >
                              <div className="min-w-0 py-3 pr-4">
                                <div className="text-xs font-black text-primary">
                                  {order.work_order_number}
                                </div>
                                <div className="mt-1 truncate text-sm font-bold">{order.title}</div>
                                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  {order.job_type || "General service"}
                                </div>
                              </div>

                              <div className="min-w-0 py-3 pr-4">
                                <div className="truncate text-xs font-semibold">
                                  {customer?.name ?? "Unknown customer"}
                                </div>
                                <div className="mt-1 truncate text-[10px] text-muted-foreground">
                                  {site
                                    ? [site.name, site.city].filter(Boolean).join(" · ")
                                    : "No site selected"}
                                </div>
                              </div>

                              <div className="py-3 pr-3">
                                <span
                                  className={`inline-flex border px-2 py-1 text-[9px] font-black ${statusTone(
                                    order.status
                                  )}`}
                                >
                                  {statusLabel(order.status)}
                                </span>
                              </div>

                              <div className="py-3 pr-3">
                                <span
                                  className={`inline-flex border px-2 py-1 text-[9px] font-black ${priorityTone(
                                    order.priority
                                  )}`}
                                >
                                  {statusLabel(order.priority)}
                                </span>
                              </div>

                              <div className="py-3 pr-4 text-[11px]">
                                <div className="font-semibold">
                                  {formatCompactDateTime(order.scheduled_start)}
                                </div>
                                {order.scheduled_end && (
                                  <div className="mt-1 text-[10px] text-muted-foreground">
                                    to {formatCompactDateTime(order.scheduled_end)}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 py-3 pr-4">
                                {techNames.length ? (
                                  <>
                                    <div className="truncate text-xs font-semibold">
                                      {techNames[0]}
                                    </div>
                                    {techNames.length > 1 && (
                                      <div className="mt-1 text-[10px] text-muted-foreground">
                                        +{techNames.length - 1} more
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    Unassigned
                                  </span>
                                )}
                              </div>

                              <div className="py-3 text-right text-[10px] text-muted-foreground">
                                {formatCompactDateTime(order.updated_at)}
                                <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 text-primary" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {summaryView && (
        <SummaryModal
          summaryView={summaryView}
          summaryOrders={summaryOrders}
          workOrderOverruns={workOrderOverruns}
          orders={orders}
          customerMap={customerMap}
          siteMap={siteMap}
          assignmentMap={assignmentMap}
          profileMap={profileMap}
          onClose={() => setSummaryView(null)}
          onOpenOrder={openOrder}
        />
      )}

      {selectedOrder && (
        <WorkOrderDetailModal
          selectedOrder={selectedOrder}
          customerMap={customerMap}
          siteMap={siteMap}
          selectedOrderDisplayAssignments={selectedOrderDisplayAssignments}
          selectedOrderDisplayAssignment={selectedOrderDisplayAssignment}
          selectedOrderTimeEntries={selectedOrderTimeEntries}
          localNowMs={localNowMs}
          profileMap={profileMap}
          canCorrectTime={canCorrectTime}
          canRecoverBilling={canRecoverBilling}
          canManageMaterials={canManageMaterials}
          selectedOrderMaterialUsages={selectedOrderMaterialUsages}
          isAdmin={isAdmin}
          selectedOrderIsAssigned={selectedOrderIsAssigned}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          draftStatus={draftStatus}
          setDraftStatus={setDraftStatus}
          savingStatus={savingStatus}
          statusError={statusError}
          editMode={editMode}
          editForm={editForm}
          setEditMode={setEditMode}
          setEditForm={setEditForm}
          savingEdit={savingEdit}
          setStatusError={setStatusError}
          events={events}
          detailsLoading={detailsLoading}
          notes={notes}
          noteText={noteText}
          setNoteText={setNoteText}
          noteVisibility={noteVisibility}
          setNoteVisibility={setNoteVisibility}
          savingNote={savingNote}
          onClose={() => setSelectedOrderId(null)}
          onBeginEdit={beginEdit}
          onOpenAssignTechnician={openAssignTechnician}
          onOpenInDispatch={openInDispatch}
          onOpenBillingRecovery={openBillingRecovery}
          onWaiveBilling={() => void waiveBilling()}
          onAdminOverride={() => void adminOverrideStatus()}
          onCloseWorkOrder={() => void closeWorkOrder()}
          onSaveStatus={() => void saveStatus()}
          onSaveEdit={() => void saveEdit()}
          onAddTime={openAddTimeEditor}
          onCorrectTime={openCorrectTimeEditor}
          onAddMaterial={() => openMaterialModal()}
          onReturnMaterial={(usage) => openReturnMaterialModal(usage)}
          onAddNote={() => void addNote()}
        />
      )}

      {assignOpen && selectedOrder && (
        <AssignTechnicianModal
          selectedOrder={selectedOrder}
          assignForm={assignForm}
          setAssignForm={setAssignForm}
          assignError={assignError}
          savingAssignment={savingAssignment}
          technicians={technicians}
          serverAvailability={serverAvailability}
          serverAvailabilityLoading={serverAvailabilityLoading}
          serverAvailabilityError={serverAvailabilityError}
          onClose={() => setAssignOpen(false)}
          onSave={() => void saveAssignment()}
        />
      )}
      {timeEditorOpen && selectedOrder && (
        <TechnicianTimeModal
          selectedOrder={selectedOrder}
          editingTimeEntryId={editingTimeEntryId}
          editingTimeEntry={editingTimeEntry}
          timeEditorForm={timeEditorForm}
          setTimeEditorForm={setTimeEditorForm}
          timeEditorError={timeEditorError}
          savingTimeEditor={savingTimeEditor}
          technicians={technicians}
          serverAvailability={serverAvailability}
          serverAvailabilityLoading={serverAvailabilityLoading}
          serverAvailabilityError={serverAvailabilityError}
          timeEditorPlannedStartIso={timeEditorPlannedStartIso}
          timeEditorPlannedEndIso={timeEditorPlannedEndIso}
          timeEditorPlannedMinutes={timeEditorPlannedMinutes}
          timeEditorRecordedMinutes={timeEditorRecordedMinutes}
          timeEditorActualMinutes={timeEditorActualMinutes}
          timeEditorVariance={timeEditorVariance}
          timeCorrections={timeCorrections}
          profileMap={profileMap}
          defaultCustomerBillingRate={rateDefaults.default_customer_billing_rate}
          defaultTechnicianPayRate={rateDefaults.default_technician_pay_rate}
          onClose={() => setTimeEditorOpen(false)}
          onSave={() => void saveTimeEditor()}
        />
      )}
      {selectedOrder && (
        <WorkOrderMaterialModal
          open={materialOpen}
          workOrderNumber={selectedOrder.work_order_number}
          items={inventoryItems}
          locations={inventoryLocations}
          stockBalances={materialStockBalances}
          form={materialForm}
          error={materialError}
          saving={savingMaterial}
          onChange={setMaterialForm}
          onClose={() => setMaterialOpen(false)}
          onSave={() => void saveMaterial()}
        />
      )}
      <WorkOrderMaterialReturnModal
        open={returnMaterialOpen}
        usage={returnMaterialUsage as WorkOrderMaterialUsage | null}
        locations={inventoryLocations}
        form={returnMaterialForm}
        error={returnMaterialError}
        saving={savingMaterialReturn}
        onChange={setReturnMaterialForm}
        onClose={() => setReturnMaterialOpen(false)}
        onSave={() => void saveMaterialReturn()}
      />
      {billingRecoveryOpen && selectedOrder && (
        <BillingRecoveryModal
          selectedOrder={selectedOrder}
          billingRecoveryError={billingRecoveryError}
          billingRecoveryReason={billingRecoveryReason}
          setBillingRecoveryReason={setBillingRecoveryReason}
          savingBillingRecovery={savingBillingRecovery}
          onClose={() => setBillingRecoveryOpen(false)}
          onSave={() => void saveBillingRecovery()}
        />
      )}
      {newWorkOrderOpen && (
        <NewWorkOrderModal
          customers={customers}
          sites={sites}
          newWorkOrderForm={newWorkOrderForm}
          setNewWorkOrderForm={setNewWorkOrderForm}
          newWorkOrderError={newWorkOrderError}
          savingWorkOrder={savingWorkOrder}
          onClose={() => setNewWorkOrderOpen(false)}
          onCreate={() => void createWorkOrder()}
        />
      )}
    </main>
  );
}
