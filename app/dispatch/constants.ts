import type { ActivityStatus, ArrivalWindowKey, NewWorkOrderForm } from "./types";

export const BOARD_START_HOUR = 8;
export const BOARD_END_HOUR = 16;
export const BOARD_TOTAL_HOURS = BOARD_END_HOUR - BOARD_START_HOUR;
export const boardHours = Array.from(
  { length: BOARD_TOTAL_HOURS + 1 },
  (_, index) => BOARD_START_HOUR + index
);

export const arrivalWindows: Array<{
  key: ArrivalWindowKey;
  label: string;
  shortLabel: string;
  startHour: number;
  endHour: number;
}> = [
  { key: "8-9", label: "8:00 AM – 9:00 AM", shortLabel: "8–9", startHour: 8, endHour: 9 },
  { key: "9-11", label: "9:00 AM – 11:00 AM", shortLabel: "9–11", startHour: 9, endHour: 11 },
  { key: "11-1", label: "11:00 AM – 1:00 PM", shortLabel: "11–1", startHour: 11, endHour: 13 },
  { key: "1-3", label: "1:00 PM – 3:00 PM", shortLabel: "1–3", startHour: 13, endHour: 15 },
];

export const estimatedDurationOptionsMinutes = Array.from(
  { length: 96 },
  (_, index) => (index + 1) * 15
);

export function getArrivalWindow(key: ArrivalWindowKey | "" | null | undefined) {
  return arrivalWindows.find((window) => window.key === key) ?? null;
}

export function arrivalWindowForHour(hour: number) {
  return (
    arrivalWindows.find((window) => hour >= window.startHour && hour < window.endHour) ??
    (hour < arrivalWindows[0].startHour
      ? arrivalWindows[0]
      : arrivalWindows[arrivalWindows.length - 1])
  );
}

export function durationMinutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const hourLabel = `${hours} hr${hours === 1 ? "" : "s"}`;
  return remainder ? `${hourLabel} ${remainder} min` : hourLabel;
}


export const statusColors: Record<ActivityStatus, { line: string; text: string; label: string }> = {
  complete: {
    line: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Complete",
  },
  travelling: {
    line: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "Travelling",
  },
  on_site: {
    line: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "On Site",
  },
  working: {
    line: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    label: "Working",
  },
  assigned: {
    line: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    label: "Assigned",
  },
  available: {
    line: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-300",
    label: "Available",
  },
  break: {
    line: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-300",
    label: "Break",
  },
};

export const priorityTone: Record<string, string> = {
  emergency: "border-rose-500 bg-rose-500/10 text-rose-500",
  urgent: "border-rose-500 bg-rose-500/10 text-rose-500",
  high: "border-amber-500 bg-amber-500/10 text-amber-500",
  normal: "border-sky-500 bg-sky-500/10 text-sky-500",
  low: "border-slate-500 bg-slate-500/10 text-slate-500",
};

export const statusTone: Record<string, string> = {
  "ON SITE": "border-blue-500 bg-blue-500/10 text-blue-500",
  TRAVELLING: "border-blue-500 bg-blue-500/10 text-blue-500",
  WORKING: "border-orange-500 bg-orange-500/10 text-orange-500",
  ASSIGNED: "border-violet-500 bg-violet-500/10 text-violet-500",
  AVAILABLE: "border-slate-500 bg-slate-500/10 text-slate-500",
  COMPLETE: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
};

export const emptyNewWorkOrderForm: NewWorkOrderForm = {
  customerId: "",
  siteId: "",
  title: "",
  description: "",
  jobType: "",
  priority: "normal",
  source: "office",
  scheduleDate: "",
  arrivalWindowKey: "",
  estimatedDurationMinutes: "60",
  requiredSkills: "",
  serviceArea: "",
};
