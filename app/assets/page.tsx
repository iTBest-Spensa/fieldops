"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  Filter,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";
import type {
  AssetAssignmentForm,
  AssetDetailTab,
  AssetForm,
  AssetSnapshot,
  AssetSummaryView,
  DbAsset,
  DbAssetDocument,
  DbAssetHistory,
  DbAssetMaintenance,
  DbAssetNote,
  DbCustomer,
  DbInventoryLocation,
  DbProfile,
  DbRole,
  DbSite,
  DbWorkOrder,
  DocumentForm,
  MaintenanceForm,
} from "./types";
import {
  emptyAssetForm,
  emptyAssignmentForm,
  emptyDocumentForm,
  emptyMaintenanceForm,
} from "./constants";
import {
  assetDisplayName,
  buildAssetSnapshot,
} from "./utils";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { AssetSummaryCards } from "./components/asset-summary-cards";
import { AssetTable } from "./components/asset-table";
import { AssetSummaryModal } from "./components/modals/asset-summary-modal";
import { AssetDetailModal } from "./components/modals/asset-detail-modal";
import { AssetFormModal } from "./components/modals/asset-form-modal";
import { AssignmentModal } from "./components/modals/assignment-modal";
import { MaintenanceModal } from "./components/modals/maintenance-modal";
import { DocumentModal } from "./components/modals/document-modal";
import { AddAssetNoteModal } from "./components/modals/add-asset-note-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, active: true, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const assetSelect = "id,asset_tag,asset_name,serial_number,asset_type,category,manufacturer,model,description,ownership,customer_id,site_id,assigned_to,current_work_order_id,inventory_location_id,status,condition,purchase_date,purchase_cost,replacement_cost,purchase_vendor,purchase_order,warranty_expires_on,in_service_date,next_service_date,retired_at,disposed_at,disposal_method,notes,created_at,updated_at";
const historySelect = "id,asset_id,work_order_id,event_type,from_user_id,to_user_id,from_site_id,to_site_id,from_customer_id,to_customer_id,from_work_order_id,to_work_order_id,from_location_id,to_location_id,from_status,to_status,details,notes,created_by,created_at";
const maintenanceSelect = "id,asset_id,work_order_id,maintenance_type,status,title,description,provider,scheduled_date,completed_date,cost,notes,created_by,created_at,updated_at";
const documentSelect = "id,asset_id,document_type,name,url,expires_on,notes,created_by,created_at,updated_at";
const noteSelect = "id,asset_id,note,created_by,created_at";
const workOrderSelect = "id,work_order_number,customer_id,site_id,title,status,priority,scheduled_start,scheduled_end,requested_at,completed_at,closed_at";

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : Number.NaN;
}

export default function AssetsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [history, setHistory] = useState<DbAssetHistory[]>([]);
  const [maintenance, setMaintenance] = useState<DbAssetMaintenance[]>([]);
  const [documents, setDocuments] = useState<DbAssetDocument[]>([]);
  const [notes, setNotes] = useState<DbAssetNote[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [locations, setLocations] = useState<DbInventoryLocation[]>([]);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<AssetDetailTab>("overview");
  const [summaryView, setSummaryView] = useState<AssetSummaryView | null>(null);

  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [assetFormMode, setAssetFormMode] = useState<"create" | "edit">("create");
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [assetFormError, setAssetFormError] = useState<string | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssetAssignmentForm>(emptyAssignmentForm);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(emptyMaintenanceForm);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocumentForm);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [savingDocument, setSavingDocument] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const [actionNotice, setActionNotice] = useState<ActionNoticeState | null>(null);

  const profileMap = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);
  const customerMap = useMemo(() => new Map(customers.map((item) => [item.id, item])), [customers]);
  const siteMap = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const locationMap = useMemo(() => new Map(locations.map((item) => [item.id, item])), [locations]);
  const workOrderMap = useMemo(() => new Map(workOrders.map((item) => [item.id, item])), [workOrders]);

  const myRoles = useMemo(
    () => roles.filter((item) => item.user_id === currentUserId).map((item) => item.role),
    [roles, currentUserId],
  );
  const canManage = myRoles.some((role) => ["admin", "manager", "inventory"].includes(role));
  const canAddNote = myRoles.some((role) => ["admin", "manager", "inventory", "dispatcher", "technician"].includes(role));

  const effectiveNow = useMemo(() => new Date(nowMs ?? 0), [nowMs]);

  const showActionNotice = useCallback((type: ActionNoticeState["type"], message: string) => {
    setActionNotice({ type, message });
  }, []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const loadAssets = useCallback(async () => {
    setError(null);
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    setAuthRequired(false);
    setCurrentUserId(authData.user.id);

    const [
      assetsResult,
      historyResult,
      maintenanceResult,
      documentResult,
      noteResult,
      profilesResult,
      rolesResult,
      customersResult,
      sitesResult,
      locationsResult,
      workOrdersResult,
    ] = await Promise.all([
      supabase.from("assets").select(assetSelect).order("asset_tag", { ascending: true, nullsFirst: false }),
      supabase.from("asset_history").select(historySelect).order("created_at", { ascending: false }),
      supabase.from("asset_maintenance").select(maintenanceSelect).order("created_at", { ascending: false }),
      supabase.from("asset_documents").select(documentSelect).order("created_at", { ascending: false }),
      supabase.from("asset_notes").select(noteSelect).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email,active").order("full_name", { ascending: true, nullsFirst: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("customers").select("id,name,status").order("name"),
      supabase.from("sites").select("id,customer_id,name,address1,city,province_state,active").order("name"),
      supabase.from("inventory_locations").select("id,name,location_type,site_id,active").order("name"),
      supabase.from("work_orders").select(workOrderSelect).order("requested_at", { ascending: false }),
    ]);

    const results = [assetsResult, historyResult, maintenanceResult, documentResult, noteResult, profilesResult, rolesResult, customersResult, sitesResult, locationsResult, workOrdersResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setAssets((assetsResult.data ?? []) as DbAsset[]);
    setHistory((historyResult.data ?? []) as DbAssetHistory[]);
    setMaintenance((maintenanceResult.data ?? []) as DbAssetMaintenance[]);
    setDocuments((documentResult.data ?? []) as DbAssetDocument[]);
    setNotes((noteResult.data ?? []) as DbAssetNote[]);
    setProfiles((profilesResult.data ?? []) as DbProfile[]);
    setRoles((rolesResult.data ?? []) as DbRole[]);
    setCustomers((customersResult.data ?? []) as DbCustomer[]);
    setSites((sitesResult.data ?? []) as DbSite[]);
    setLocations((locationsResult.data ?? []) as DbInventoryLocation[]);
    setWorkOrders((workOrdersResult.data ?? []) as DbWorkOrder[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (authRequired) return;
    const channel = supabase
      .channel("fieldops-assets-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => void loadAssets())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_history" }, () => void loadAssets())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_maintenance" }, () => void loadAssets())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_documents" }, () => void loadAssets())
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_notes" }, () => void loadAssets())
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => void loadAssets())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, loadAssets, authRequired]);

  const snapshots = useMemo<AssetSnapshot[]>(() => assets.map((asset) => buildAssetSnapshot({
    asset,
    history: history.filter((item) => item.asset_id === asset.id),
    maintenance: maintenance.filter((item) => item.asset_id === asset.id),
    profileMap,
    customerMap,
    siteMap,
    workOrderMap,
    locationMap,
    now: effectiveNow,
  })), [assets, history, maintenance, profileMap, customerMap, siteMap, workOrderMap, locationMap, effectiveNow]);

  const filteredSnapshots = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshots.filter((snapshot) => {
      const asset = snapshot.asset;
      const matchesSearch = !query || [
        asset.asset_tag,
        asset.asset_name,
        asset.serial_number,
        asset.asset_type,
        asset.category,
        asset.manufacturer,
        asset.model,
        snapshot.assignmentLabel,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchesOwnership = ownershipFilter === "all" || asset.ownership === ownershipFilter;
      return matchesSearch && matchesStatus && matchesOwnership;
    });
  }, [snapshots, search, statusFilter, ownershipFilter]);

  const summarySnapshots = useMemo(() => {
    if (!summaryView) return [];
    if (summaryView === "assigned") return snapshots.filter((item) => ["assigned", "in_use"].includes(item.asset.status));
    if (summaryView === "maintenance") return snapshots.filter((item) => item.maintenanceDue || item.asset.status === "repair");
    if (summaryView === "unavailable") return snapshots.filter((item) => item.unavailable);
    return snapshots;
  }, [summaryView, snapshots]);

  const selectedAsset = selectedAssetId ? assets.find((asset) => asset.id === selectedAssetId) ?? null : null;
  const selectedSnapshot = selectedAssetId ? snapshots.find((item) => item.asset.id === selectedAssetId) ?? null : null;
  const selectedHistory = selectedAssetId ? history.filter((item) => item.asset_id === selectedAssetId) : [];
  const selectedMaintenance = selectedAssetId ? maintenance.filter((item) => item.asset_id === selectedAssetId) : [];
  const selectedDocuments = selectedAssetId ? documents.filter((item) => item.asset_id === selectedAssetId) : [];
  const selectedNotes = selectedAssetId ? notes.filter((item) => item.asset_id === selectedAssetId) : [];
  const relatedWorkOrders = selectedSnapshot
    ? selectedSnapshot.relatedWorkOrderIds.map((id) => workOrderMap.get(id)).filter((item): item is DbWorkOrder => Boolean(item))
    : [];

  function openAsset(assetId: string) {
    setSelectedAssetId(assetId);
    setDetailTab("overview");
  }

  function openNewAsset() {
    setAssetFormMode("create");
    setAssetForm(emptyAssetForm);
    setAssetFormError(null);
    setAssetFormOpen(true);
  }

  function openEditAsset() {
    if (!selectedAsset) return;
    setAssetFormMode("edit");
    setAssetForm({
      assetTag: selectedAsset.asset_tag ?? "",
      assetName: selectedAsset.asset_name ?? "",
      serialNumber: selectedAsset.serial_number ?? "",
      assetType: selectedAsset.asset_type,
      category: selectedAsset.category ?? "",
      manufacturer: selectedAsset.manufacturer ?? "",
      model: selectedAsset.model ?? "",
      description: selectedAsset.description ?? "",
      ownership: selectedAsset.ownership,
      status: selectedAsset.status,
      condition: selectedAsset.condition,
      purchaseDate: selectedAsset.purchase_date ?? "",
      purchaseCost: selectedAsset.purchase_cost?.toString() ?? "",
      replacementCost: selectedAsset.replacement_cost?.toString() ?? "",
      purchaseVendor: selectedAsset.purchase_vendor ?? "",
      purchaseOrder: selectedAsset.purchase_order ?? "",
      warrantyExpiresOn: selectedAsset.warranty_expires_on ?? "",
      inServiceDate: selectedAsset.in_service_date ?? "",
      nextServiceDate: selectedAsset.next_service_date ?? "",
      disposalMethod: selectedAsset.disposal_method ?? "",
      notes: selectedAsset.notes ?? "",
    });
    setAssetFormError(null);
    setAssetFormOpen(true);
  }

  async function saveAsset() {
    const assetType = assetForm.assetType.trim();
    if (!assetType) {
      setAssetFormError("Asset type is required.");
      return;
    }

    const purchaseCost = numberOrNull(assetForm.purchaseCost);
    const replacementCost = numberOrNull(assetForm.replacementCost);
    if (Number.isNaN(purchaseCost) || Number.isNaN(replacementCost)) {
      setAssetFormError("Purchase and replacement costs must be valid non-negative numbers.");
      return;
    }

    setSavingAsset(true);
    setAssetFormError(null);
    showActionNotice("info", assetFormMode === "create" ? "Creating asset…" : "Saving asset changes…");

    const args = {
      p_asset_tag: assetForm.assetTag.trim() || null,
      p_asset_name: assetForm.assetName.trim() || null,
      p_serial_number: assetForm.serialNumber.trim() || null,
      p_asset_type: assetType,
      p_category: assetForm.category.trim() || null,
      p_manufacturer: assetForm.manufacturer.trim() || null,
      p_model: assetForm.model.trim() || null,
      p_description: assetForm.description.trim() || null,
      p_ownership: assetForm.ownership,
      p_status: assetForm.status,
      p_condition: assetForm.condition,
      p_purchase_date: assetForm.purchaseDate || null,
      p_purchase_cost: purchaseCost,
      p_replacement_cost: replacementCost,
      p_purchase_vendor: assetForm.purchaseVendor.trim() || null,
      p_purchase_order: assetForm.purchaseOrder.trim() || null,
      p_warranty_expires_on: assetForm.warrantyExpiresOn || null,
      p_in_service_date: assetForm.inServiceDate || null,
      p_next_service_date: assetForm.nextServiceDate || null,
      p_disposal_method: assetForm.disposalMethod.trim() || null,
      p_notes: assetForm.notes.trim() || null,
    };

    if (assetFormMode === "create") {
      const { data, error: saveError } = await supabase.rpc("fieldops_create_asset", args);
      if (saveError) {
        setAssetFormError(saveError.message);
        showActionNotice("error", saveError.message);
        setSavingAsset(false);
        return;
      }
      const result = data as { asset_id?: string } | null;
      await loadAssets();
      if (result?.asset_id) setSelectedAssetId(result.asset_id);
      setAssetFormOpen(false);
      showActionNotice("success", "Asset created successfully.");
    } else if (selectedAsset) {
      const { error: saveError } = await supabase.rpc("fieldops_update_asset", { p_asset_id: selectedAsset.id, ...args });
      if (saveError) {
        setAssetFormError(saveError.message);
        showActionNotice("error", saveError.message);
        setSavingAsset(false);
        return;
      }
      await loadAssets();
      setAssetFormOpen(false);
      showActionNotice("success", `${assetDisplayName(selectedAsset)} was updated successfully.`);
    }

    setSavingAsset(false);
  }

  function openAssignment() {
    if (!selectedAsset) return;
    let targetType: AssetAssignmentForm["targetType"] = "available";
    if (selectedAsset.current_work_order_id) targetType = "work_order";
    else if (selectedAsset.assigned_to) targetType = "technician";
    else if (selectedAsset.site_id) targetType = "site";
    else if (selectedAsset.customer_id) targetType = "customer";
    else if (selectedAsset.inventory_location_id) targetType = "storage";

    setAssignmentForm({
      targetType,
      technicianId: selectedAsset.assigned_to ?? "",
      customerId: selectedAsset.customer_id ?? "",
      siteId: selectedAsset.site_id ?? "",
      workOrderId: selectedAsset.current_work_order_id ?? "",
      locationId: selectedAsset.inventory_location_id ?? "",
      notes: "",
    });
    setAssignmentError(null);
    setAssignmentOpen(true);
  }

  async function saveAssignment() {
    if (!selectedAsset) return;
    const requiredMissing =
      (assignmentForm.targetType === "technician" && !assignmentForm.technicianId) ||
      (assignmentForm.targetType === "customer" && !assignmentForm.customerId) ||
      (assignmentForm.targetType === "site" && !assignmentForm.siteId) ||
      (assignmentForm.targetType === "work_order" && !assignmentForm.workOrderId) ||
      (assignmentForm.targetType === "storage" && !assignmentForm.locationId);
    if (requiredMissing) {
      setAssignmentError("Choose the destination before saving.");
      return;
    }

    setSavingAssignment(true);
    setAssignmentError(null);
    showActionNotice("info", "Updating asset assignment…");
    const { error: saveError } = await supabase.rpc("fieldops_transfer_asset", {
      p_asset_id: selectedAsset.id,
      p_target_type: assignmentForm.targetType,
      p_technician_id: assignmentForm.technicianId || null,
      p_customer_id: assignmentForm.customerId || null,
      p_site_id: assignmentForm.siteId || null,
      p_work_order_id: assignmentForm.workOrderId || null,
      p_location_id: assignmentForm.locationId || null,
      p_notes: assignmentForm.notes.trim() || null,
    });
    if (saveError) {
      setAssignmentError(saveError.message);
      showActionNotice("error", saveError.message);
      setSavingAssignment(false);
      return;
    }
    await loadAssets();
    setAssignmentOpen(false);
    setSavingAssignment(false);
    showActionNotice("success", "Asset assignment updated and added to history.");
  }

  function openAddMaintenance() {
    setEditingMaintenanceId(null);
    setMaintenanceForm(emptyMaintenanceForm);
    setMaintenanceError(null);
    setMaintenanceOpen(true);
  }

  function openEditMaintenance(item: DbAssetMaintenance) {
    setEditingMaintenanceId(item.id);
    setMaintenanceForm({
      maintenanceType: item.maintenance_type,
      status: item.status,
      title: item.title,
      description: item.description ?? "",
      provider: item.provider ?? "",
      scheduledDate: item.scheduled_date ?? "",
      completedDate: item.completed_date ?? "",
      cost: item.cost?.toString() ?? "",
      workOrderId: item.work_order_id ?? "",
      notes: item.notes ?? "",
    });
    setMaintenanceError(null);
    setMaintenanceOpen(true);
  }

  async function saveMaintenance() {
    if (!selectedAsset) return;
    if (!maintenanceForm.title.trim()) {
      setMaintenanceError("Maintenance title is required.");
      return;
    }
    const cost = numberOrNull(maintenanceForm.cost);
    if (Number.isNaN(cost)) {
      setMaintenanceError("Maintenance cost must be a valid non-negative number.");
      return;
    }
    if (maintenanceForm.status === "completed" && !maintenanceForm.completedDate) {
      setMaintenanceError("Completed maintenance requires a completed date.");
      return;
    }

    setSavingMaintenance(true);
    setMaintenanceError(null);
    const payload = {
      asset_id: selectedAsset.id,
      work_order_id: maintenanceForm.workOrderId || null,
      maintenance_type: maintenanceForm.maintenanceType,
      status: maintenanceForm.status,
      title: maintenanceForm.title.trim(),
      description: maintenanceForm.description.trim() || null,
      provider: maintenanceForm.provider.trim() || null,
      scheduled_date: maintenanceForm.scheduledDate || null,
      completed_date: maintenanceForm.completedDate || null,
      cost,
      notes: maintenanceForm.notes.trim() || null,
    };

    const result = editingMaintenanceId
      ? await supabase.from("asset_maintenance").update(payload).eq("id", editingMaintenanceId)
      : await supabase.from("asset_maintenance").insert(payload);
    if (result.error) {
      setMaintenanceError(result.error.message);
      showActionNotice("error", result.error.message);
      setSavingMaintenance(false);
      return;
    }
    await loadAssets();
    setMaintenanceOpen(false);
    setSavingMaintenance(false);
    showActionNotice("success", editingMaintenanceId ? "Maintenance record updated." : "Maintenance record added.");
  }

  function openAddDocument() {
    setDocumentForm(emptyDocumentForm);
    setDocumentError(null);
    setDocumentOpen(true);
  }

  async function saveDocument() {
    if (!selectedAsset) return;
    if (!documentForm.name.trim() || !documentForm.url.trim()) {
      setDocumentError("Document name and URL are required.");
      return;
    }
    try {
      const parsed = new URL(documentForm.url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid");
    } catch {
      setDocumentError("Enter a valid http:// or https:// document URL.");
      return;
    }
    setSavingDocument(true);
    const { error: saveError } = await supabase.from("asset_documents").insert({
      asset_id: selectedAsset.id,
      document_type: documentForm.documentType,
      name: documentForm.name.trim(),
      url: documentForm.url.trim(),
      expires_on: documentForm.expiresOn || null,
      notes: documentForm.notes.trim() || null,
    });
    if (saveError) {
      setDocumentError(saveError.message);
      showActionNotice("error", saveError.message);
      setSavingDocument(false);
      return;
    }
    await loadAssets();
    setDocumentOpen(false);
    setSavingDocument(false);
    showActionNotice("success", "Document link added.");
  }

  async function removeDocument(item: DbAssetDocument) {
    if (!window.confirm(`Remove document link “${item.name}”?`)) return;
    const { error: removeError } = await supabase.from("asset_documents").delete().eq("id", item.id);
    if (removeError) {
      showActionNotice("error", removeError.message);
      return;
    }
    await loadAssets();
    showActionNotice("success", "Document link removed.");
  }

  function openAddNote() {
    setNoteText("");
    setNoteError(null);
    setNoteOpen(true);
  }

  async function saveNote() {
    if (!selectedAsset) return;
    if (!noteText.trim()) {
      setNoteError("Enter a note before saving.");
      return;
    }
    setSavingNote(true);
    const { error: saveError } = await supabase.from("asset_notes").insert({ asset_id: selectedAsset.id, note: noteText.trim() });
    if (saveError) {
      setNoteError(saveError.message);
      showActionNotice("error", saveError.message);
      setSavingNote(false);
      return;
    }
    await loadAssets();
    setNoteOpen(false);
    setSavingNote(false);
    showActionNotice("success", "Asset note added.");
  }

  if (authRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md border border-border bg-card p-6 text-center">
          <div className="text-xl font-black">FieldOps sign-in required</div>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to view company assets.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ActionNotice notice={actionNotice} onClose={() => setActionNotice(null)} />
      <div className="grid min-h-screen grid-cols-[236px_1fr]">
        <aside className="border-r border-border bg-card">
          <div className="border-b border-border px-5 py-5">
            <div className="text-lg font-black">FieldOps</div>
            <div className="text-xs text-muted-foreground">Service Operations</div>
          </div>
          <nav className="space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" />{item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex h-10 w-[420px] items-center gap-2 border border-border px-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Search work orders, customers, technicians...
            </div>
            <div className="flex items-center gap-2">
              <FieldOpsThemeToggle />
              <button className="flex h-10 w-10 items-center justify-center border border-border" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-primary">Assets</div>
                <h1 className="mt-1 text-3xl font-black">Asset Management</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Track serialized company equipment from purchase through assignment, service, repair, retirement and disposal without mixing it with quantity-based inventory.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void loadAssets()} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
                {canManage && <button type="button" onClick={openNewAsset} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4" /> New Asset</button>}
              </div>
            </div>

            {error && <div className="mt-5 border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</div>}

            <div className="mt-6">
              <AssetSummaryCards
                totalAssets={snapshots.length}
                assignedAssets={snapshots.filter((item) => ["assigned", "in_use"].includes(item.asset.status)).length}
                maintenanceDue={snapshots.filter((item) => item.maintenanceDue || item.asset.status === "repair").length}
                unavailableAssets={snapshots.filter((item) => item.unavailable).length}
                onView={setSummaryView}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border border-border bg-card p-3">
              <div className="flex min-w-[280px] flex-1 items-center gap-2 border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Search asset tag, serial, model, type or assignment" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 border border-border bg-background px-3 text-xs font-bold">
                <option value="all">All statuses</option><option value="available">Available</option><option value="assigned">Assigned</option><option value="in_use">In Service</option><option value="repair">Repair</option><option value="retired">Retired</option><option value="lost">Lost</option><option value="disposed">Disposed</option>
              </select>
              <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)} className="h-10 border border-border bg-background px-3 text-xs font-bold">
                <option value="all">All ownership</option><option value="company">Company</option><option value="customer">Customer</option><option value="leased">Leased</option><option value="other">Other</option>
              </select>
            </div>

            <div className="mt-4">
              {loading && assets.length === 0 ? <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading assets…</div> : <AssetTable snapshots={filteredSnapshots} now={effectiveNow} onOpen={openAsset} />}
            </div>
          </div>
        </section>
      </div>

      {summaryView && <AssetSummaryModal view={summaryView} snapshots={summarySnapshots} onOpenAsset={(id) => { setSummaryView(null); openAsset(id); }} onClose={() => setSummaryView(null)} />}

      {selectedAsset && selectedSnapshot && (
        <AssetDetailModal
          asset={selectedAsset}
          snapshot={selectedSnapshot}
          tab={detailTab}
          history={selectedHistory}
          maintenance={selectedMaintenance}
          documents={selectedDocuments}
          notes={selectedNotes}
          relatedWorkOrders={relatedWorkOrders}
          profileMap={profileMap}
          customerMap={customerMap}
          siteMap={siteMap}
          workOrderMap={workOrderMap}
          locationMap={locationMap}
          now={effectiveNow}
          canManage={canManage}
          canAddNote={canAddNote}
          onTabChange={setDetailTab}
          onEdit={openEditAsset}
          onAssign={openAssignment}
          onAddMaintenance={openAddMaintenance}
          onEditMaintenance={openEditMaintenance}
          onAddDocument={openAddDocument}
          onRemoveDocument={(item) => void removeDocument(item)}
          onAddNote={openAddNote}
          onClose={() => setSelectedAssetId(null)}
        />
      )}

      {assetFormOpen && <AssetFormModal mode={assetFormMode} form={assetForm} error={assetFormError} saving={savingAsset} onChange={setAssetForm} onSave={() => void saveAsset()} onClose={() => setAssetFormOpen(false)} />}
      {assignmentOpen && selectedSnapshot && <AssignmentModal assetName={selectedSnapshot.displayName} form={assignmentForm} profiles={profiles} customers={customers} sites={sites} workOrders={workOrders} locations={locations} error={assignmentError} saving={savingAssignment} onChange={setAssignmentForm} onSave={() => void saveAssignment()} onClose={() => setAssignmentOpen(false)} />}
      {maintenanceOpen && <MaintenanceModal mode={editingMaintenanceId ? "edit" : "create"} form={maintenanceForm} workOrders={workOrders} error={maintenanceError} saving={savingMaintenance} onChange={setMaintenanceForm} onSave={() => void saveMaintenance()} onClose={() => setMaintenanceOpen(false)} />}
      {documentOpen && <DocumentModal form={documentForm} error={documentError} saving={savingDocument} onChange={setDocumentForm} onSave={() => void saveDocument()} onClose={() => setDocumentOpen(false)} />}
      {noteOpen && <AddAssetNoteModal note={noteText} error={noteError} saving={savingNote} onChange={setNoteText} onSave={() => void saveNote()} onClose={() => setNoteOpen(false)} />}
    </main>
  );
}
