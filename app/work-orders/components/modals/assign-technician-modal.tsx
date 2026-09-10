import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { AssignTechnicianForm, DbProfile, DbWorkOrder, ServerAvailability } from "../../types";
import { formatAvailabilityWindows } from "../../utils";

type Props = { selectedOrder: DbWorkOrder; assignForm: AssignTechnicianForm; setAssignForm: Dispatch<SetStateAction<AssignTechnicianForm>>; assignError: string | null; savingAssignment: boolean; technicians: DbProfile[]; serverAvailability: Map<string, ServerAvailability>; serverAvailabilityLoading: boolean; serverAvailabilityError: string | null; onClose: () => void; onSave: () => void; };

export function AssignTechnicianModal(props: Props) {
  const { selectedOrder, assignForm, setAssignForm, assignError, savingAssignment, technicians, serverAvailability, serverAvailabilityLoading, serverAvailabilityError, onClose, onSave } = props;
  return (
    <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close technician assignment"
        onClick={() => {
          if (!savingAssignment) onClose();
        }}
        className="absolute inset-0 bg-black/55"
      />

      <section className="relative z-10 w-full max-w-[620px] border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-primary">
              Assign Technician
            </div>
            <h3 className="mt-1 text-lg font-bold">
              {selectedOrder.work_order_number}
            </h3>
            <div className="mt-1 text-sm text-muted-foreground">
              {selectedOrder.title}
            </div>
          </div>

          <button
            type="button"
            disabled={savingAssignment}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {assignError && (
          <div className="mt-4 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
            {assignError}
          </div>
        )}

        {technicians.length === 0 ? (
          <div className="mt-5 border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
            No active users currently have the Technician role.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold">Technician</span>
              <select
                value={assignForm.technicianId}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    technicianId: event.target.value,
                  }))
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
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

              {assignForm.technicianId && (
                <div className="mt-2 text-[10px]">
                  {(() => {
                    const availability =
                      serverAvailability.get(
                        assignForm.technicianId
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

            <label>
              <span className="mb-1.5 block text-xs font-bold">Date</span>
              <input
                type="date"
                value={assignForm.date}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <div />

            <label>
              <span className="mb-1.5 block text-xs font-bold">Start</span>
              <input
                type="time"
                step={900}
                value={assignForm.startTime}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold">End</span>
              <input
                type="time"
                step={900}
                value={assignForm.endTime}
                onChange={(event) =>
                  setAssignForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={savingAssignment}
            onClick={onClose}
            className="h-10 border border-border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savingAssignment || technicians.length === 0}
            onClick={onSave}
            className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {savingAssignment ? "Assigning…" : "Save Assignment"}
          </button>
        </div>
      </section>
    </div>
  );
}
