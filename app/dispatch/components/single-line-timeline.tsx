"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

import type { DragJobPayload, Segment } from "../types";
import {
  BOARD_END_HOUR,
  BOARD_START_HOUR,
  BOARD_TOTAL_HOURS,
  boardHours,
  statusColors,
} from "../constants";
import {
  clamp,
  durationLabel,
  formatClock,
  snapHour,
} from "../utils";

type TrackDensity = "compact" | "detailed";

type RenderTrackItem =
  | { type: "activity"; segment: Segment; originalIndex: number }
  | { type: "gap"; start: number; end: number; originalIndex: number };

function buildTrackItems(track: Segment[]): RenderTrackItem[] {
  const normalSegments = track
    .filter((segment) => !segment.overrun)
    .sort((a, b) => a.start - b.start);

  const overrunSegments = track
    .filter((segment) => segment.overrun)
    .sort((a, b) => a.start - b.start);

  const items: RenderTrackItem[] = [];

  normalSegments.forEach((segment, index) => {
    if (index > 0) {
      const previous = normalSegments[index - 1];

      if (segment.start > previous.end) {
        items.push({
          type: "gap",
          start: previous.end,
          end: segment.start,
          originalIndex: index - 1,
        });
      }
    }

    items.push({
      type: "activity",
      segment,
      originalIndex: index,
    });
  });

  overrunSegments.forEach((segment, index) => {
    items.push({
      type: "activity",
      segment,
      originalIndex: normalSegments.length + index,
    });
  });

  return items;
}

type HoverHintData = {
  left: number;
  top: number;
  placement: "above" | "below";
  title: string;
  id: string;
  status: string;
  start: number;
  end: number;
  customer?: string;
  place?: string;
  priority?: string;
  description?: string;
  detail?: string;
};

function HoverHintPortal({ hint }: { hint: HoverHintData | null }) {
  if (!hint || typeof document === "undefined") return null;

  const above = hint.placement === "above";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99999] w-72 border border-slate-300 bg-white p-3 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      style={{
        left: hint.left,
        top: hint.top,
        transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <div
        className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 ${
          above
            ? "bottom-0 translate-y-1/2 border-b border-r"
            : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />

      <div className="text-[10px] font-black uppercase tracking-wider text-primary">
        {hint.status}
      </div>
      <div className="mt-1 text-sm font-bold">{hint.title}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
        {hint.id}
      </div>

      {(hint.customer || hint.place || hint.priority) && (
        <div className="mt-3 space-y-1 text-[10px]">
          {hint.customer && (
            <div>
              <span className="text-muted-foreground">Customer: </span>
              <span className="font-bold">{hint.customer}</span>
            </div>
          )}
          {hint.place && (
            <div>
              <span className="text-muted-foreground">Location: </span>
              <span className="font-bold">{hint.place}</span>
            </div>
          )}
          {hint.priority && (
            <div>
              <span className="text-muted-foreground">Priority: </span>
              <span className="font-bold">{hint.priority}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground">Start</div>
          <div className="mt-0.5 font-bold">{formatClock(hint.start)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">End</div>
          <div className="mt-0.5 font-bold">{formatClock(hint.end)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground">Duration</div>
          <div className="mt-0.5 font-bold">
            {durationLabel(hint.start, hint.end)}
          </div>
        </div>
      </div>

      {hint.description && (
        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Description
          </div>
          <div className="mt-1 text-[10px] leading-4 text-slate-700 dark:text-slate-200">
            {hint.description}
          </div>
        </div>
      )}

      {hint.detail && (
        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Details
          </div>
          <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
            {hint.detail}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export function SingleLineTimeline({
  track,
  technicianId,
  onDropJob,
  focusJobUuid,
  focusAssignmentId,
  focusPulse,
  onEditActivity,
  currentHour,
  overtimeCount,
  onOpenOvertime,
  density = "detailed",
}: {
  track: Segment[];
  technicianId: string;
  onDropJob: (
    payload: DragJobPayload,
    techUuid: string,
    dropHour: number
  ) => void;
  focusJobUuid: string | null;
  focusAssignmentId: string | null;
  focusPulse: boolean;
  onEditActivity: (segment: Segment, technicianId: string) => void;
  currentHour: number | null;
  overtimeCount: number;
  onOpenOvertime: () => void;
  density?: TrackDensity;
}) {
  const [hint, setHint] = useState<HoverHintData | null>(null);
  const [dragHour, setDragHour] = useState<number | null>(null);

  const startHour = BOARD_START_HOUR;
  const totalHours = BOARD_TOTAL_HOURS;

  const liveTrack = track.map((segment) => {
    if (!segment.openActual || currentHour === null) return segment;

    return {
      ...segment,
      end: clamp(currentHour, segment.start, BOARD_END_HOUR),
      time: `${formatClock(segment.start)}–NOW`,
    };
  });

  const items = buildTrackItems(liveTrack);
  const hasSecondaryLane = liveTrack.some(
    (segment) => segment.secondaryLane
  );

  const compact = density === "compact";
  const rootMinHeight = compact
    ? hasSecondaryLane
      ? 96
      : 64
    : hasSecondaryLane
    ? 174
    : 118;
  const innerHeight = compact
    ? hasSecondaryLane
      ? 84
      : 52
    : hasSecondaryLane
    ? 154
    : 100;
  const mainLineTop = compact ? 25 : 47;
  const secondaryLineTop = compact ? 59 : 107;
  const rootPadding = compact ? "px-2 py-1.5" : "px-3 py-2";

  function openHint(
    target: HTMLElement,
    data: Omit<HoverHintData, "left" | "top" | "placement">
  ) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 288;
    const half = tooltipWidth / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, half + 10),
      window.innerWidth - half - 10
    );

    const useAbove = rect.bottom + 220 > window.innerHeight;

    setHint({
      ...data,
      left,
      top: useAbove ? rect.top - 10 : rect.bottom + 10,
      placement: useAbove ? "above" : "below",
    });
  }

  function hourFromPointer(clientX: number, rect: DOMRect) {
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return startHour + ratio * totalHours;
  }

  return (
    <div
      className={`relative overflow-visible ${rootPadding}`}
      style={{ minHeight: rootMinHeight }}
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setDragHour(snapHour(hourFromPointer(event.clientX, rect), 15));
      }}
      onDragLeave={() => setDragHour(null)}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const dropHour = snapHour(
          hourFromPointer(event.clientX, rect),
          15
        );
        const fieldOpsPayload = event.dataTransfer.getData(
          "application/x-fieldops-job"
        );
        const fallbackJobUuid =
          event.dataTransfer.getData("text/plain");

        setDragHour(null);

        let payload: DragJobPayload | null = null;

        if (fieldOpsPayload) {
          try {
            payload = JSON.parse(fieldOpsPayload) as DragJobPayload;
          } catch {
            payload = null;
          }
        }

        if (!payload && fallbackJobUuid) {
          payload = {
            kind: "waiting",
            jobUuid: fallbackJobUuid,
          };
        }

        if (payload?.jobUuid) {
          onDropJob(payload, technicianId, dropHour);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {boardHours.map((hour) => (
          <div
            key={hour}
            className="absolute bottom-0 top-0 border-l border-border/30"
            style={{
              left: `${
                ((hour - BOARD_START_HOUR) /
                  BOARD_TOTAL_HOURS) *
                100
              }%`,
            }}
          />
        ))}
      </div>

      {dragHour !== null && (
        <div
          className="pointer-events-none absolute bottom-1 top-1 z-40 w-px bg-primary"
          style={{
            left: `${
              ((dragHour - startHour) / totalHours) * 100
            }%`,
          }}
        >
          <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap bg-primary px-1 py-0.5 text-[8px] font-black text-primary-foreground">
            {formatClock(dragHour)}
          </div>
        </div>
      )}

      <div className="relative" style={{ height: innerHeight }}>
        <div
          className="absolute left-0 right-0 h-px bg-border"
          style={{ top: mainLineTop + 2 }}
        />

        {hasSecondaryLane && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/60"
            style={{ top: secondaryLineTop + 2 }}
          />
        )}

        {overtimeCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setHint(null);
              onOpenOvertime();
            }}
            className="absolute bottom-0 right-1 z-[60] inline-flex items-center gap-1 bg-background/95 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 shadow-sm hover:underline dark:text-amber-400"
          >
            Overtime {overtimeCount}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {items.map((item, index) => {
          if (item.type === "gap") {
            const left =
              ((item.start - startHour) / totalHours) * 100;
            const width =
              ((item.end - item.start) / totalHours) * 100;
            const tinyGap =
              (item.end - item.start) * 60 <= 10;

            return (
              <div
                key={`gap-${item.start}-${item.end}-${index}`}
                className="absolute top-0 z-30 h-full cursor-help"
                style={{
                  left: `${Math.max(0, left)}%`,
                  width: `${Math.max(width, 0.45)}%`,
                  minWidth: tinyGap ? "7px" : undefined,
                }}
                onMouseEnter={(event) =>
                  openHint(event.currentTarget, {
                    title: "Unscheduled gap",
                    id: "OPEN GAP",
                    status: "Gap",
                    start: item.start,
                    end: item.end,
                    detail:
                      "No activity is scheduled in this interval.",
                  })
                }
                onMouseLeave={() => setHint(null)}
              >
                <span
                  className="absolute left-0 right-0 border-t-2 border-dashed border-slate-500/80"
                  style={{ top: mainLineTop }}
                />
                <span
                  className="absolute left-0 h-[10px] w-[10px] -translate-x-1/2 rounded-full border-2 border-background bg-slate-500"
                  style={{ top: mainLineTop - 4 }}
                />
                <span
                  className="absolute right-0 h-[10px] w-[10px] translate-x-1/2 rounded-full border-2 border-background bg-slate-500"
                  style={{ top: mainLineTop - 4 }}
                />

                {!compact && (
                  <span
                    className="absolute left-1/2 w-full -translate-x-1/2 overflow-hidden px-0.5 text-center text-[7px] font-black uppercase text-slate-500"
                    style={{ top: mainLineTop + 13 }}
                  >
                    <span className="block truncate">
                      {durationLabel(item.start, item.end)} gap
                    </span>
                  </span>
                )}
              </div>
            );
          }

          const segment = item.segment;
          const left =
            ((segment.start - startHour) / totalHours) * 100;
          const width =
            ((segment.end - segment.start) / totalHours) *
            100;

          // Track color always comes from the activity status.
          // Overrun is the only exception and remains red by design.
          const colors = segment.overrun
            ? {
                line: "bg-rose-500",
                text: "text-rose-500",
                label: "Overrun",
              }
            : statusColors[segment.status];

          const topLabel = item.originalIndex % 2 === 0;
          const lineTop = segment.secondaryLane
            ? secondaryLineTop
            : mainLineTop;
          const dotTop = lineTop - (compact ? 3 : 4);

          const detail =
            segment.status === "available"
              ? "Technician is available for dispatch during this interval."
              : segment.status === "break"
              ? segment.notes ??
                "Non-job time recorded on the technician schedule."
              : segment.status === "travelling"
              ? segment.notes ??
                "Technician is travelling between assignments."
              : segment.workOrderUuid
              ? undefined
              : segment.notes ??
                "Scheduled activity on this technician's daily track.";

          const canMoveJob =
            Boolean(segment.workOrderUuid) &&
            segment.status !== "complete" &&
            !segment.overrun;
          const focused =
            segment.workOrderUuid === focusJobUuid &&
            (focusAssignmentId
              ? segment.assignmentId === focusAssignmentId && segment.actual !== true
              : true);

          const labelTop = segment.secondaryLane
            ? lineTop + (compact ? 7 : 10)
            : segment.overrun
            ? compact
              ? 0
              : 4
            : topLabel
            ? undefined
            : lineTop + (compact ? 6 : 11);

          const labelBottom =
            !segment.secondaryLane &&
            !segment.overrun &&
            topLabel
              ? innerHeight -
                lineTop +
                (compact ? 2 : 4)
              : undefined;

          return (
            <div
              key={`${segment.id}-${segment.time}-${index}`}
              data-fieldops-work-order={
                segment.workOrderUuid
                  ? segment.workOrderUuid
                  : undefined
              }
              data-fieldops-assignment={segment.assignmentId || undefined}
              data-fieldops-segment-kind={segment.actual ? "actual" : "planned"}
              data-fieldops-time-entry={segment.timeEntryId || undefined}
              draggable={canMoveJob}
              title={
                canMoveJob
                  ? "Drag to move or reschedule this work order"
                  : undefined
              }
              className={`absolute top-0 h-full text-left ${
                focused && focusPulse ? "z-50" : "z-30"
              } ${
                canMoveJob
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-help"
              } ${
                focused && focusPulse
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
                  : ""
              }`}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 1.5)}%`,
              }}
              onDragStart={(event) => {
                if (
                  !canMoveJob ||
                  !segment.workOrderUuid
                ) {
                  event.preventDefault();
                  return;
                }

                setHint(null);
                event.dataTransfer.effectAllowed = "move";

                const payload: DragJobPayload = {
                  kind: "assigned",
                  jobUuid: segment.workOrderUuid,
                  sourceTechnicianUuid: technicianId,
                  assignmentId: segment.assignmentId,
                };

                event.dataTransfer.setData(
                  "application/x-fieldops-job",
                  JSON.stringify(payload)
                );
                event.dataTransfer.setData(
                  "text/plain",
                  segment.workOrderUuid
                );
              }}
              onMouseEnter={(event) =>
                openHint(event.currentTarget, {
                  title: segment.title,
                  id: segment.id,
                  status: segment.overrun
                    ? "Overrun"
                    : segment.actual
                    ? `Actual ${colors.label}`
                    : colors.label,
                  start: segment.start,
                  end: segment.end,
                  customer: segment.customer,
                  place: segment.place,
                  priority: segment.priority,
                  description: segment.workOrderUuid
                    ? segment.description ??
                      "No description provided."
                    : undefined,
                  detail,
                })
              }
              onMouseLeave={() => setHint(null)}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setHint(null);
                if (segment.workOrderUuid) {
                  onEditActivity(segment, technicianId);
                }
              }}
            >
              {focused && focusPulse && (
                <span className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 whitespace-nowrap border border-primary bg-background px-1.5 py-0.5 text-[8px] font-black text-primary animate-pulse">
                  THIS JOB
                </span>
              )}

              <span
                className={`absolute left-0 right-0 ${
                  compact ? "h-[3px]" : "h-[4px]"
                } ${colors.line}`}
                style={{ top: lineTop }}
              />

              <span
                className={`absolute left-0 -translate-x-1/2 rounded-full border-2 border-background ${colors.line} ${
                  compact
                    ? "h-[9px] w-[9px]"
                    : "h-[12px] w-[12px]"
                }`}
                style={{ top: dotTop }}
              />
              <span
                className={`absolute right-0 translate-x-1/2 rounded-full border-2 border-background ${colors.line} ${
                  compact
                    ? "h-[9px] w-[9px]"
                    : "h-[12px] w-[12px]"
                }`}
                style={{ top: dotTop }}
              />

              <span
                className="absolute left-1/2 w-full -translate-x-1/2 overflow-hidden px-1"
                style={{
                  top: labelTop,
                  bottom: labelBottom,
                }}
              >
                <span
                  className={`block truncate font-black uppercase ${colors.text} ${
                    compact ? "text-[7px]" : "text-[8px]"
                  }`}
                >
                  {segment.overrun
                    ? "OVERRUN"
                    : segment.actual
                    ? `ACTUAL ${colors.label}`
                    : colors.label}
                </span>
                <span
                  className={`block truncate font-semibold ${
                    compact ? "text-[8px]" : "text-[9px]"
                  }`}
                >
                  {segment.title}
                </span>

                {!compact && (
                  <span className="block truncate whitespace-nowrap text-[8px] text-muted-foreground">
                    {segment.time}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <HoverHintPortal hint={hint} />
    </div>
  );
}
