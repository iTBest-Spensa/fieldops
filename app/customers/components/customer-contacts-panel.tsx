"use client";
import { Mail, MapPin, Phone, Plus } from "lucide-react";
import type { DbCustomerContact, DbSite } from "../types";
import { fullContactName } from "../utils";

export function CustomerContactsPanel({ contacts, sites, canManage, onAdd }: {
  contacts: DbCustomerContact[];
  sites: DbSite[];
  canManage: boolean;
  onAdd: () => void;
}) {
  const siteMap = new Map(sites.map((s) => [s.id, s]));
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div><h3 className="text-sm font-black">Contacts</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Service, billing, and update contacts.</p></div>
        {canManage && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-black text-primary-foreground"><Plus className="h-3.5 w-3.5" />Add Contact</button>}
      </div>
      {contacts.length === 0 ? <div className="p-5 text-sm text-muted-foreground">No contacts have been added.</div> : (
        <div className="divide-y divide-border">
          {[...contacts].sort((a,b) => Number(b.is_primary) - Number(a.is_primary)).map((contact) => (
            <article key={contact.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black">{fullContactName(contact)}</span>
                    {contact.is_primary && <span className="border border-primary/30 bg-primary/10 px-2 py-0.5 text-[8px] font-black uppercase text-primary">Primary</span>}
                    {!contact.active && <span className="border border-slate-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-muted-foreground">Inactive</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{contact.title ?? "Contact"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contact.receives_billing && <span className="border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-600 dark:text-cyan-400">BILLING</span>}
                  {contact.receives_service_updates && <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-black text-emerald-600 dark:text-emerald-400">SERVICE UPDATES</span>}
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{contact.phone ?? contact.mobile ?? "No phone"}</div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{contact.email ?? "No email"}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{contact.site_id ? siteMap.get(contact.site_id)?.name ?? "Assigned site" : "All customer sites"}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
