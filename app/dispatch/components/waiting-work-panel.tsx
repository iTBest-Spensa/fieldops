"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Play,
  Sparkles,
  TimerReset,
} from "lucide-react";

import type { DragJobPayload, Technician, WaitingJob } from "../types";

type SidePanelTab = "waiting" | "intelligence";
type InsightKind = "risk" | "exception" | "recommendation";
type InsightAction = "waiting" | "schedule" | "overtime";

type OperationalInsight = {
  id: string;
  kind: InsightKind;
  title: string;
  summary: string;
  detail: string;
  action: InsightAction;
  jobUuid?: string;
  technicianUuid?: string;
};

const KIND_ORDER: Record<InsightKind, number> = {
  risk: 0,
  exception: 1,
  recommendation: 2,
};

function insightTone(kind: InsightKind) {
  if (kind === "risk") {
    return {
      card: "border-rose-500/25 bg-rose-500/[0.04]",
      icon: "text-rose-500",
      badge: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      label: "AT RISK",
      Icon: AlertTriangle,
    };
  }

  if (kind === "exception") {
    return {
      card: "border-amber-500/25 bg-amber-500/[0.04]",
      icon: "text-amber-600 dark:text-amber-400",
      badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      label: "EXCEPTION",
      Icon: TimerReset,
    };
  }

  return {
    card: "border-primary/25 bg-primary/[0.04]",
    icon: "text-primary",
    badge: "border-primary/25 bg-primary/10 text-primary",
    label: "RECOMMENDATION",
    Icon: Sparkles,
  };
}

export function WaitingWorkPanel({
  loading,
  waitingJobs,
  technicians,
  selectedJob,
  focusJobUuid,
  focusPulse,
  canSelfClaim,
  canDragAssign,
  claimingJobUuid,
  boardShowsNow,
  boardNowHour,
  onSelectJob,
  onClaimJob,
  onViewSchedule,
  onOpenOvertime,
}: {
  loading: boolean;
  waitingJobs: WaitingJob[];
  technicians: Technician[];
  selectedJob: WaitingJob | null;
  focusJobUuid: string | null;
  focusPulse: boolean;
  canSelfClaim: boolean;
  canDragAssign: boolean;
  claimingJobUuid: string | null;
  boardShowsNow: boolean;
  boardNowHour: number | null;
  onSelectJob: (jobUuid: string) => void;
  onClaimJob: (job: WaitingJob) => void;
  onViewSchedule: (technicianUuid: string) => void;
  onOpenOvertime: (technicianUuid: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<SidePanelTab>("waiting");

  const intelligenceItems = useMemo(() => {
    const items: OperationalInsight[] = [];
    const seen = new Set<string>();

    function addInsight(item: OperationalInsight) {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      items.push(item);
    }

    technicians.forEach((tech) => {
      tech.overtime.forEach((item) => {
        // Historical overtime belongs in reporting, not in live Operational
        // Intelligence. Keep future/planned overtime visible, but an actual
        // overrun is actionable only while that time entry is still open.
        const activeActualOvertime = item.overrun
          ? tech.track.some(
              (segment) =>
                segment.actual === true &&
                segment.openActual === true &&
                segment.workOrderUuid === item.workOrderUuid &&
                (!item.assignmentId ||
                  !segment.assignmentId ||
                  segment.assignmentId === item.assignmentId)
            )
          : item.status !== "complete";

        if (!activeActualOvertime) return;

        addInsight({
          id: `overtime-${item.assignmentId}-${item.overrun ? "active" : "planned"}`,
          kind: "risk",
          title: item.overrun ? "Active overtime" : "Overtime exposure",
          summary: `${tech.name} · ${item.id}`,
          detail: item.overrun
            ? `${item.overtimeTime} is currently outside the normal board window.`
            : `${item.overtimeTime} falls outside the normal board window. Review the technician schedule before adding more work.`,
          action: "overtime",
          jobUuid: item.workOrderUuid,
          technicianUuid: tech.uuid,
        });
      });

      tech.track
        .filter(
          (segment) =>
            segment.overrun === true &&
            segment.actual === true &&
            segment.openActual === true &&
            Boolean(segment.workOrderUuid)
        )
        .forEach((segment) => {
          const plannedEnd = segment.plannedEnd ?? segment.start;
          const overByMinutes = Math.max(
            1,
            Math.round((segment.end - plannedEnd) * 60)
          );

          addInsight({
            id: `overrun-${tech.uuid}-${segment.workOrderUuid}`,
            kind: "risk",
            title: "Job running beyond estimate",
            summary: `${tech.name} · ${segment.id}`,
            detail: `${segment.title} is about ${overByMinutes} min beyond its planned end.`,
            action: "schedule",
            jobUuid: segment.workOrderUuid,
            technicianUuid: tech.uuid,
          });
        });

      const planned = tech.track
        .filter(
          (segment) =>
            !segment.actual &&
            !segment.overrun &&
            segment.workOrderUuid &&
            segment.status === "assigned"
        )
        .sort((a, b) => a.start - b.start || a.end - b.end);

      for (let index = 1; index < planned.length; index += 1) {
        const previous = planned[index - 1];
        const current = planned[index];

        const sameAssignment =
          previous.assignmentId &&
          current.assignmentId &&
          previous.assignmentId === current.assignmentId;

        if (!sameAssignment && current.start < previous.end) {
          const overlapMinutes = Math.max(
            1,
            Math.round((previous.end - current.start) * 60)
          );

          addInsight({
            id: `conflict-${tech.uuid}-${previous.assignmentId ?? previous.workOrderUuid}-${current.assignmentId ?? current.workOrderUuid}`,
            kind: "exception",
            title: "Schedule conflict",
            summary: tech.name,
            detail: `${previous.id} and ${current.id} overlap by about ${overlapMinutes} min.`,
            action: "schedule",
            jobUuid: current.workOrderUuid,
            technicianUuid: tech.uuid,
          });
        }
      }

      if (boardShowsNow && boardNowHour !== null) {
        planned.forEach((segment) => {
          if (boardNowHour <= segment.start + 0.25) return;

          const started = tech.track.some(
            (actual) =>
              actual.actual &&
              actual.workOrderUuid === segment.workOrderUuid &&
              actual.start <= boardNowHour
          );

          if (started) return;

          const lateMinutes = Math.max(
            15,
            Math.round((boardNowHour - segment.start) * 60)
          );

          addInsight({
            id: `late-${tech.uuid}-${segment.assignmentId ?? segment.workOrderUuid}`,
            kind: "risk",
            title: "Scheduled work has not started",
            summary: `${tech.name} · ${segment.id}`,
            detail: `${segment.title} is still assigned about ${lateMinutes} min after its planned start.`,
            action: "schedule",
            jobUuid: segment.workOrderUuid,
            technicianUuid: tech.uuid,
          });
        });
      }
    });

    waitingJobs.forEach((job) => {
      let bestTech: Technician | null = null;
      let bestScore = 0;

      // Use a normal loop so TypeScript can correctly track the selected
      // technician outside the loop. A nested forEach callback caused
      // bestTech to be narrowed to `never` below even though it was assigned.
      for (const tech of technicians) {
        const score =
          tech.dispatchFitByJob?.[job.uuid]?.score ??
          tech.confidenceByJob?.[job.uuid] ??
          0;

        if (score > bestScore) {
          bestScore = score;
          bestTech = tech;
        }
      }

      const priority = job.priority.trim().toLowerCase();
      const highPriority =
        priority.includes("urgent") ||
        priority.includes("critical") ||
        priority.includes("high");

      if (!highPriority && bestScore < 85) return;

      addInsight({
        id: `waiting-${job.uuid}`,
        kind: highPriority ? "risk" : "recommendation",
        title: highPriority ? `${job.priority} waiting work` : "Strong dispatch match",
        summary: `${job.id} · ${job.title}`,
        detail: bestTech
          ? `${bestTech.name} is currently the strongest fit at ${Math.round(bestScore)}%.`
          : "This work order is still waiting for assignment.",
        action: "waiting",
        jobUuid: job.uuid,
        technicianUuid: bestTech?.uuid,
      });
    });

    return items
      .sort(
        (a, b) =>
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          a.title.localeCompare(b.title)
      )
      .slice(0, 20);
  }, [boardNowHour, boardShowsNow, technicians, waitingJobs]);

  const riskCount = intelligenceItems.filter(
    (item) => item.kind === "risk"
  ).length;
  const exceptionCount = intelligenceItems.filter(
    (item) => item.kind === "exception"
  ).length;

  function openInsight(item: OperationalInsight) {
    if (item.action === "waiting" && item.jobUuid) {
      onSelectJob(item.jobUuid);
      setActiveTab("waiting");
      return;
    }

    if (item.action === "overtime" && item.technicianUuid) {
      onOpenOvertime(item.technicianUuid);
      return;
    }

    if (item.technicianUuid) {
      onViewSchedule(item.technicianUuid);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
      <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={() => setActiveTab("waiting")}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition ${
            activeTab === "waiting"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Waiting
          <span
            className={`min-w-5 rounded-full px-1.5 py-0.5 text-[9px] ${
              activeTab === "waiting"
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {waitingJobs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("intelligence")}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition ${
            activeTab === "intelligence"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Intelligence
          <span
            className={`min-w-5 rounded-full px-1.5 py-0.5 text-[9px] ${
              activeTab === "intelligence"
                ? "bg-primary-foreground/15 text-primary-foreground"
                : intelligenceItems.length > 0
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-muted text-foreground"
            }`}
          >
            {intelligenceItems.length}
          </span>
        </button>
      </div>

      {activeTab === "waiting" ? (
        <>
          <div className="shrink-0 border-b border-border px-4 py-3">
            <h2 className="font-bold">Waiting work</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select one to compare dispatch fit.
              {canDragAssign ? " Drag it onto a technician track to assign." : ""}
              {canSelfClaim ? " Claim an available job to start Travel immediately." : ""}
            </p>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-muted-foreground">
              Loading live work orders…
            </div>
          ) : waitingJobs.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              No unassigned work orders are waiting.
            </div>
          ) : (
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {waitingJobs.map((job) => {
                const selected = job.uuid === selectedJob?.uuid;
                const focused = job.uuid === focusJobUuid;
                const claiming = job.uuid === claimingJobUuid;

                return (
                  <div
                    key={job.uuid}
                    role="button"
                    tabIndex={0}
                    data-fieldops-work-order={job.uuid}
                    draggable={canDragAssign}
                    onDragStart={(event) => {
                      if (!canDragAssign) {
                        event.preventDefault();
                        return;
                      }

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
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectJob(job.uuid);
                      }
                    }}
                    className={`relative w-full cursor-pointer p-4 text-left transition ${
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
                      <span className="text-xs font-black text-primary">
                        {job.id}
                      </span>
                      <span
                        className={`border px-2 py-1 text-[10px] font-bold ${job.tone}`}
                      >
                        {job.priority}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-bold">{job.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {job.customer}
                    </div>

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

                    {canSelfClaim && (
                      <button
                        type="button"
                        disabled={claiming}
                        onClick={(event) => {
                          event.stopPropagation();
                          onClaimJob(job);
                        }}
                        className="mt-3 inline-flex h-8 items-center gap-2 border border-primary/40 bg-primary/[0.06] px-3 text-[11px] font-black text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {claiming ? "Claiming…" : "Claim & Start Travel"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-bold">Operational intelligence</h2>
            </div>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              Exceptions and useful recommendations from the current dispatch board.
            </p>

            {intelligenceItems.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black">
                {riskCount > 0 && (
                  <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-600 dark:text-rose-400">
                    {riskCount} at risk
                  </span>
                )}
                {exceptionCount > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                    {exceptionCount} exception{exceptionCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-5 text-sm text-muted-foreground">
              Analyzing the dispatch board…
            </div>
          ) : intelligenceItems.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div className="mt-3 text-sm font-bold">No issues need attention</div>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                FieldOps will surface schedule risks, overtime, conflicts and strong dispatch recommendations here.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {intelligenceItems.map((item) => {
                const tone = insightTone(item.kind);
                const Icon = tone.Icon;
                const actionLabel =
                  item.action === "waiting"
                    ? "Review"
                    : item.action === "overtime"
                    ? "Overtime"
                    : "Schedule";

                return (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-3 ${tone.card}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />

                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex border px-1.5 py-0.5 text-[8px] font-black tracking-wide ${tone.badge}`}
                        >
                          {tone.label}
                        </span>

                        <div className="mt-1.5 text-[11px] font-black leading-4 text-foreground">
                          {item.title}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] font-bold text-primary">
                          {item.summary}
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                          {item.detail}
                        </p>

                        <button
                          type="button"
                          onClick={() => openInsight(item)}
                          className="mt-2 inline-flex h-7 items-center gap-1 text-[10px] font-black text-primary hover:underline"
                        >
                          {actionLabel}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
