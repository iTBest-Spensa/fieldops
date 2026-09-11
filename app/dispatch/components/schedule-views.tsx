import type { ScheduleItem } from "../types";
import { getWeekWindow, parseDateInput } from "../utils";

export function TodaySchedule({
  items,
  selectedDate,
  onManageActualTime,
}: {
  items: ScheduleItem[];
  selectedDate: string;
  onManageActualTime?: (workOrderUuid: string) => void;
}) {
  const date = parseDateInput(selectedDate);

  return (
    <div>
      <h3 className="font-bold">
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h3>

      {items.length === 0 ? (
        <div className="mt-4 text-sm text-muted-foreground">No scheduled activity.</div>
      ) : (
        <div className="mt-4 border-l-2 border-border pl-5">
          {items.map((item) => (
            <div key={`${item.time}-${item.id}`} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-muted-foreground">{item.time}</div>
                  <div className="mt-1 text-xs font-black text-primary">{item.id}</div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                    {item.status}
                  </div>
                </div>
                {item.workOrderUuid && onManageActualTime ? (
                  <button
                    type="button"
                    onClick={() => onManageActualTime(item.workOrderUuid!)}
                    className="rounded-xl border border-border px-3 py-2 text-[10px] font-black hover:bg-muted"
                  >
                    Manage Actual Time
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeekSchedule({
  week,
  selectedDate,
  onManageActualTime,
}: {
  week: Record<string, ScheduleItem[]>;
  selectedDate: string;
  onManageActualTime?: (workOrderUuid: string) => void;
}) {
  const labels = Object.keys(week);
  const range = getWeekWindow(selectedDate);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Week schedule</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {range.start.toLocaleDateString()} –{" "}
          {new Date(range.end.getTime() - 1).toLocaleDateString()}
        </p>
      </div>

      {labels.map((day) => (
        <div key={day} className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-black">
            {day}
          </div>
          <div className="divide-y divide-border">
            {(week[day] ?? []).length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No scheduled activity</div>
            ) : (
              (week[day] ?? []).map((item) => (
                <div
                  key={`${day}-${item.time}-${item.id}`}
                  className="grid grid-cols-[92px_1fr_auto] gap-3 p-3"
                >
                  <div className="text-[11px] font-bold text-muted-foreground">{item.time}</div>
                  <div>
                    <div className="text-xs font-black text-primary">{item.id}</div>
                    <div className="mt-1 text-xs font-semibold">{item.title}</div>
                    <div className="mt-0.5 text-[9px] font-bold text-muted-foreground">
                      {item.status}
                    </div>
                  </div>
                  {item.workOrderUuid && onManageActualTime ? (
                    <button
                      type="button"
                      onClick={() => onManageActualTime(item.workOrderUuid!)}
                      className="self-start rounded-xl border border-border px-3 py-2 text-[10px] font-black hover:bg-muted"
                    >
                      Manage Actual Time
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
