"use client";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function ModalShell({ title, eyebrow, onClose, children, width = "max-w-3xl", footer }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; width?: string; footer?: ReactNode }) {
  return <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4">
    <button type="button" aria-label="Close modal" onClick={onClose} className="absolute inset-0 bg-black/55" />
    <section className={`relative z-10 flex max-h-[90vh] w-full ${width} flex-col overflow-hidden border border-border bg-background shadow-2xl`}>
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"><div>{eyebrow ? <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</div> : null}<h2 className="mt-1 text-xl font-black">{title}</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border hover:bg-muted"><X className="h-4 w-4" /></button></header>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
      {footer ? <footer className="border-t border-border bg-muted/20 px-5 py-4">{footer}</footer> : null}
    </section>
  </div>;
}
