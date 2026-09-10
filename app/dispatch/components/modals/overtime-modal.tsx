"use client";

import { X } from "lucide-react";
import type { OvertimeItem, Technician } from "../../types";
import { formatLongDate } from "../../utils";
import { OvertimeTimeline } from "../overtime-timeline";

export function OvertimeModal({
  technician,
  items,
  selectedDate,
  focusJobUuid,
  focusTechnicianUuid,
  focusPulse,
  onClose,
}: {
  technician: Technician | null;
  items: OvertimeItem[];
  selectedDate: string;
  focusJobUuid: string | null;
  focusTechnicianUuid: string | null;
  focusPulse: boolean;
  onClose: () => void;
}) {
  if (!technician) return null;

  const overtimeTechnician = technician;
  const overtimeTechnicianItems = items;

  return (
            <div className="fixed inset-0 z-[95000] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Close overtime"
                onClick={onClose}
                className="absolute inset-0 bg-black/50"
              />

              <section className="relative z-10 flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
                  <div>
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Overtime
                    </div>
                    <h2 className="mt-1 text-xl font-bold">
                      {overtimeTechnician.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatLongDate(selectedDate)} · work outside 7:00 AM–5:00 PM
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {overtimeTechnicianItems.length === 0 ? (
                    <div className="border border-border p-6 text-center text-sm text-muted-foreground">
                      No overtime jobs are scheduled for this technician on this day.
                    </div>
                  ) : (
                    <OvertimeTimeline
                      items={overtimeTechnicianItems}
                      focusJobUuid={focusJobUuid}
                      focusTechnicianUuid={focusTechnicianUuid}
                      focusPulse={focusPulse}
                    />
                  )}
                </div>
              </section>
            </div>
  );
}
