"use client";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
export type ActionNoticeState = { type: "info" | "success" | "error"; message: string } | null;
export function ActionNotice({ notice, onClose }: { notice: ActionNoticeState; onClose: () => void }) {
  if (!notice) return null;
  const Icon = notice.type === "success" ? CheckCircle2 : notice.type === "error" ? CircleAlert : Info;
  const tone = notice.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" : notice.type === "error" ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200" : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-200";
  return <div className={`fixed right-5 top-5 z-[99999] flex w-[min(92vw,430px)] items-start gap-3 border p-4 shadow-2xl ${tone}`}><Icon className="mt-0.5 h-5 w-5 shrink-0"/><div className="min-w-0 flex-1 text-sm font-semibold">{notice.message}</div><button type="button" onClick={onClose} aria-label="Close notice" className="shrink-0 opacity-70 hover:opacity-100"><X className="h-4 w-4"/></button></div>;
}
