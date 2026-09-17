"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coffee,
  MapPin,
  Truck,
  Wrench,
} from "lucide-react";

import type { ActivityStatus, DragJobPayload, Segment } from "../types";
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

type TimelineSlice = {
  start: number;
  end: number;
  status: ActivityStatus;
  segment: Segment | null;
  kind: "available" | "planned" | "actual" | "event";
  overrun: boolean;
};

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
};

function HoverHintPortal({ hint }: { hint: HoverHintData | null }) {
  if (!hint || typeof document === "undefined") return null;

  const above = hint.placement === "above";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99999] w-60 rounded-lg border border-border bg-background px-3 py-2 text-foreground shadow-xl"
      style={{
        left: hint.left,
        top: hint.top,
        transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <div
        className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-border bg-background ${
          above
            ? "bottom-0 translate-y-1/2 border-b border-r"
            : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />

      <div className="text-[10px] font-black uppercase tracking-wide text-primary">
        {hint.status}
      </div>
      <div className="mt-0.5 truncate text-xs font-bold">{hint.title}</div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
        <span className="truncate">{hint.id}</span>
        <span className="shrink-0 font-semibold text-foreground">
          {formatClock(hint.start)}–{formatClock(hint.end)}
        </span>
      </div>

      {(hint.customer || hint.place) && (
        <div className="mt-1.5 truncate border-t border-border pt-1.5 text-[9px] text-muted-foreground">
          {[hint.customer, hint.place].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>,
    document.body
  );
}

function statusIcon(status: ActivityStatus) {
  switch (status) {
    case "assigned":
      return CalendarClock;
    case "travelling":
      return Truck;
    case "on_site":
      return MapPin;
    case "working":
      return Wrench;
    case "complete":
      return CheckCircle2;
    case "break":
      return Coffee;
    default:
      return null;
  }
}

function segmentIdentity(segment: Segment | null) {
  if (!segment) return "available";

  return [
    segment.actual ? "actual" : "planned",
    segment.timeEntryId ?? "",
    segment.assignmentId ?? "",
    segment.workOrderUuid ?? "",
    segment.id,
    segment.status,
    segment.overrun ? "overrun" : "normal",
  ].join(":");
}

function activityGroupKey(segment: Segment) {
  return segment.assignmentId || segment.workOrderUuid || segment.id;
}

function buildStatusTimeline(track: Segment[], currentHour: number | null) {
  const clipped = track
    .map((segment) => ({
      ...segment,
      start: Math.max(BOARD_START_HOUR, segment.start),
      end: Math.min(BOARD_END_HOUR, segment.end),
    }))
    .filter((segment) => segment.end > segment.start);

  const actualByGroup = new Map<
    string,
    { first: number; last: number; hasOpen: boolean }
  >();

  for (const segment of clipped) {
    if (!segment.actual) continue;

    const key = activityGroupKey(segment);
    const existing = actualByGroup.get(key);

    actualByGroup.set(key, {
      first: Math.min(existing?.first ?? segment.start, segment.start),
      last: Math.max(existing?.last ?? segment.end, segment.end),
      hasOpen: Boolean(existing?.hasOpen || segment.openActual),
    });
  }

  const boundarySet = new Set<number>([BOARD_START_HOUR, BOARD_END_HOUR]);

  for (const segment of clipped) {
    boundarySet.add(segment.start);
    boundarySet.add(segment.end);
  }

  if (
    currentHour !== null &&
    currentHour > BOARD_START_HOUR &&
    currentHour < BOARD_END_HOUR
  ) {
    boundarySet.add(currentHour);
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const slices: TimelineSlice[] = [];

  function plannedIsVisible(segment: Segment, midpoint: number) {
    const actual = actualByGroup.get(activityGroupKey(segment));
    if (!actual) return true;

    if (midpoint < actual.first) return true;

    // For an activity that is still open today, keep the future part of
    // its schedule visible as planned. Historical time remains actual.
    if (
      actual.hasOpen &&
      currentHour !== null &&
      midpoint >= currentHour
    ) {
      return true;
    }

    return false;
  }

  function chooseSegment(start: number, end: number): TimelineSlice {
    const midpoint = start + (end - start) / 2;
    const covering = clipped.filter(
      (segment) => segment.start < end && segment.end > start
    );

    const actual = covering
      .filter((segment) => segment.actual)
      .sort((a, b) => b.start - a.start)[0];

    if (actual) {
      return {
        start,
        end,
        status: actual.status,
        segment: actual,
        kind: "actual",
        overrun: Boolean(actual.overrun),
      };
    }

    const scheduleEvent = covering
      .filter((segment) => !segment.workOrderUuid)
      .sort((a, b) => b.start - a.start)[0];

    if (scheduleEvent) {
      return {
        start,
        end,
        status: scheduleEvent.status,
        segment: scheduleEvent,
        kind: "event",
        overrun: false,
      };
    }

    const planned = covering
      .filter(
        (segment) =>
          Boolean(segment.workOrderUuid) &&
          !segment.actual &&
          plannedIsVisible(segment, midpoint)
      )
      .sort((a, b) => b.start - a.start)[0];

    if (planned) {
      return {
        start,
        end,
        // A scheduled assignment is a future/planned state. Its final
        // Work Order status must not repaint historical Travel/Work time.
        status: "assigned",
        segment: planned,
        kind: "planned",
        overrun: false,
      };
    }

    return {
      start,
      end,
      status: "available",
      segment: null,
      kind: "available",
      overrun: false,
    };
  }

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];

    if (end <= start) continue;

    const next = chooseSegment(start, end);
    const previous = slices[slices.length - 1];

    const sameSource =
      previous &&
      previous.end === next.start &&
      previous.status === next.status &&
      previous.kind === next.kind &&
      previous.overrun === next.overrun &&
      segmentIdentity(previous.segment) === segmentIdentity(next.segment);

    if (sameSource) {
      previous.end = next.end;
    } else {
      slices.push(next);
    }
  }

  return slices;
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

  const liveTrack = useMemo(
    () =>
      track.map((segment) => {
        if (!segment.openActual || currentHour === null) return segment;

        return {
          ...segment,
          end: clamp(currentHour, segment.start, BOARD_END_HOUR),
          time: `${formatClock(segment.start)}–NOW`,
        };
      }),
    [track, currentHour]
  );

  const slices = useMemo(
    () => buildStatusTimeline(liveTrack, currentHour),
    [liveTrack, currentHour]
  );

  // Only occupied states get a visible line/icon. The icon markers alternate
  // above and below the line in chronological order: first above, next below.
  const visibleSlices = useMemo(
    () => slices.filter((slice) => slice.kind !== "available"),
    [slices]
  );

  const plannedLocatorSegments = useMemo(
    () =>
      liveTrack.filter(
        (segment) =>
          Boolean(segment.workOrderUuid) &&
          !segment.actual &&
          !segment.overrun &&
          segment.end > BOARD_START_HOUR &&
          segment.start < BOARD_END_HOUR
      ),
    [liveTrack]
  );

  const compact = density === "compact";
  const rootMinHeight = compact ? 56 : 82;
  const innerHeight = compact ? 44 : 66;
  const barTop = compact ? 18 : 28;
  const barHeight = compact ? 8 : 12;
  const hitTop = compact ? 7 : 11;
  const hitHeight = compact ? 30 : 42;
  const rootPadding = compact ? "px-2 py-1.5" : "px-3 py-2";

  function openHint(
    target: HTMLElement,
    data: Omit<HoverHintData, "left" | "top" | "placement">
  ) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 240;
    const half = tooltipWidth / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, half + 10),
      window.innerWidth - half - 10
    );

    const useAbove = rect.bottom + 110 > window.innerHeight;

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
        const dropHour = snapHour(hourFromPointer(event.clientX, rect), 15);
        const fieldOpsPayload = event.dataTransfer.getData(
          "application/x-fieldops-job"
        );
        const fallbackJobUuid = event.dataTransfer.getData("text/plain");

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
                ((hour - BOARD_START_HOUR) / BOARD_TOTAL_HOURS) * 100
              }%`,
            }}
          />
        ))}
      </div>

      {dragHour !== null && (
        <div
          className="pointer-events-none absolute bottom-1 top-1 z-40 w-px bg-primary"
          style={{
            left: `${((dragHour - startHour) / totalHours) * 100}%`,
          }}
        >
          <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap bg-primary px-1 py-0.5 text-[8px] font-black text-primary-foreground">
            {formatClock(dragHour)}
          </div>
        </div>
      )}

      <div className="relative" style={{ height: innerHeight }}>
        {/* Exact Locate-in-Dispatch anchors are preserved separately from the
            visible state line. This lets the board show one true occupied-status color
            at a time without losing exact-assignment navigation. */}
        {plannedLocatorSegments.map((segment, index) => {
          const left =
            ((Math.max(BOARD_START_HOUR, segment.start) - startHour) /
              totalHours) *
            100;
          const right = Math.min(BOARD_END_HOUR, segment.end);
          const width =
            ((right - Math.max(BOARD_START_HOUR, segment.start)) / totalHours) *
            100;
          const focused =
            segment.workOrderUuid === focusJobUuid &&
            (focusAssignmentId
              ? segment.assignmentId === focusAssignmentId
              : true);

          return (
            <div
              key={`locator-${segment.assignmentId ?? segment.id}-${index}`}
              data-fieldops-work-order={segment.workOrderUuid || undefined}
              data-fieldops-assignment={segment.assignmentId || undefined}
              data-fieldops-segment-kind="planned"
              className={`pointer-events-none absolute z-[55] ${
                focused && focusPulse
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
                  : ""
              }`}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 0.75)}%`,
                top: barTop - 5,
                height: barHeight + 10,
              }}
            >
              {focused && focusPulse && (
                <span className="absolute left-1/2 top-[-18px] -translate-x-1/2 whitespace-nowrap border border-primary bg-background px-1.5 py-0.5 text-[8px] font-black text-primary">
                  THIS DISPATCH
                </span>
              )}
            </div>
          );
        })}

        {/* Only meaningful technician states are drawn. Available time is left
            intentionally blank so the board stays clean. Every occupied segment
            uses a status icon; hover exposes a small activity tooltip. */}
        {visibleSlices.map((slice, index) => {
          const left = ((slice.start - startHour) / totalHours) * 100;
          const width = ((slice.end - slice.start) / totalHours) * 100;
          const colors = statusColors[slice.status];
          const segment = slice.segment;
          const canMoveJob =
            slice.kind === "planned" &&
            Boolean(segment?.workOrderUuid) &&
            segment?.status !== "complete";

          const statusLabel =
            slice.kind === "planned"
              ? "Scheduled / Assigned"
              : slice.kind === "actual"
              ? `Actual ${colors.label}${slice.overrun ? " · Overrun" : ""}`
              : colors.label;

          const title = segment?.title ?? colors.label;
          const id = segment?.id ?? colors.label.toUpperCase();
          const StatusIcon = statusIcon(slice.status);

          return (
            <div
              key={`${slice.kind}-${segmentIdentity(segment)}-${slice.start}-${slice.end}-${index}`}
              data-fieldops-work-order={segment?.workOrderUuid || undefined}
              data-fieldops-assignment={segment?.assignmentId || undefined}
              data-fieldops-segment-kind={
                segment?.actual ? "actual" : segment?.workOrderUuid ? "planned" : undefined
              }
              data-fieldops-time-entry={segment?.timeEntryId || undefined}
              draggable={canMoveJob}
              className={`absolute z-30 ${
                canMoveJob
                  ? "cursor-grab active:cursor-grabbing"
                  : segment?.workOrderUuid
                  ? "cursor-pointer"
                  : "cursor-help"
              }`}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 0.35)}%`,
                top: hitTop,
                height: hitHeight,
              }}
              onDragStart={(event) => {
                if (!canMoveJob || !segment?.workOrderUuid) {
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
                event.dataTransfer.setData("text/plain", segment.workOrderUuid);
              }}
              onMouseEnter={(event) =>
                openHint(event.currentTarget, {
                  title,
                  id,
                  status: statusLabel,
                  start: slice.start,
                  end: slice.end,
                  customer: segment?.customer,
                  place: segment?.place,
                })
              }
              onMouseLeave={() => setHint(null)}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setHint(null);

                if (segment?.workOrderUuid) {
                  onEditActivity(segment, technicianId);
                }
              }}
            >
              <span
                className={`absolute left-0 right-0 ${colors.line}`}
                style={{
                  top: barTop - hitTop,
                  height: barHeight,
                }}
              />

              {StatusIcon && (() => {
                const iconSize = compact ? 14 : 16;
                const iconAbove = index % 2 === 0;
                const iconTop = iconAbove
                  ? barTop - hitTop - iconSize - 4
                  : barTop - hitTop + barHeight + 4;

                return (
                  <span
                    className={`pointer-events-none absolute z-10 flex items-center justify-center rounded-full bg-background/95 shadow-sm ring-1 ring-border ${colors.text}`}
                    style={{
                      left: "50%",
                      top: iconTop,
                      width: iconSize,
                      height: iconSize,
                      transform: "translateX(-50%)",
                    }}
                    aria-hidden="true"
                  >
                    <StatusIcon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                  </span>
                );
              })()}

              {/* Overrun is an exception, not a technician status. Preserve
                  the true status color and add only a red accent. */}
              {slice.overrun && (
                <span
                  className="absolute left-0 right-0 h-[2px] bg-rose-500"
                  style={{ top: barTop - hitTop - 3 }}
                />
              )}

              {/* Thin separators make status transitions readable without
                  breaking the continuous line. */}
              {index > 0 && (
                <span
                  className="pointer-events-none absolute left-0 w-px bg-background/90"
                  style={{
                    top: barTop - hitTop,
                    height: barHeight,
                  }}
                />
              )}
            </div>
          );
        })}

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
      </div>

      <HoverHintPortal hint={hint} />
    </div>
  );
}
