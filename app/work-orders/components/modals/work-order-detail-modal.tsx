import { CheckCircle2, FileText, ReceiptText, Truck, UserRound, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DbAssignment, DbCustomer, DbEvent, DbNote, DbProfile, DbSite, DbTimeEntry, DbWorkOrder, EditWorkOrderForm, WorkOrderStatus } from "../../types";
import { allowedNormalWorkOrderTransitions, isTerminalWorkOrderStatus, priorityTone, statusLabel, statusTone } from "../../utils";
import { EditWorkOrderPanel } from "../edit-work-order-panel";
import { WorkOrderOverview } from "../work-order-overview";
import { ActivityPanel } from "../activity-panel";
import { NotesPanel } from "../notes-panel";

type Props = {
  selectedOrder: DbWorkOrder; customerMap: Map<string, DbCustomer>; siteMap: Map<string, DbSite>;
  selectedOrderDisplayAssignments: DbAssignment[]; selectedOrderDisplayAssignment: DbAssignment | null;
  selectedOrderTimeEntries: DbTimeEntry[]; localNowMs: number | null; profileMap: Map<string, DbProfile>;
  canCorrectTime: boolean; canRecoverBilling: boolean; isAdmin: boolean; selectedOrderIsAssigned: boolean;
  detailTab: "overview" | "activity" | "notes"; setDetailTab: Dispatch<SetStateAction<"overview" | "activity" | "notes">>;
  draftStatus: WorkOrderStatus; setDraftStatus: Dispatch<SetStateAction<WorkOrderStatus>>; savingStatus: boolean; statusError: string | null;
  editMode: boolean; editForm: EditWorkOrderForm | null; setEditMode: Dispatch<SetStateAction<boolean>>; setEditForm: Dispatch<SetStateAction<EditWorkOrderForm | null>>; savingEdit: boolean; setStatusError: Dispatch<SetStateAction<string | null>>;
  events: DbEvent[]; detailsLoading: boolean; notes: DbNote[]; noteText: string; setNoteText: Dispatch<SetStateAction<string>>; noteVisibility: "internal" | "customer"; setNoteVisibility: Dispatch<SetStateAction<"internal" | "customer">>; savingNote: boolean;
  onClose: () => void; onBeginEdit: () => void; onOpenAssignTechnician: () => void; onOpenInDispatch: () => void; onOpenBillingRecovery: () => void; onWaiveBilling: () => void; onAdminOverride: () => void; onCloseWorkOrder: () => void; onSaveStatus: () => void; onSaveEdit: () => void; onAddTime: (presetActivity?: "work" | "break") => void; onCorrectTime: (entry: DbTimeEntry) => void; onAddNote: () => void;
};

export function WorkOrderDetailModal(props: Props) {
  const { selectedOrder, customerMap, siteMap, selectedOrderDisplayAssignments, selectedOrderDisplayAssignment, selectedOrderTimeEntries, localNowMs, profileMap, canCorrectTime, canRecoverBilling, isAdmin, selectedOrderIsAssigned, detailTab, setDetailTab, draftStatus, setDraftStatus, savingStatus, statusError, editMode, editForm, setEditMode, setEditForm, savingEdit, setStatusError, events, detailsLoading, notes, noteText, setNoteText, noteVisibility, setNoteVisibility, savingNote, onClose, onBeginEdit, onOpenAssignTechnician, onOpenInDispatch, onOpenBillingRecovery, onWaiveBilling, onAdminOverride, onCloseWorkOrder, onSaveStatus, onSaveEdit, onAddTime, onCorrectTime, onAddNote } = props;
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close work order"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black text-primary">
              {selectedOrder.work_order_number}
            </div>
            <h2 className="mt-1 text-xl font-bold">{selectedOrder.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`border px-2 py-1 text-[9px] font-black rounded-none ${statusTone(
                  selectedOrder.status
                )}`}
              >
                {statusLabel(selectedOrder.status)}
              </span>
              <span
                className={`border px-2 py-1 text-[9px] font-black rounded-none ${priorityTone(
                  selectedOrder.priority
                )}`}
              >
                {statusLabel(selectedOrder.priority)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBeginEdit}
              className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-bold hover:bg-muted"
            >
              <FileText className="h-3.5 w-3.5" />
              Edit
            </button>

            {!isTerminalWorkOrderStatus(selectedOrder.status) && (
              <button
                type="button"
                onClick={onOpenAssignTechnician}
                className="inline-flex h-9 items-center gap-2 border border-primary/40 bg-primary/[0.06] px-3 text-xs font-bold text-primary hover:bg-primary/10"
              >
                <UserRound className="h-3.5 w-3.5" />
                Assign Technician
              </button>
            )}

            <button
              type="button"
              onClick={onOpenInDispatch}
              className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-bold hover:bg-muted"
            >
              <Truck className="h-3.5 w-3.5" />
              {selectedOrderIsAssigned ? "Locate in Dispatch" : "Dispatch Job"}
            </button>

            {canRecoverBilling &&
              selectedOrder.status === "closed" &&
              !["ready", "billed", "waived"].includes(
                selectedOrder.billing_status ?? "not_billed"
              ) && (
                <button
                  type="button"
                  onClick={onOpenBillingRecovery}
                  className="inline-flex h-9 items-center gap-2 border border-cyan-500/40 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-600 hover:bg-cyan-500/15 dark:text-cyan-400"
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  Recover Billing
                </button>
              )}

            {canRecoverBilling &&
              ["finished", "billing_ready"].includes(selectedOrder.status) &&
              !["billed", "waived"].includes(selectedOrder.billing_status ?? "not_billed") && (
                <button
                  type="button"
                  onClick={onWaiveBilling}
                  className="inline-flex h-9 items-center gap-2 border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-bold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  Waive Billing / No Charge
                </button>
              )}

            <button
              type="button"
              disabled={selectedOrder.status !== "billing_ready" || !["billed", "waived"].includes(selectedOrder.billing_status ?? "not_billed") || savingStatus}
              onClick={onCloseWorkOrder}
              title={selectedOrder.status !== "billing_ready" ? "Work Order must reach Billing Ready first." : !["billed", "waived"].includes(selectedOrder.billing_status ?? "not_billed") ? "Invoice must be billed or Billing must be waived before closing." : "Close Work Order"}
              className="inline-flex h-9 items-center gap-2 border border-rose-500/40 px-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Close Work Order
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex gap-2">
            {(["overview", "activity", "notes"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDetailTab(tab)}
                className={`border px-4 py-2 text-sm font-bold rounded-none ${
                  detailTab === tab
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {statusLabel(tab)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={draftStatus}
              onChange={(event) =>
                setDraftStatus(event.target.value as WorkOrderStatus)
              }
              className="h-10 border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
            >
              {[selectedOrder.status, ...allowedNormalWorkOrderTransitions(selectedOrder.status)]
                .filter((status, index, values) => values.indexOf(status) === index)
                .map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
            </select>

            <button
              type="button"
              disabled={savingStatus || draftStatus === selectedOrder.status}
              onClick={onSaveStatus}
              className="h-10 bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {savingStatus ? "Saving…" : "Update Status"}
            </button>

            {isAdmin && (
              <button
                type="button"
                disabled={savingStatus}
                onClick={onAdminOverride}
                className="h-10 border border-amber-500/40 px-3 text-xs font-black text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
              >
                Admin Override
              </button>
            )}
          </div>
        </div>

        {statusError && (
          <div className="mx-5 mt-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
            {statusError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {detailTab === "overview" && (
            editMode && editForm ? (
              <EditWorkOrderPanel
                form={editForm}
                setForm={setEditForm}
                saving={savingEdit}
                onCancel={() => {
                  setEditMode(false);
                  setEditForm(null);
                  setStatusError(null);
                }}
                onSave={onSaveEdit}
              />
            ) : (
              <WorkOrderOverview
                order={selectedOrder}
                customer={customerMap.get(selectedOrder.customer_id) ?? null}
                site={selectedOrder.site_id ? siteMap.get(selectedOrder.site_id) ?? null : null}
                assignments={selectedOrderDisplayAssignments}
                timeEntries={selectedOrderTimeEntries}
                visibleTechnicianId={
                  selectedOrderDisplayAssignment?.technician_id ?? null
                }
                currentTimeMs={localNowMs}
                profileMap={profileMap}
                canCorrectTime={canCorrectTime}
                canRecoverBilling={canRecoverBilling}
                onAddTime={onAddTime}
                onCorrectTime={onCorrectTime}
                onRecoverBilling={onOpenBillingRecovery}
              />
            )
          )}

          {detailTab === "activity" && (
            <ActivityPanel
              order={selectedOrder}
              assignments={selectedOrderDisplayAssignments}
              events={events}
              loading={detailsLoading}
              profileMap={profileMap}
            />
          )}

          {detailTab === "notes" && (
            <NotesPanel
              notes={notes}
              loading={detailsLoading}
              noteText={noteText}
              setNoteText={setNoteText}
              noteVisibility={noteVisibility}
              setNoteVisibility={setNoteVisibility}
              savingNote={savingNote}
              onAddNote={onAddNote}
              profileMap={profileMap}
            />
          )}
        </div>
      </section>
    </div>
  );
}
