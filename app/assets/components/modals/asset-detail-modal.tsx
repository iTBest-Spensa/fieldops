"use client";

import { Edit3, MoveRight, X } from "lucide-react";
import type {
  AssetDetailTab,
  AssetSnapshot,
  DbAsset,
  DbAssetDocument,
  DbAssetHistory,
  DbAssetMaintenance,
  DbAssetNote,
  DbCustomer,
  DbInventoryLocation,
  DbProfile,
  DbSite,
  DbWorkOrder,
} from "../../types";
import { assetStatusLabel, assetStatusTone } from "../../utils";
import { AssetOverview } from "../asset-overview";
import { AssignmentHistoryPanel } from "../assignment-history-panel";
import { WorkOrdersPanel } from "../work-orders-panel";
import { MaintenancePanel } from "../maintenance-panel";
import { DocumentsPanel } from "../documents-panel";
import { NotesPanel } from "../notes-panel";

const tabs: Array<{ key: AssetDetailTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "Assignment History" },
  { key: "work_orders", label: "Work Orders" },
  { key: "maintenance", label: "Maintenance" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

export function AssetDetailModal({
  asset,
  snapshot,
  tab,
  history,
  maintenance,
  documents,
  notes,
  relatedWorkOrders,
  profileMap,
  customerMap,
  siteMap,
  workOrderMap,
  locationMap,
  now,
  canManage,
  canAddNote,
  onTabChange,
  onEdit,
  onAssign,
  onAddMaintenance,
  onEditMaintenance,
  onAddDocument,
  onRemoveDocument,
  onAddNote,
  onClose,
}: {
  asset: DbAsset;
  snapshot: AssetSnapshot;
  tab: AssetDetailTab;
  history: DbAssetHistory[];
  maintenance: DbAssetMaintenance[];
  documents: DbAssetDocument[];
  notes: DbAssetNote[];
  relatedWorkOrders: DbWorkOrder[];
  profileMap: Map<string, DbProfile>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
  workOrderMap: Map<string, DbWorkOrder>;
  locationMap: Map<string, DbInventoryLocation>;
  now: Date;
  canManage: boolean;
  canAddNote: boolean;
  onTabChange: (tab: AssetDetailTab) => void;
  onEdit: () => void;
  onAssign: () => void;
  onAddMaintenance: () => void;
  onEditMaintenance: (item: DbAssetMaintenance) => void;
  onAddDocument: () => void;
  onRemoveDocument: (item: DbAssetDocument) => void;
  onAddNote: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
      <button type="button" aria-label="Close asset details" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div>
            <div className="text-xs font-black text-primary">{asset.asset_tag || "Asset"}</div>
            <h2 className="mt-1 text-2xl font-black">{snapshot.displayName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`border px-2 py-1 text-[9px] font-black uppercase ${assetStatusTone(asset.status)}`}>{assetStatusLabel(asset.status)}</span>
              <span className="text-xs text-muted-foreground">{snapshot.assignmentLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <button type="button" onClick={onAssign} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted">
                  <MoveRight className="h-4 w-4" /> Change Assignment
                </button>
                <button type="button" onClick={onEdit} className="inline-flex h-10 items-center gap-2 bg-primary px-3 text-xs font-black text-primary-foreground">
                  <Edit3 className="h-4 w-4" /> Edit Asset
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border bg-card px-4 py-2">
          {tabs.map((item) => (
            <button key={item.key} type="button" onClick={() => onTabChange(item.key)} className={`px-3 py-2 text-xs font-black ${tab === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && <AssetOverview asset={asset} snapshot={snapshot} profileMap={profileMap} customerMap={customerMap} siteMap={siteMap} workOrderMap={workOrderMap} locationMap={locationMap} now={now} />}
          {tab === "history" && <AssignmentHistoryPanel history={history} profileMap={profileMap} customerMap={customerMap} siteMap={siteMap} workOrderMap={workOrderMap} locationMap={locationMap} />}
          {tab === "work_orders" && <WorkOrdersPanel workOrders={relatedWorkOrders} customerMap={customerMap} siteMap={siteMap} />}
          {tab === "maintenance" && <MaintenancePanel maintenance={maintenance} workOrderMap={workOrderMap} canManage={canManage} onAdd={onAddMaintenance} onEdit={onEditMaintenance} />}
          {tab === "documents" && <DocumentsPanel documents={documents} canManage={canManage} onAdd={onAddDocument} onRemove={onRemoveDocument} />}
          {tab === "notes" && <NotesPanel notes={notes} profileMap={profileMap} canAdd={canAddNote} onAdd={onAddNote} />}
        </div>
      </section>
    </div>
  );
}
