"use client";

import { X } from "lucide-react";
import type { Technician, WaitingJob } from "../../types";
import { TodaySchedule, WeekSchedule } from "../schedule-views";

export function TechnicianScheduleModal({
  selectedTech,
  selectedJob,
  scheduleView,
  selectedDate,
  onScheduleViewChange,
  onManageActualTime,
  onClose,
}: {
  selectedTech: Technician | null;
  selectedJob: WaitingJob | null;
  scheduleView: "today" | "week";
  selectedDate: string;
  onScheduleViewChange: (view: "today" | "week") => void;
  onManageActualTime: (workOrderUuid: string) => void;
  onClose: () => void;
}) {
  if (!selectedTech) return null;

  return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                aria-label="Close schedule"
                onClick={onClose}
                className="absolute inset-0 bg-black/45"
              />

              <section className="relative z-10 flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-primary">Technician Schedule</div>
                    <h2 className="mt-1 truncate text-xl font-bold">{selectedTech.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedTech.role}</span>
                      <span
                        className={`border px-2 py-1 text-[9px] font-black rounded-xl ${
                          selectedTech.statusTone
                        }`}
                      >
                        {selectedTech.status}
                      </span>
                      {selectedJob && (
                        <span className="border border-primary/25 bg-primary/[0.06] px-2 py-1 text-[9px] font-black text-primary">
                          {selectedTech.confidence}% FIT FOR {selectedJob.id}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onScheduleViewChange("today")}
                      className={`border px-4 py-2 text-sm font-bold rounded-xl ${
                        scheduleView === "today"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => onScheduleViewChange("week")}
                      className={`border px-4 py-2 text-sm font-bold rounded-xl ${
                        scheduleView === "week"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      Week
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-muted-foreground">{selectedDate}</div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {scheduleView === "today" ? (
                    <TodaySchedule items={selectedTech.today} selectedDate={selectedDate} onManageActualTime={onManageActualTime} />
                  ) : (
                    <WeekSchedule week={selectedTech.week} selectedDate={selectedDate} onManageActualTime={onManageActualTime} />
                  )}
                </div>
              </section>
            </div>
  );
}
