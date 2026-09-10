"use client";

import { ChevronRight } from "lucide-react";
import type { DragJobPayload, Technician, WaitingJob } from "../types";
import {
  BOARD_START_HOUR,
  BOARD_TOTAL_HOURS,
  boardHours,
} from "../constants";
import { formatHourHeader } from "../utils";
import { SingleLineTimeline } from "./single-line-timeline";

export function TechnicianTracksPanel({
  selectedJob,
  loading,
  technicians,
  boardShowsNow,
  boardNowRatio,
  boardNowLabel,
  focusJobUuid,
  focusPulse,
  boardUsesLiveNow,
  boardNowHour,
  onDropJob,
  onViewSchedule,
  onOpenOvertime,
}: {
  selectedJob: WaitingJob | null;
  loading: boolean;
  technicians: Technician[];
  boardShowsNow: boolean;
  boardNowRatio: number;
  boardNowLabel: string;
  focusJobUuid: string | null;
  focusPulse: boolean;
  boardUsesLiveNow: boolean;
  boardNowHour: number | null;
  onDropJob: (
    payload: DragJobPayload,
    techUuid: string,
    dropHour: number
  ) => void;
  onViewSchedule: (technicianUuid: string) => void;
  onOpenOvertime: (technicianUuid: string) => void;
}) {
  const techniciansWithFit = technicians;
  const handleDropJob = onDropJob;

  return (
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
                        <div>
                          <h2 className="font-bold">Technician tracks</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Technician | Daily Track
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedJob && (
                            <div className="border border-primary/30 bg-primary/[0.06] px-3 py-2 rounded-none">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Dispatch fit for
                              </div>
                              <div className="mt-0.5 text-xs font-black text-primary">
                                {selectedJob.id} · {selectedJob.title}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="overflow-x-auto"
                        data-dispatch-horizontal-scroll
                      >
                        <div className="min-w-[1120px]">
                          <div className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <div className="border-r border-border px-4 py-3">Technician</div>
                            <div className="px-3 py-3">Daily Track</div>
                          </div>

                          <div className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border bg-background/30">
                            <div className="border-r border-border" />
                            <div className="relative h-9">
                              {boardHours.map((hour, index) => {
                                const ratio =
                                  (hour - BOARD_START_HOUR) / BOARD_TOTAL_HOURS;
                                const alignClass =
                                  index === 0
                                    ? "translate-x-0"
                                    : index === boardHours.length - 1
                                    ? "-translate-x-full"
                                    : "-translate-x-1/2";

                                return (
                                  <div
                                    key={hour}
                                    className="absolute inset-y-0 border-l border-border/50"
                                    style={{ left: `${ratio * 100}%` }}
                                  >
                                    <span
                                      className={`absolute top-1.5 whitespace-nowrap text-[9px] font-semibold text-muted-foreground ${alignClass}`}
                                    >
                                      {formatHourHeader(hour)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {loading ? (
                            <div className="p-6 text-sm text-muted-foreground">Loading technicians…</div>
                          ) : techniciansWithFit.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">
                              No active users currently have the Technician role.
                            </div>
                          ) : (
                            <div className="relative">
                              {boardShowsNow && (
                                <div
                                  className="pointer-events-none absolute bottom-0 top-0 z-[70] w-px bg-rose-500"
                                  style={{
                                    left: `calc(${boardNowRatio * 100}% + ${250 * (1 - boardNowRatio)}px)`,
                                  }}
                                >
                                  <div className="absolute -top-5 -translate-x-1/2 whitespace-nowrap bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                                    NOW · {boardNowLabel}
                                  </div>
                                </div>
                              )}

                              {techniciansWithFit.map((tech) => (
                                <div
                                  key={tech.uuid}
                                  data-technician-row={tech.uuid}
                                  className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border last:border-b-0"
                                >
                                  <div className="flex items-start gap-3 border-r border-border p-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                                      {tech.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-bold">{tech.name}</div>
                                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                                        {tech.role}
                                      </div>

                                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <span
                                          className={`border px-1.5 py-0.5 text-[8px] font-black rounded-none ${
                                            tech.statusTone
                                          }`}
                                        >
                                          {tech.status}
                                        </span>

                                        {selectedJob && (
                                          <>
                                            <span
                                              className={`text-[9px] font-black ${
                                                tech.rank === 1 ? "text-primary" : "text-muted-foreground"
                                              }`}
                                            >
                                              {tech.confidence}% fit
                                            </span>
                                            {tech.rank === 1 && (
                                              <span className="border border-primary/30 px-1.5 py-0.5 text-[8px] font-black text-primary rounded-none">
                                                BEST
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => onViewSchedule(tech.uuid)}
                                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                                      >
                                        View schedule
                                        <ChevronRight className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <SingleLineTimeline
                                    track={tech.track}
                                    technicianId={tech.uuid}
                                    onDropJob={handleDropJob}
                                    focusJobUuid={focusJobUuid}
                                    focusPulse={focusPulse}
                                    currentHour={boardUsesLiveNow ? boardNowHour : null}
                                    overtimeCount={tech.overtime.length}
                                    onOpenOvertime={() => onOpenOvertime(tech.uuid)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
  );
}
