"use client";
import { ClipboardList, MapPin, Pencil, Phone, X } from "lucide-react";
import type { CustomerDetailTab, DbCustomer, DbCustomerContact, DbCustomerNote, DbProfile, DbSite, DbWorkOrder } from "../../types";
import { capitalize, customerAccountLabel, customerStatusTone } from "../../utils";
import { CustomerOverview } from "../customer-overview";
import { CustomerContactsPanel } from "../customer-contacts-panel";
import { CustomerSitesPanel } from "../customer-sites-panel";
import { CustomerWorkOrdersPanel } from "../customer-work-orders-panel";
import { CustomerNotesPanel } from "../customer-notes-panel";

export function CustomerDetailModal({
  customer, tab, contacts, sites, workOrders, notes, profileMap, canManage,
  onTabChange, onEdit, onAddContact, onAddSite, onAddNote, onClose,
}: {
  customer: DbCustomer | null;
  tab: CustomerDetailTab;
  contacts: DbCustomerContact[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  notes: DbCustomerNote[];
  profileMap: Map<string, DbProfile>;
  canManage: boolean;
  onTabChange: (tab: CustomerDetailTab) => void;
  onEdit: () => void;
  onAddContact: () => void;
  onAddSite: () => void;
  onAddNote: () => void;
  onClose: () => void;
}) {
  if (!customer) return null;

  const tabs: Array<{key: CustomerDetailTab; label: string; count?: number}> = [
    { key: "overview", label: "Overview" },
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "sites", label: "Sites", count: sites.length },
    { key: "work_orders", label: "Work Orders", count: workOrders.length },
    { key: "notes", label: "Notes", count: notes.length },
  ];

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 lg:p-6">
      <button type="button" aria-label="Close customer" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <section className="relative z-10 flex h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <header className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-primary">{customerAccountLabel(customer)}</span>
                <span className={`border px-2 py-1 text-[8px] font-black uppercase ${customerStatusTone(customer.status)}`}>{capitalize(customer.status)}</span>
              </div>
              <h2 className="mt-2 text-2xl font-black">{customer.name}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>}
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{sites.length} service site{sites.length === 1 ? "" : "s"}</span>
                <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />{workOrders.length} work order{workOrders.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && <button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-black hover:bg-muted"><Pencil className="h-3.5 w-3.5" />Edit Customer</button>}
              <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-border"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-5 pt-3">
          {tabs.map((item) => (
            <button key={item.key} type="button" onClick={() => onTabChange(item.key)} className={`border-b-2 px-3 py-2 text-xs font-black ${tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {item.label}{item.count !== undefined && <span className="ml-1 text-[9px] opacity-70">{item.count}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && <CustomerOverview customer={customer} contacts={contacts} sites={sites} workOrders={workOrders} />}
          {tab === "contacts" && <CustomerContactsPanel contacts={contacts} sites={sites} canManage={canManage} onAdd={onAddContact} />}
          {tab === "sites" && <CustomerSitesPanel sites={sites} canManage={canManage} onAdd={onAddSite} />}
          {tab === "work_orders" && <CustomerWorkOrdersPanel workOrders={workOrders} sites={sites} />}
          {tab === "notes" && <CustomerNotesPanel notes={notes} profileMap={profileMap} canManage={canManage} onAdd={onAddNote} />}
        </div>
      </section>
    </div>
  );
}
