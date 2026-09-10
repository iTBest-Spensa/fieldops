import { ChevronRight, ClipboardList } from "lucide-react";

export function SummaryCard({
  label,
  value,
  icon: Icon,
  onView,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  onView: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/75 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-black">{value}</div>
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 pb-0.5 text-[10px] font-bold text-primary hover:underline"
        >
          View
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
