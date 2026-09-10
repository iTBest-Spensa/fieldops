import { Building2 } from "lucide-react";

export function InfoCard({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-sm font-bold">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{subvalue}</div>
    </div>
  );
}
