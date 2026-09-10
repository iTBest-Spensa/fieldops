import type { OvertimeItem, OvertimeRange } from "../types";
import {
  BOARD_END_HOUR,
  BOARD_START_HOUR,
  statusColors,
} from "../constants";
import { formatClock, formatHourHeader } from "../utils";

export function OvertimeTimeline({
  items,
  focusJobUuid,
  focusTechnicianUuid,
  focusPulse,
}: {
  items: OvertimeItem[];
  focusJobUuid: string | null;
  focusTechnicianUuid: string | null;
  focusPulse: boolean;
}) {
  const earlyItems = items.flatMap((item) =>
    item.overtimeRanges
      .filter((range) => range.end <= BOARD_START_HOUR)
      .map((range) => ({ item, range }))
  );

  const lateItems = items.flatMap((item) =>
    item.overtimeRanges
      .filter((range) => range.start >= BOARD_END_HOUR)
      .map((range) => ({ item, range }))
  );

  return (
    <div className="space-y-6">
      {earlyItems.length > 0 && (
        <OvertimeBand
          title="Before 7 AM"
          items={earlyItems}
          side="early"
          focusJobUuid={focusJobUuid}
          focusTechnicianUuid={focusTechnicianUuid}
          focusPulse={focusPulse}
        />
      )}

      {lateItems.length > 0 && (
        <OvertimeBand
          title="After 5 PM"
          items={lateItems}
          side="late"
          focusJobUuid={focusJobUuid}
          focusTechnicianUuid={focusTechnicianUuid}
          focusPulse={focusPulse}
        />
      )}
    </div>
  );
}

function OvertimeBand({
  title,
  items,
  side,
  focusJobUuid,
  focusTechnicianUuid,
  focusPulse,
}: {
  title: string;
  items: Array<{ item: OvertimeItem; range: OvertimeRange }>;
  side: "early" | "late";
  focusJobUuid: string | null;
  focusTechnicianUuid: string | null;
  focusPulse: boolean;
}) {
  const minimumStart = Math.min(...items.map(({ range }) => range.start));
  const maximumEnd = Math.max(...items.map(({ range }) => range.end));

  const startHour =
    side === "early"
      ? Math.max(0, Math.floor(minimumStart))
      : BOARD_END_HOUR;

  const endHour =
    side === "early"
      ? BOARD_START_HOUR
      : Math.min(24, Math.max(BOARD_END_HOUR + 1, Math.ceil(maximumEnd)));

  const totalHours = Math.max(1, endHour - startHour);
  const hourMarks = Array.from(
    { length: totalHours + 1 },
    (_, index) => startHour + index
  );

  return (
    <section className="overflow-hidden border border-border bg-card/40">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <div className="text-xs font-black text-amber-600 dark:text-amber-400">
            {title}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Overtime timeline
          </div>
        </div>

        <div className="text-[10px] font-bold text-muted-foreground">
          {formatHourHeader(startHour)}–{formatHourHeader(endHour)}
        </div>
      </div>

      <div className="relative mx-4 h-9 border-b border-border">
        {hourMarks.map((hour, index) => {
          const ratio = (hour - startHour) / totalHours;
          const alignClass =
            index === 0
              ? "translate-x-0"
              : index === hourMarks.length - 1
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

      <div className="relative mx-4 h-[126px]">
        <div className="absolute left-0 right-0 top-[62px] h-px bg-border" />

        {items.map(({ item, range }, index) => {
          const colors = item.overrun
            ? {
                line: "bg-rose-500",
                text: "text-rose-500",
                label: "Overrun",
              }
            : statusColors[item.status];
          const left =
            ((range.start - startHour) / totalHours) * 100;
          const width =
            ((range.end - range.start) / totalHours) * 100;

          const focused =
            item.workOrderUuid === focusJobUuid &&
            (!focusTechnicianUuid ||
              item.technicianUuid === focusTechnicianUuid);
          const showLocator = focused && focusPulse;
          const labelAbove = index % 2 === 0;

          return (
            <div
              key={`${item.assignmentId}-${item.workOrderUuid}-${range.start}-${range.end}`}
              data-fieldops-overtime-work-order={item.workOrderUuid}
              className={`absolute top-0 h-full ${
                showLocator ? "z-40" : "z-20"
              }`}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 0.8)}%`,
                minWidth: "12px",
              }}
              title={`${item.id} · ${item.title}
${item.customer} · ${item.place}
Overtime: ${item.overtimeTime}
Full job: ${item.fullTime}`}
            >
              {showLocator && (
                <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap border border-primary bg-background px-1.5 py-0.5 text-[8px] font-black text-primary animate-pulse">
                  THIS JOB
                </span>
              )}

              <span
                className={`absolute left-0 right-0 top-[60px] h-[4px] ${colors.line} ${
                  showLocator
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : ""
                }`}
              />

              <span
                className={`absolute left-0 top-[56px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />
              <span
                className={`absolute right-0 top-[56px] h-3 w-3 translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />

              <div
                className={`absolute left-0 max-w-[180px] ${
                  labelAbove ? "top-[12px]" : "top-[77px]"
                }`}
              >
                <div
                  className={`truncate text-[9px] font-black uppercase ${colors.text}`}
                >
                  {item.overrun
                    ? "OVERRUN"
                    : statusColors[item.status].label}
                </div>
                <div className="mt-0.5 truncate text-[10px] font-bold">
                  {item.title}
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[9px] text-muted-foreground">
                  {formatClock(range.start)}–{formatClock(range.end)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        Hover a line to see the work order, customer, location, overtime period, and full job time.
      </div>
    </section>
  );

}
