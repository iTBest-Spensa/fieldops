"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ActionNoticeState = { type: "info" | "success" | "error"; message: string } | null;

export function ActionNotice({ notice, onClose }: { notice: ActionNoticeState; onClose: () => void }) {
  if (!notice) return null;
  const Icon = notice.type === "success" ? CheckCircle2 : notice.type === "error" ? CircleAlert : Info;
  const tone = notice.type === "success"
    ? "border-emerald-500 bg-emerald-950 text-emerald-50"
    : notice.type === "error"
      ? "border-rose-500 bg-rose-950 text-rose-50"
      : "border-cyan-500 bg-slate-950 text-cyan-50";
  const label = notice.type === "success" ? "SUCCESS" : notice.type === "error" ? "ACTION FAILED" : "WORKING";

  return (
    <div className={`fixed right-5 top-5 z-[250000] flex w-[min(92vw,460px)] items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl ${tone}`} role="status" aria-live="polite">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-wider opacity-90">{label}</div>
        <div className="mt-1 text-sm font-bold leading-5">{notice.message}</div>
      </div>
      <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/30 opacity-80 hover:opacity-100" aria-label="Close notice"><X className="h-4 w-4" /></button>
    </div>
  );
}
