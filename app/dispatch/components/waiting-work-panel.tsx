"use client";

import { Clock3, MapPin } from "lucide-react";
import type { DragJobPayload, WaitingJob } from "../types";

export function WaitingWorkPanel({
  loading,
  waitingJobs,
  selectedJob,
  focusJobUuid,
  focusPulse,
  onSelectJob,
}: {
  loading: boolean;
  waitingJobs: WaitingJob[];
  selectedJob: WaitingJob | null;
  focusJobUuid: string | null;
  focusPulse: boolean;
  onSelectJob: (jobUuid: string) => void;
}) {
  return (
                    <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
                      <div className="border-b border-border px-4 py-4">
                        <h2 className="font-bold">Waiting work</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Select one to compare dispatch fit. Drag it onto a technician track to assign.
                        </p>
                      </div>

                      {loading ? (
                        <div className="p-5 text-sm text-muted-foreground">Loading live work orders…</div>
                      ) : waitingJobs.length === 0 ? (
                        <div className="p-5 text-sm text-muted-foreground">
                          No unassigned work orders are waiting.
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {waitingJobs.map((job) => {
                            const selected = job.uuid === selectedJob?.uuid;
                            const focused = job.uuid === focusJobUuid;
                            return (
                              <button
                                key={job.uuid}
                                type="button"
                                data-fieldops-work-order={job.uuid}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = "move";
                                  const payload: DragJobPayload = {
                                    kind: "waiting",
                                    jobUuid: job.uuid,
                                  };
                                  event.dataTransfer.setData(
                                    "application/x-fieldops-job",
                                    JSON.stringify(payload)
                                  );
                                  event.dataTransfer.setData("text/plain", job.uuid);
                                }}
                                onClick={() => onSelectJob(job.uuid)}
                                className={`relative w-full p-4 text-left transition ${
                                  selected ? "bg-primary/[0.07]" : "hover:bg-row-hover"
                                } ${
                                  focused && focusPulse
                                    ? "ring-2 ring-inset ring-primary animate-pulse"
                                    : ""
                                }`}
                              >
                                {focused && focusPulse && (
                                  <span className="absolute right-3 top-3 border border-primary bg-background px-1.5 py-0.5 text-[8px] font-black text-primary animate-pulse">
                                    THIS JOB
                                  </span>
                                )}
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-black text-primary">{job.id}</span>
                                  <span
                                    className={`border px-2 py-1 text-[10px] font-bold rounded-none ${job.tone}`}
                                  >
                                    {job.priority}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm font-bold">{job.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{job.customer}</div>
                                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {job.place}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {job.time}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>

  );
}
