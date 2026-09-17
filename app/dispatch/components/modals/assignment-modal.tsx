"use client";

import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { AssignmentModal as AssignmentModalState } from "../../types";
import {
  arrivalWindows,
  durationMinutesLabel,
  estimatedDurationOptionsMinutes,
  getArrivalWindow,
} from "../../constants";
import { formatLongDate } from "../../utils";
import { Info } from "../info";

export function DispatchAssignmentModal({
  assignmentModal,
  setAssignmentModal,
  assignmentError,
  setAssignmentError,
  savingAssignment,
  onAssign,
}: {
  assignmentModal: AssignmentModalState | null;
  setAssignmentModal: Dispatch<SetStateAction<AssignmentModalState | null>>;
  assignmentError: string | null;
  setAssignmentError: Dispatch<SetStateAction<string | null>>;
  savingAssignment: boolean;
  onAssign: () => void;
}) {
  if (!assignmentModal) return null;

  const arrivalWindow = getArrivalWindow(assignmentModal.arrivalWindowKey);
  const jobTypeLabel = assignmentModal.job.jobType?.trim() || "General service";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-primary">
              {assignmentModal.mode === "move" ? "Move Work Order" : "Confirm Dispatch"}
            </div>
            <h2 className="mt-1 text-lg font-bold">{assignmentModal.job.id}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {assignmentModal.job.title}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAssignmentModal(null);
              setAssignmentError(null);
            }}
            className="flex h-9 w-9 items-center justify-center border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {assignmentError && (
          <div className="mt-4 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
            {assignmentError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info
            label={assignmentModal.mode === "move" ? "Move to" : "Technician"}
            value={assignmentModal.tech.name}
          />
          <Info label="Dispatch fit" value={`${assignmentModal.tech.confidence}%`} />
          <Info label="Job type" value={jobTypeLabel} />
          <Info
            label="Job type default"
            value={durationMinutesLabel(assignmentModal.job.estimatedDurationMinutes)}
          />
        </div>

        <div className="mt-5 border border-border bg-muted/20 p-4">
          <div className="text-xs font-bold">Dispatch schedule</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            FieldOps uses the four company arrival windows. The scheduled duration starts with the Job Type estimate and can be adjusted in 15-minute steps for this appointment.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-[11px] font-bold">Date</span>
              <input
                type="date"
                value={assignmentModal.date}
                onChange={(event) =>
                  setAssignmentModal((current) =>
                    current ? { ...current, date: event.target.value } : current
                  )
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold">Arrival window</span>
              <select
                value={assignmentModal.arrivalWindowKey}
                onChange={(event) =>
                  setAssignmentModal((current) =>
                    current
                      ? {
                          ...current,
                          arrivalWindowKey: event.target.value as AssignmentModalState["arrivalWindowKey"],
                        }
                      : current
                  )
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                {arrivalWindows.map((window) => (
                  <option key={window.key} value={window.key}>
                    {window.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-bold">Scheduled duration</span>
              <select
                value={String(assignmentModal.scheduledDurationMinutes)}
                onChange={(event) =>
                  setAssignmentModal((current) =>
                    current
                      ? {
                          ...current,
                          scheduledDurationMinutes: Number(event.target.value),
                        }
                      : current
                  )
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                {estimatedDurationOptionsMinutes.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {durationMinutesLabel(minutes)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              {arrivalWindow
                ? `${formatLongDate(assignmentModal.date)} · Arrival ${arrivalWindow.label} · ${durationMinutesLabel(assignmentModal.scheduledDurationMinutes)} scheduled`
                : "Choose a date and arrival window."}
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Daily board: 8 AM–4 PM
            </span>
          </div>
        </div>

        {assignmentModal.job.description && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Job description
            </div>
            <div className="mt-1 text-sm leading-5">{assignmentModal.job.description}</div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignmentModal(null);
              setAssignmentError(null);
            }}
            className="h-10 border border-border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savingAssignment}
            onClick={onAssign}
            className="h-10 bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {savingAssignment
              ? assignmentModal.mode === "move"
                ? "Moving…"
                : "Assigning…"
              : assignmentModal.mode === "move"
              ? "Confirm Move"
              : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
