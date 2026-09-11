export function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status: string) {
  switch (status) {
    case "assigned":
      return "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "travelling":
    case "on_site":
      return "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "working":
      return "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "waiting":
      return "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "finished":
    case "closed":
      return "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "billing_ready":
      return "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
    case "cancelled":
      return "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "planned":
      return "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    default:
      return "border-slate-500 bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

export function priorityTone(priority: string) {
  switch (priority) {
    case "emergency":
    case "urgent":
      return "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "high":
      return "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "low":
      return "border-slate-500 bg-slate-500/10 text-slate-500";
    default:
      return "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  }
}

export function formatLocalDateTime(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCompactDateTime(value: string | null) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLocalTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime24(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function formatAvailabilityWindows(
  windows: Array<{ start: string; end: string }> | null | undefined
) {
  if (!windows || windows.length === 0) {
    return "Available: none";
  }

  return `Available ${windows
    .map(
      (window) =>
        `${formatTime24(new Date(window.start))}–${formatTime24(
          new Date(window.end)
        )}`
    )
    .join(", ")}`;
}

export function formatLocalDateTime24(value: string | Date | null) {
  if (!value) return "Not set";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function dateTimePartDate(value: string) {
  return value ? value.slice(0, 10) : "";
}

export function dateTimePartHour(value: string) {
  return value && value.includes("T")
    ? value.slice(11, 13)
    : "00";
}

export function dateTimePartMinute(value: string) {
  return value && value.includes("T")
    ? value.slice(14, 16)
    : "00";
}

export function dateTimePartTime(value: string) {
  return value && value.includes("T") ? value.slice(11, 16) : "";
}

export function mergeDateTimeClock(currentValue: string, nextTime: string) {
  const currentDate = dateTimePartDate(currentValue);
  if (!currentDate) return "";
  const time = /^\d{2}:\d{2}$/.test(nextTime) ? nextTime : "00:00";
  return `${currentDate}T${time}`;
}

export function mergeDateTimeParts(
  currentValue: string,
  part: "date" | "hour" | "minute",
  nextValue: string
) {
  const currentDate = dateTimePartDate(currentValue);
  const currentHour = dateTimePartHour(currentValue);
  const currentMinute = dateTimePartMinute(currentValue);

  const date = part === "date" ? nextValue : currentDate;
  const hour = part === "hour" ? nextValue : currentHour;
  const minute = part === "minute" ? nextValue : currentMinute;

  if (!date) return "";

  return `${date}T${hour || "00"}:${minute || "00"}`;
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateTime(dateString: string, timeString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function timeInputFromIso(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function dateInputFromIso(value: string | null) {
  if (!value) return "";
  return formatDateInput(new Date(value));
}

export function dateTimeLocalInputFromIso(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateInput(date)}T${hours}:${minutes}`;
}

export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA < endB && endA > startB;
}

export function combineLocalDateAndTime(
  dateValue: string,
  timeValue: string
) {
  if (!dateValue || !timeValue) return null;
  const value = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function safeDurationMinutes(
  startValue: string | null | undefined,
  endValue: string | null | undefined
) {
  if (!startValue || !endValue) return null;

  const start = new Date(startValue);
  const end = new Date(endValue);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return null;
  }

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function varianceLabel(actualMinutes: number | null, plannedMinutes: number | null) {
  if (actualMinutes === null || plannedMinutes === null) {
    return "Not available";
  }

  const difference = actualMinutes - plannedMinutes;

  if (difference === 0) {
    return "Exactly on planned time";
  }

  if (difference > 0) {
    return `${minutesLabel(difference)} over planned`;
  }

  return `${minutesLabel(Math.abs(difference))} under planned`;
}

export function billingStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "ready":
      return "Ready for Billing";
    case "billed":
      return "Billed";
    case "review_required":
      return "Billing Review Required";
    case "waived":
      return "Waived";
    default:
      return "Not Billed";
  }
}

export function isTerminalWorkOrderStatus(status: string) {
  return ["finished", "billing_ready", "closed", "cancelled"].includes(status);
}

export function minutesLabel(minutes: number | null) {
  if (!minutes) return "Not set";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function allowedNormalWorkOrderTransitions(status: string): string[] {
  switch (status) {
    case "requested": return ["planned", "cancelled"];
    case "planned": return ["cancelled"];
    case "assigned": return ["travelling", "cancelled"];
    case "travelling": return ["waiting", "working", "cancelled"];
    // Legacy compatibility only. New work no longer requires an On Site step.
    case "on_site": return ["working", "waiting", "finished", "cancelled"];
    case "working": return ["waiting", "finished", "cancelled"];
    case "waiting": return ["travelling", "working", "finished", "cancelled"];
    case "finished": return ["billing_ready", "closed"];
    case "billing_ready": return ["closed"];
    default: return [];
  }
}
