import type { ReactNode } from "react";
export function SectionCard({ title, description, children }: { title:string; description?:string; children:ReactNode }) {
  return <section className="border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-base font-black">{title}</h2>{description&&<p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div><div className="p-5">{children}</div></section>;
}
export function Field({ label, children, hint }: { label:string; children:ReactNode; hint?:string }) { return <label className="block"><span className="mb-1 block text-xs font-black">{label}</span>{children}{hint&&<span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}</label>; }
export const inputClass="h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary";
export const textareaClass="min-h-24 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
export const selectClass=inputClass;
