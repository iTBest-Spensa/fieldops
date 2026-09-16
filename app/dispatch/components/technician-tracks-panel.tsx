"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Search, X } from "lucide-react";

import type { DragJobPayload, Segment, Technician, WaitingJob } from "../types";
import {
  BOARD_START_HOUR,
  BOARD_TOTAL_HOURS,
  boardHours,
  statusColors,
} from "../constants";
import { formatHourHeader } from "../utils";
import { SingleLineTimeline } from "./single-line-timeline";

type TrackDensity = "compact" | "detailed";

type DispatchFitHintData = {
  left: number;
  top: number;
  placement: "above" | "below";
  score: number;
  jobLabel: string;
  skillsMatch: string;
  scheduleFit: string;
  serviceArea: string;
  workload: string;
  timeConflict: string;
};

function DispatchFitHintPortal({
  hint,
}: {
  hint: DispatchFitHintData | null;
}) {
  if (!hint || typeof document === "undefined") return null;

  const above = hint.placement === "above";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99999] w-64 rounded-xl border border-border bg-background p-3 text-foreground shadow-2xl"
      style={{
        left: hint.left,
        top: hint.top,
        transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <div
        className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-border bg-background ${
          above
            ? "bottom-0 translate-y-1/2 border-b border-r"
            : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />

      <div className="text-[11px] font-black text-foreground">
        {hint.score}% Dispatch Fit
      </div>
      <div className="mt-0.5 truncate text-[9px] font-bold text-primary">
        {hint.jobLabel}
      </div>

      <div className="mt-2 grid grid-cols-[94px_1fr] gap-x-2 gap-y-1.5 text-[10px]">
        <span className="text-muted-foreground">Skills match:</span>
        <span className="font-bold">{hint.skillsMatch}</span>

        <span className="text-muted-foreground">Schedule fit:</span>
        <span className="font-bold">{hint.scheduleFit}</span>

        <span className="text-muted-foreground">Service area:</span>
        <span className="font-bold">{hint.serviceArea}</span>

        <span className="text-muted-foreground">Workload:</span>
        <span className="font-bold">{hint.workload}</span>

        <span className="text-muted-foreground">Time conflict:</span>
        <span className="font-bold">{hint.timeConflict}</span>
      </div>
    </div>,
    document.body
  );
}

const STATUS_PRIORITY: Record<string, number> = {
  WAITING: 0,
  TRAVELLING: 1,
  "ON SITE": 2,
  WORKING: 3,
  ASSIGNED: 4,
  AVAILABLE: 5,
  COMPLETE: 6,
};

function normalizeStatus(status: string) {
  return status.trim().toUpperCase();
}

function sortTechnicians(a: Technician, b: Technician) {
  const aStatus = normalizeStatus(a.status);
  const bStatus = normalizeStatus(b.status);

  const statusDifference =
    (STATUS_PRIORITY[aStatus] ?? 50) -
    (STATUS_PRIORITY[bStatus] ?? 50);

  if (statusDifference !== 0) return statusDifference;
  return a.name.localeCompare(b.name);
}

export function TechnicianTracksPanel({
  selectedJob,
  loading,
  technicians,
  boardShowsNow,
  boardNowRatio,
  boardNowLabel,
  focusJobUuid,
  focusAssignmentId,
  focusPulse,
  onEditActivity,
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
  focusAssignmentId: string | null;
  focusPulse: boolean;
  onEditActivity: (segment: Segment, technicianId: string) => void;
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
  const [density, setDensity] = useState<TrackDensity>("compact");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [fitHint, setFitHint] = useState<DispatchFitHintData | null>(null);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          technicians
            .map((tech) => normalizeStatus(tech.status))
            .filter(Boolean)
        )
      ).sort(
        (a, b) =>
          (STATUS_PRIORITY[a] ?? 50) -
            (STATUS_PRIORITY[b] ?? 50) ||
          a.localeCompare(b)
      ),
    [technicians]
  );

  const teamOptions = useMemo(
    () =>
      Array.from(
        new Set(
          technicians
            .map((tech) => tech.role?.trim() || "Technician")
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [technicians]
  );

  const filteredTechnicians = useMemo(() => {
    const query = search.trim().toLowerCase();

    return technicians
      .filter((tech) => {
        const status = normalizeStatus(tech.status);
        const team = tech.role?.trim() || "Technician";

        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (teamFilter !== "all" && team !== teamFilter) return false;

        if (!query) return true;

        return [tech.name, tech.role, tech.status]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
      .sort(sortTechnicians);
  }, [search, statusFilter, teamFilter, technicians]);

  const technicianColumnWidth = density === "compact" ? 218 : 250;
  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    teamFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTeamFilter("all");
  }

  function openFitHint(
    target: HTMLElement,
    details: {
      score: number;
      skillsMatch: string;
      scheduleFit: string;
      serviceArea: string;
      workload: string;
      timeConflict: string;
    }
  ) {
    if (!selectedJob) return;

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 256;
    const half = tooltipWidth / 2;

    const left = Math.min(
      Math.max(rect.left + rect.width / 2, half + 10),
      window.innerWidth - half - 10
    );

    const useAbove = rect.bottom + 210 > window.innerHeight;

    setFitHint({
      ...details,
      jobLabel: `${selectedJob.id} · ${selectedJob.title}`,
      left,
      top: useAbove ? rect.top - 8 : rect.bottom + 8,
      placement: useAbove ? "above" : "below",
    });
  }

  return (
    <section className="flex h-[calc(100vh-145px)] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-[190px] shrink-0">
            <h2 className="font-bold">Technician tracks</h2>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Technician | Daily Track · {filteredTechnicians.length} of{" "}
              {technicians.length} shown
            </p>
          </div>

          {/* Keep all controls aligned to the right */}
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <label className="relative w-[280px] shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search technician, team or status"
                className="h-9 w-full border border-border bg-background pl-8 pr-3 text-xs outline-none transition focus:border-primary"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-9 w-[120px] shrink-0 border border-border bg-background px-2 text-xs font-semibold outline-none"
              aria-label="Filter technicians by status"
            >
              <option value="all">
                All statuses
              </option>

              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>

            <select
              value={teamFilter}
              onChange={(event) =>
                setTeamFilter(event.target.value)
              }
              className="h-9 w-[130px] shrink-0 border border-border bg-background px-2 text-xs font-semibold outline-none"
              aria-label="Filter technicians by team"
            >
              <option value="all">
                All teams
              </option>

              {teamOptions.map((team) => (
                <option
                  key={team}
                  value={team}
                >
                  {team}
                </option>
              ))}
            </select>

            <div className="flex h-9 shrink-0 overflow-hidden border border-border bg-background">
              <button
                type="button"
                onClick={() =>
                  setDensity("compact")
                }
                className={`px-3 text-[10px] font-black uppercase tracking-wide ${
                  density === "compact"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Compact
              </button>

              <button
                type="button"
                onClick={() =>
                  setDensity("detailed")
                }
                className={`border-l border-border px-3 text-[10px] font-black uppercase tracking-wide ${
                  density === "detailed"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Detailed
              </button>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 shrink-0 items-center gap-1 border border-border px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] font-bold text-muted-foreground">
          <span className="uppercase tracking-wider">Track colors</span>

          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-4 ${statusColors.complete.line}`} />
            Complete
          </span>

          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-4 ${statusColors.travelling.line}`} />
            Travelling / On Site
          </span>

          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-4 ${statusColors.working.line}`} />
            Working
          </span>

          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-4 ${statusColors.assigned.line}`} />
            Assigned
          </span>

          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-4 ${statusColors.available.line}`} />
            Available / Break
          </span>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden"
        style={{ scrollbarGutter: "stable" }}
        data-dispatch-horizontal-scroll
      >
        <div className="w-full">
          <div
            className="sticky top-0 z-[90] grid h-9 border-b border-border bg-muted/95 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur"
            style={{
              gridTemplateColumns: `${technicianColumnWidth}px minmax(0,1fr)`,
            }}
          >
            <div className="sticky left-0 z-[100] flex items-center border-r border-border bg-muted/95 px-3">
              Technician
            </div>
            <div className="flex items-center px-3">Daily Track</div>
          </div>

          <div
            className="sticky top-9 z-[85] grid h-9 border-b border-border bg-background/95 backdrop-blur"
            style={{
              gridTemplateColumns: `${technicianColumnWidth}px minmax(0,1fr)`,
            }}
          >
            <div className="sticky left-0 z-[95] border-r border-border bg-background/95" />
            <div className="relative">
              {boardShowsNow && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-[130] w-px bg-rose-500"
                  style={{ left: `${boardNowRatio * 100}%` }}
                >
                  <span
                    className={`absolute top-0 whitespace-nowrap rounded-sm bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white ${
                      boardNowRatio > 0.92
                        ? "-translate-x-full"
                        : boardNowRatio < 0.08
                        ? "translate-x-0"
                        : "-translate-x-1/2"
                    }`}
                  >
                    NOW · {boardNowLabel}
                  </span>
                </div>
              )}

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
            <div className="p-6 text-sm text-muted-foreground">
              Loading technicians…
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No technicians match the current filters.
            </div>
          ) : (
            <div className="relative">
              {boardShowsNow && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-[70] w-px bg-rose-500"
                  style={{
                    left: `calc(${boardNowRatio * 100}% + ${
                      technicianColumnWidth * (1 - boardNowRatio)
                    }px)`,
                  }}
                />
              )}

              {filteredTechnicians.map((tech) => (
                <div
                  key={tech.uuid}
                  data-technician-row={tech.uuid}
                  className="group grid border-b border-border last:border-b-0"
                  style={{
                    gridTemplateColumns: `${technicianColumnWidth}px minmax(0,1fr)`,
                  }}
                >
                  <div
                    className={`sticky left-0 z-50 flex border-r border-border bg-card/95 backdrop-blur transition group-hover:bg-row-hover ${
                      density === "compact"
                        ? "items-center gap-2 px-2 py-1.5"
                        : "items-start gap-3 p-3"
                    }`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center bg-avatar font-black ${
                        density === "compact"
                          ? "h-7 w-7 rounded-lg text-[9px]"
                          : "h-10 w-10 rounded-xl text-xs"
                      }`}
                    >
                      {tech.initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div
                          className={`truncate font-bold ${
                            density === "compact"
                              ? "text-[11px]"
                              : "text-sm"
                          }`}
                        >
                          {tech.name}
                        </div>

                        <span
                          className={`shrink-0 border px-1.5 py-0.5 text-[7px] font-black ${tech.statusTone}`}
                        >
                          {tech.status}
                        </span>
                      </div>

                      <div
                        className={`truncate text-muted-foreground ${
                          density === "compact"
                            ? "mt-0.5 text-[9px]"
                            : "mt-0.5 text-[11px]"
                        }`}
                      >
                        {tech.role}
                      </div>

                      <div
                        className={`flex items-center gap-2 ${
                          density === "compact"
                            ? "mt-0.5"
                            : "mt-1.5"
                        }`}
                      >
                        {selectedJob && (
                          <button
                            type="button"
                            className={`cursor-help text-[8px] font-black ${
                              tech.rank === 1
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                            onMouseEnter={(event) => {
                              const details =
                                tech.dispatchFitByJob[selectedJob.uuid];

                              if (details) {
                                openFitHint(event.currentTarget, details);
                              }
                            }}
                            onMouseLeave={() => setFitHint(null)}
                            onFocus={(event) => {
                              const details =
                                tech.dispatchFitByJob[selectedJob.uuid];

                              if (details) {
                                openFitHint(event.currentTarget, details);
                              }
                            }}
                            onBlur={() => setFitHint(null)}
                            aria-label={`${tech.confidence}% Dispatch Fit for ${tech.name}`}
                          >
                            {tech.confidence}% fit
                            {tech.rank === 1 ? " · BEST" : ""}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onViewSchedule(tech.uuid)}
                          className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary hover:underline"
                        >
                          Schedule
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <SingleLineTimeline
                    density={density}
                    track={tech.track}
                    technicianId={tech.uuid}
                    onDropJob={onDropJob}
                    focusJobUuid={focusJobUuid}
                    focusAssignmentId={focusAssignmentId}
                    focusPulse={focusPulse}
                    onEditActivity={onEditActivity}
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

      <DispatchFitHintPortal hint={fitHint} />
    </section>
  );
}
