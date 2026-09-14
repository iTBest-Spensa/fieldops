import type { ActivityStatus, NewWorkOrderForm } from "./types";

export const BOARD_START_HOUR = 8;
export const BOARD_END_HOUR = 16;
export const BOARD_TOTAL_HOURS = BOARD_END_HOUR - BOARD_START_HOUR;
export const boardHours = Array.from(
  { length: BOARD_TOTAL_HOURS + 1 },
  (_, index) => BOARD_START_HOUR + index
);

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
  scheduleTime: "",
  estimatedDurationMinutes: "60",
  requiredSkills: "",
  serviceArea: "",
};
