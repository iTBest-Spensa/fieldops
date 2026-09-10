"use client";
import { MapPin, Phone, Plus } from "lucide-react";
import type { DbSite } from "../types";

function siteAddress(site: DbSite) {
  return [site.address1, site.address2, site.city, site.province_state, site.postal_code, site.country].filter(Boolean).join(", ") || "No address";
}

export function CustomerSitesPanel({ sites, canManage, onAdd }: {
  sites: DbSite[];
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><h3 className="text-sm font-black">Service Sites</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Locations where FieldOps work can be scheduled.</p></div>
        {canManage && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="h-3.5 w-3.5" />Add Site</button>}
      </div>
      {sites.length === 0 ? <div className="p-5 text-sm text-muted-foreground">No service sites have been added.</div> : (
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {sites.map((site) => (
            <article key={site.id} className="border border-border bg-background/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-sm font-black">{site.name}</div><div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{siteAddress(site)}</span></div></div>
                <span className={`border px-2 py-1 text-[8px] font-black uppercase ${site.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-500/30 text-muted-foreground"}`}>{site.active ? "Active" : "Inactive"}</span>
              </div>
              {site.phone && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" />{site.phone}</div>}
              {site.instructions && <div className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{site.instructions}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
