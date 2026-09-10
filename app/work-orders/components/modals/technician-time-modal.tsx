import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DbProfile, DbTimeEntry, DbWorkOrder, ServerAvailability, TimeEditorForm } from "../../types";
import { dateTimeLocalInputFromIso, dateTimePartDate, dateTimePartHour, dateTimePartMinute, formatAvailabilityWindows, formatLocalDateTime24, isTerminalWorkOrderStatus, mergeDateTimeParts, minutesLabel } from "../../utils";

type Props = { selectedOrder: DbWorkOrder; editingTimeEntryId: string | null; editingTimeEntry: DbTimeEntry | null; timeEditorForm: TimeEditorForm; setTimeEditorForm: Dispatch<SetStateAction<TimeEditorForm>>; timeEditorError: string | null; savingTimeEditor: boolean; technicians: DbProfile[]; serverAvailability: Map<string, ServerAvailability>; serverAvailabilityLoading: boolean; serverAvailabilityError: string | null; timeEditorPlannedStartIso: string | null; timeEditorPlannedEndIso: string | null; timeEditorPlannedMinutes: number | null; timeEditorRecordedMinutes: number | null; timeEditorActualMinutes: number | null; timeEditorVariance: string; onClose: () => void; onSave: () => void; };

export function TechnicianTimeModal(props: Props) {
  const { selectedOrder, editingTimeEntryId, editingTimeEntry, timeEditorForm, setTimeEditorForm, timeEditorError, savingTimeEditor, technicians, serverAvailability, serverAvailabilityLoading, serverAvailabilityError, timeEditorPlannedStartIso, timeEditorPlannedEndIso, timeEditorPlannedMinutes, timeEditorRecordedMinutes, timeEditorActualMinutes, timeEditorVariance, onClose, onSave } = props;
  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close time editor"
        onClick={() => {
          if (!savingTimeEditor) onClose();
        }}
        className="absolute inset-0 bg-black/60"
      />

      <section className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-xs font-black text-primary">
              ADMIN / MANAGER CONTROL
            </div>
            <h3 className="mt-1 text-lg font-bold">
              {editingTimeEntryId
                ? "Correct Technician Time"
                : "Add Technician Time Segment"}
            </h3>
            <div className="mt-1 text-sm text-muted-foreground">
              {selectedOrder.work_order_number} · {selectedOrder.title}
            </div>
          </div>
          <button
            type="button"
            disabled={savingTimeEditor}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Historical time changes are audited. The original value, corrected
            value, reason, user, and correction time are preserved.
          </div>

          {!editingTimeEntryId && (
            <div className="mb-4 border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-700 dark:text-cyan-300">
              <span className="font-black">Use separate time segments.</span>{" "}
              Example: Work 11:00–12:00, Break 12:00–12:30, Work 12:30–1:30.
              Break/Lunch defaults to non-billable. Segments should not overlap.
            </div>
          )}

          {timeEditorError && (
            <div className="mb-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
              {timeEditorError}
            </div>
          )}

          <div className="mb-5 grid gap-3 lg:grid-cols-2">
            <section className="border border-border bg-muted/30">
              <div className="border-b border-border px-4 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Work Order Schedule
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Original planned time · read only
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="p-3">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">
                    Scheduled Start
                  </div>
                  <div className="mt-1 text-xs font-bold">
                    {timeEditorPlannedStartIso
                      ? formatLocalDateTime24(timeEditorPlannedStartIso)
                      : "Not set"}
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">
                    Scheduled End
                  </div>
                  <div className="mt-1 text-xs font-bold">
                    {timeEditorPlannedEndIso
                      ? formatLocalDateTime24(timeEditorPlannedEndIso)
                      : "Not set"}
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-[9px] font-black uppercase text-muted-foreground">
                    Planned Duration
                  </div>
                  <div className="mt-1 text-xs font-black text-primary">
                    {minutesLabel(timeEditorPlannedMinutes)}
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-border bg-muted/30">
              <div className="border-b border-border px-4 py-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {editingTimeEntry
                    ? "Current Recorded Time"
                    : "Current Actual Record"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {editingTimeEntry
                    ? "Existing technician record · read only"
                    : "No technician time has been recorded yet"}
                </div>
              </div>

              {editingTimeEntry ? (
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="p-3">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">
                      Recorded Start
                    </div>
                    <div className="mt-1 text-xs font-bold">
                      {formatLocalDateTime24(editingTimeEntry.started_at)}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">
                      Recorded End
                    </div>
                    <div className="mt-1 text-xs font-bold">
                      {editingTimeEntry.ended_at
                        ? formatLocalDateTime24(editingTimeEntry.ended_at)
                        : "ACTIVE / No end"}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="text-[9px] font-black uppercase text-muted-foreground">
                      Recorded Duration
                    </div>
                    <div className="mt-1 text-xs font-black">
                      {editingTimeEntry.ended_at
                        ? minutesLabel(timeEditorRecordedMinutes)
                        : "ACTIVE"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  The editable values below start from the work order schedule.
                  Change the start, end, or both to match what actually happened.
                </div>
              )}
            </section>
          </div>

          <section className="mb-4 border border-primary/30 bg-primary/[0.04]">
            <div className="border-b border-primary/20 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                Corrected Actual Time
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                These values will become the technician's actual record.
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
              <div className="p-3">
                <div className="text-[9px] font-black uppercase text-muted-foreground">
                  Editable Actual Start
                </div>
                <div className="mt-1 text-xs font-bold">
                  {timeEditorForm.startedAt
                    ? formatLocalDateTime24(timeEditorForm.startedAt)
                    : "Not set"}
                </div>
              </div>

              <div className="p-3">
                <div className="text-[9px] font-black uppercase text-muted-foreground">
                  Editable Actual End
                </div>
                <div className="mt-1 text-xs font-bold">
                  {timeEditorForm.endedAt
                    ? formatLocalDateTime24(timeEditorForm.endedAt)
                    : "ACTIVE / No end"}
                </div>
              </div>

              <div className="p-3">
                <div className="text-[9px] font-black uppercase text-muted-foreground">
                  Actual Duration
                </div>
                <div className="mt-1 text-xs font-black text-primary">
                  {timeEditorActualMinutes === null
                    ? "Not available"
                    : minutesLabel(timeEditorActualMinutes)}
                </div>
              </div>

              <div className="p-3">
                <div className="text-[9px] font-black uppercase text-muted-foreground">
                  Vs Planned
                </div>
                <div
                  className={`mt-1 text-xs font-black ${
                    timeEditorActualMinutes !== null &&
                    timeEditorPlannedMinutes !== null &&
                    timeEditorActualMinutes > timeEditorPlannedMinutes
                      ? "text-rose-500"
                      : timeEditorActualMinutes !== null &&
                        timeEditorPlannedMinutes !== null &&
                        timeEditorActualMinutes < timeEditorPlannedMinutes
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  }`}
                >
                  {timeEditorVariance}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold">
                Technician
              </span>

              {serverAvailabilityError && (
                <div className="mb-2 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-500">
                  Availability could not be verified from the database.
                </div>
              )}
              <select
                value={timeEditorForm.technicianId}
                disabled={editingTimeEntryId !== null}
                onChange={(event) =>
                  setTimeEditorForm((current) => ({
                    ...current,
                    technicianId: event.target.value,
                  }))
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm disabled:opacity-60"
              >
                {technicians.map((technician) => {
                  const availability =
                    serverAvailability.get(technician.id);

                  const label = serverAvailabilityLoading
                    ? "Checking availability…"
                    : availability
                    ? formatAvailabilityWindows(
                        availability.free_windows
                      )
                    : serverAvailabilityError
                    ? "Availability unavailable"
                    : "Availability unavailable";

                  return (
                    <option
                      key={technician.id}
                      value={technician.id}
                    >
                      {technician.full_name ??
                        technician.email ??
                        "Technician"}{" "}
                      — {label}
                    </option>
                  );
                })}
              </select>

              {timeEditorForm.technicianId && (
                <div className="mt-2 text-[10px]">
                  {(() => {
                    const availability =
                      serverAvailability.get(
                        timeEditorForm.technicianId
                      );

                    if (serverAvailabilityLoading) {
                      return (
                        <span className="font-bold text-muted-foreground">
                          Checking availability…
                        </span>
                      );
                    }

                    if (serverAvailabilityError || !availability) {
                      return (
                        <span className="font-bold text-rose-500">
                          Availability unavailable
                        </span>
                      );
                    }

                    return (
                      <span
                        className={
                          availability.fits_requested_window
                            ? "font-bold text-emerald-600 dark:text-emerald-400"
                            : "font-bold text-amber-700 dark:text-amber-300"
                        }
                      >
                        {formatAvailabilityWindows(
                          availability.free_windows
                        )}
                      </span>
                    );
                  })()}
                </div>
              )}
            </label>

            <div>
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <span className="block text-xs font-bold">
                  Actual Start
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  24-hour time
                </span>
              </div>

              <div className="grid grid-cols-[1fr_88px_88px] gap-2">
                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Date
                  </span>
                  <input
                    type="date"
                    value={dateTimePartDate(timeEditorForm.startedAt)}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        startedAt: mergeDateTimeParts(
                          current.startedAt,
                          "date",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Hour
                  </span>
                  <select
                    value={dateTimePartHour(timeEditorForm.startedAt)}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        startedAt: mergeDateTimeParts(
                          current.startedAt,
                          "hour",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value = String(hour).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Minute
                  </span>
                  <select
                    value={dateTimePartMinute(timeEditorForm.startedAt)}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        startedAt: mergeDateTimeParts(
                          current.startedAt,
                          "minute",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm"
                  >
                    {Array.from({ length: 60 }, (_, minute) => {
                      const value = String(minute).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <div className="mt-2 border border-border bg-muted/30 px-3 py-2 text-xs">
                Selected:{" "}
                <span className="font-black">
                  {timeEditorForm.startedAt
                    ? formatLocalDateTime24(timeEditorForm.startedAt)
                    : "Not set"}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <span className="block text-xs font-bold">
                  Actual End
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  24-hour time
                </span>
              </div>

              <div className="grid grid-cols-[1fr_88px_88px] gap-2">
                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Date
                  </span>
                  <input
                    type="date"
                    value={dateTimePartDate(timeEditorForm.endedAt)}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        endedAt: mergeDateTimeParts(
                          current.endedAt,
                          "date",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Hour
                  </span>
                  <select
                    value={dateTimePartHour(timeEditorForm.endedAt)}
                    disabled={!timeEditorForm.endedAt}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        endedAt: mergeDateTimeParts(
                          current.endedAt,
                          "hour",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm disabled:opacity-50"
                  >
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value = String(hour).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-black uppercase text-muted-foreground">
                    Minute
                  </span>
                  <select
                    value={dateTimePartMinute(timeEditorForm.endedAt)}
                    disabled={!timeEditorForm.endedAt}
                    onChange={(event) =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        endedAt: mergeDateTimeParts(
                          current.endedAt,
                          "minute",
                          event.target.value
                        ),
                      }))
                    }
                    className="h-11 w-full border border-border bg-card px-2 text-sm disabled:opacity-50"
                  >
                    {Array.from({ length: 60 }, (_, minute) => {
                      const value = String(minute).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/30 px-3 py-2 text-xs">
                <span>
                  Selected:{" "}
                  <span className="font-black">
                    {timeEditorForm.endedAt
                      ? formatLocalDateTime24(timeEditorForm.endedAt)
                      : "ACTIVE / no end"}
                  </span>
                </span>

                {!isTerminalWorkOrderStatus(selectedOrder.status) && (
                  <button
                    type="button"
                    onClick={() =>
                      setTimeEditorForm((current) => ({
                        ...current,
                        endedAt: current.endedAt
                          ? ""
                          : dateTimeLocalInputFromIso(
                              timeEditorPlannedEndIso
                            ),
                      }))
                    }
                    className="border border-border px-2 py-1 text-[10px] font-bold hover:bg-muted"
                  >
                    {timeEditorForm.endedAt
                      ? "Mark Active / No End"
                      : "Restore Planned End"}
                  </button>
                )}
              </div>

              <span className="mt-1 block text-[10px] text-muted-foreground">
                Closed/finished work orders require an end time.
              </span>
            </div>

            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Activity
              </span>
              <select
                value={timeEditorForm.activityType}
                onChange={(event) => {
                  const nextActivity = event.target.value;

                  setTimeEditorForm((current) => ({
                    ...current,
                    activityType: nextActivity,
                    billable:
                      nextActivity === "break"
                        ? false
                        : current.activityType === "break"
                        ? true
                        : current.billable,
                  }));
                }}
                className="h-11 w-full border border-border bg-card px-3 text-sm"
              >
                <option value="travel">Travel</option>
                <option value="on_site">On Site</option>
                <option value="work">Work / Labour</option>
                <option value="waiting">Waiting</option>
                <option value="break">Break / Lunch</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="flex items-center gap-3 border border-border px-3 py-3">
              <input
                type="checkbox"
                checked={timeEditorForm.billable}
                onChange={(event) =>
                  setTimeEditorForm((current) => ({
                    ...current,
                    billable: event.target.checked,
                  }))
                }
              />
              <span>
                <span className="block text-xs font-bold">Billable labour</span>
                <span className="block text-[10px] text-muted-foreground">
                  Breaks/waiting can be marked non-billable.
                </span>
              </span>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Customer Billing Rate
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={timeEditorForm.billingRate}
                onChange={(event) =>
                  setTimeEditorForm((current) => ({
                    ...current,
                    billingRate: event.target.value,
                  }))
                }
                placeholder="Optional"
                className="h-11 w-full border border-border bg-card px-3 text-sm"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold">
                Technician Pay Rate
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={timeEditorForm.payRate}
                onChange={(event) =>
                  setTimeEditorForm((current) => ({
                    ...current,
                    payRate: event.target.value,
                  }))
                }
                placeholder="Optional"
                className="h-11 w-full border border-border bg-card px-3 text-sm"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold">
                Correction Reason <span className="text-rose-500">*</span>
              </span>
              <textarea
                rows={3}
                value={timeEditorForm.reason}
                onChange={(event) =>
                  setTimeEditorForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="e.g. Technician forgot to clock out; confirmed end time with supervisor."
                className="w-full border border-border bg-card p-3 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background p-4">
          <div className="min-w-0 flex-1">
            {timeEditorError ? (
              <div className="text-xs font-bold text-rose-500">
                {timeEditorError}
              </div>
            ) : timeEditorForm.reason.trim().length < 5 ? (
              <div className="text-xs font-bold text-amber-600 dark:text-amber-300">
                Correction reason is required before saving.
              </div>
            ) : (
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Ready to save.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={savingTimeEditor}
              onClick={onClose}
              className="h-10 border border-border px-4 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingTimeEditor}
              onClick={onSave}
              className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {savingTimeEditor
                ? "Saving…"
                : editingTimeEntryId
                ? "Save Correction"
                : "Add Time Segment"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
