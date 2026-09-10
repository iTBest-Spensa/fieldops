import type {
  DbTechnicianCertification,
  DbTimeEntry,
  EmploymentType,
} from "./types";

export function capitalize(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function technicianName(fullName: string | null, email: string | null) {
  return fullName?.trim() || email?.trim() || "Unnamed Technician";
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "FT";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const raw = value.slice(0, 5);
  const [hour, minute] = raw.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatMoney(value: number | null | undefined, currency = "CAD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "CAD",
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "CAD"} ${value.toFixed(2)}`;
  }
}

export function minutesLabel(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function employmentLabel(value: EmploymentType) {
  return capitalize(value);
}

export function activityLabel(value: string | null | undefined) {
  if (!value) return "Available";
  const labels: Record<string, string> = {
    travel: "Travelling",
    travelling: "Travelling",
    on_site: "On Site",
    work: "Working",
    working: "Working",
    waiting: "Waiting",
    break: "Break",
    lunch: "Lunch",
    assigned: "Assigned",
    available: "Available",
    unavailable: "Unavailable",
    vacation: "Vacation",
    sick: "Sick",
    training: "Training",
    meeting: "Meeting",
    other: "Unavailable",
  };
  return labels[value] ?? capitalize(value);
}

export function technicianStatusTone(status: string) {
  switch (status) {
    case "Working":
      return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "Travelling":
    case "On Site":
      return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "Assigned":
      return "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "Available":
      return "border-slate-400/50 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "Vacation":
    case "Training":
    case "Meeting":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "Sick":
    case "Unavailable":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "Break":
    case "Lunch":
    case "Off Shift":
    case "Inactive":
      return "border-border bg-muted/40 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function workOrderStatusTone(status: string) {
  switch (status) {
    case "finished":
    case "closed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "travelling":
    case "on_site":
      return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "working":
      return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "assigned":
      return "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "waiting":
      return "border-slate-400/50 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "cancelled":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function eventTone(eventType: string) {
  switch (eventType) {
    case "sick":
    case "unavailable":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "vacation":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "training":
    case "meeting":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function certificationState(certification: DbTechnicianCertification, now = new Date()) {
  if (!certification.active) return { label: "Inactive", alert: false, expired: false };
  if (!certification.expires_on) return { label: "No expiry", alert: false, expired: false };
  const end = new Date(`${certification.expires_on}T23:59:59`);
  if (Number.isNaN(end.getTime())) return { label: "No expiry", alert: false, expired: false };
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: "Expired", alert: true, expired: true };
  if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, alert: true, expired: false };
  return { label: "Valid", alert: false, expired: false };
}

export function timeStringToMinutes(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
  return hour * 60 + minute;
}

export function isWithinShift(now: Date, shiftStart: string | null, shiftEnd: string | null) {
  const minute = now.getHours() * 60 + now.getMinutes();
  const start = timeStringToMinutes(shiftStart, 7 * 60);
  const end = timeStringToMinutes(shiftEnd, 17 * 60);
  return minute >= start && minute < end;
}

function overlapMinutes(startA: Date, endA: Date, startB: Date, endB: Date) {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, Math.round((end - start) / 60000));
}

export function actualMinutes(entry: DbTimeEntry, now = new Date()) {
  if (entry.duration_minutes !== null && entry.ended_at) return Math.max(0, entry.duration_minutes);
  const start = new Date(entry.started_at);
  const end = entry.ended_at ? new Date(entry.ended_at) : now;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function outsideShiftMinutesForEntry(
  entry: DbTimeEntry,
  shiftStart: string | null,
  shiftEnd: string | null,
  now = new Date(),
  clampStart?: Date,
  clampEnd?: Date,
) {
  let start = new Date(entry.started_at);
  let end = entry.ended_at ? new Date(entry.ended_at) : now;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  if (clampStart && start < clampStart) start = new Date(clampStart);
  if (clampEnd && end > clampEnd) end = new Date(clampEnd);
  if (end <= start) return 0;

  const shiftStartMinutes = timeStringToMinutes(shiftStart, 7 * 60);
  const shiftEndMinutes = timeStringToMinutes(shiftEnd, 17 * 60);
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  let total = 0;

  while (cursor < end) {
    const nextDay = new Date(cursor);
    nextDay.setDate(nextDay.getDate() + 1);
    const segmentStart = start > cursor ? start : cursor;
    const segmentEnd = end < nextDay ? end : nextDay;

    const shiftStartAt = new Date(cursor);
    shiftStartAt.setMinutes(shiftStartMinutes, 0, 0);
    const shiftEndAt = new Date(cursor);
    shiftEndAt.setMinutes(shiftEndMinutes, 0, 0);

    const segmentMinutes = Math.max(0, Math.round((segmentEnd.getTime() - segmentStart.getTime()) / 60000));
    const insideMinutes = overlapMinutes(segmentStart, segmentEnd, shiftStartAt, shiftEndAt);
    total += Math.max(0, segmentMinutes - insideMinutes);
    cursor = nextDay;
  }

  return total;
}

export function weekBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function dateInput(reference = new Date()) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  return value;
}

export function eventOverlaps(start: Date, end: Date, otherStart: string | null, otherEnd: string | null) {
  if (!otherStart || !otherEnd) return false;
  const a = new Date(otherStart);
  const b = new Date(otherEnd);
  return a < end && b > start;
}
