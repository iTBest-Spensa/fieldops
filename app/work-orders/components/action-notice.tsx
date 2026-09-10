import { X } from "lucide-react";

type Props = { actionNotice: { type: "success" | "error" | "info"; message: string }; onDismiss: () => void; };

export function ActionNotice({ actionNotice, onDismiss }: Props) {
  return (
    <div className="fixed right-5 top-5 z-[250000] w-[min(460px,calc(100vw-40px))]">
      <div
        role="status"
        aria-live="polite"
        className={`border px-4 py-3 shadow-2xl ${
          actionNotice.type === "success"
            ? "border-emerald-500 bg-emerald-950 text-emerald-100"
            : actionNotice.type === "error"
            ? "border-rose-500 bg-rose-950 text-rose-100"
            : "border-cyan-500 bg-slate-950 text-cyan-100"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider">
              {actionNotice.type === "success"
                ? "SUCCESS"
                : actionNotice.type === "error"
                ? "ACTION FAILED"
                : "WORKING"}
            </div>
            <div className="mt-1 text-sm font-semibold leading-5">
              {actionNotice.message}
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-current/30"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
