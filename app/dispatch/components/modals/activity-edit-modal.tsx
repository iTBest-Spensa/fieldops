"use client";

import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { ActivityEditModal as ActivityEditModalState } from "../../types";

export function ActivityEditModal({
  activityModal,
  setActivityModal,
  activityError,
  setActivityError,
  savingActivity,
  onSave,
}: {
  activityModal: ActivityEditModalState | null;
  setActivityModal: Dispatch<SetStateAction<ActivityEditModalState | null>>;
  activityError: string | null;
  setActivityError: Dispatch<SetStateAction<string | null>>;
  savingActivity: boolean;
  onSave: () => void;
}) {
  if (!activityModal) return null;

  const isActual = activityModal.kind === "actual";

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setActivityModal(null);
          setActivityError(null);
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {isActual ? "Edit Actual Activity" : "Edit Dispatch"}
            </div>
            <h2 className="mt-1 text-lg font-black">
              {activityModal.jobId} · {activityModal.jobTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Technician: {activityModal.technicianName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActivityModal(null);
              setActivityError(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
            aria-label="Close activity editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {activityError ? (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              {activityError}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">Start date</span>
              <input
                type="date"
                value={activityModal.startDate}
                onChange={(event) =>
                  setActivityModal((current) => current ? { ...current, startDate: event.target.value } : current)
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">Start time</span>
              <input
                type="time"
                step={60}
                value={activityModal.startTime}
                onChange={(event) =>
                  setActivityModal((current) => current ? { ...current, startTime: event.target.value } : current)
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">End date</span>
              <input
                type="date"
                value={activityModal.endDate}
                onChange={(event) =>
                  setActivityModal((current) => current ? { ...current, endDate: event.target.value } : current)
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                End time {isActual ? "(blank = still active)" : ""}
              </span>
              <input
                type="time"
                step={60}
                value={activityModal.endTime}
                onChange={(event) =>
                  setActivityModal((current) => current ? { ...current, endTime: event.target.value } : current)
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          {isActual ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">Activity</span>
                <select
                  value={activityModal.activityType}
                  onChange={(event) =>
                    setActivityModal((current) => current ? { ...current, activityType: event.target.value } : current)
                  }
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="travel">Travelling</option>
                  <option value="on_site">On Site</option>
                  <option value="work">Working</option>
                  <option value="waiting">Waiting</option>
                  <option value="break">Break / Lunch</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="flex h-11 items-center gap-3 self-end rounded-xl border border-border bg-card px-3">
                <input
                  type="checkbox"
                  checked={activityModal.billable}
                  onChange={(event) =>
                    setActivityModal((current) => current ? { ...current, billable: event.target.checked } : current)
                  }
                />
                <span className="text-sm font-bold">Billable activity</span>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-foreground">Correction reason</span>
                <textarea
                  value={activityModal.correctionReason}
                  onChange={(event) =>
                    setActivityModal((current) => current ? { ...current, correctionReason: event.target.value } : current)
                  }
                  placeholder="Required for an actual-time correction"
                  className="min-h-24 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Actual time corrections use FieldOps' audited correction workflow.
                </div>
              </label>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              This edits the scheduled dispatch for this exact technician assignment. It does not rewrite recorded actual technician time.
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setActivityModal(null);
                setActivityError(null);
              }}
              className="h-10 rounded-xl border border-border px-4 text-sm font-bold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingActivity}
              onClick={onSave}
              className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {savingActivity ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
