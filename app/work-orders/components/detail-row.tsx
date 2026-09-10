
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-right text-xs font-bold">{value}</div>
    </div>
  );
}
