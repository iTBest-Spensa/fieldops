import { Building2, Mail, MapPin, Phone, ReceiptText, Tag } from "lucide-react";
import type { DbCustomer, DbCustomerContact, DbSite, DbWorkOrder } from "../types";
import { capitalize, customerAccountLabel, customerAddress, fullContactName } from "../utils";
import { openWorkOrderStatuses } from "../constants";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value || "—"}</div>
    </div>
  );
}

export function CustomerOverview({
  customer, contacts, sites, workOrders,
}: {
  customer: DbCustomer;
  contacts: DbCustomerContact[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
}) {
  const primary = contacts.find((c) => c.active && c.is_primary) ?? contacts.find((c) => c.active) ?? null;
  const openOrders = workOrders.filter((o) => openWorkOrderStatuses.has(o.status));
  const closedOrders = workOrders.filter((o) => o.status === "closed");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="border border-border bg-card p-4"><Building2 className="h-4 w-4 text-primary" /><div className="mt-3 text-2xl font-black">{sites.length}</div><div className="text-xs text-muted-foreground">Service sites</div></div>
        <div className="border border-border bg-card p-4"><Phone className="h-4 w-4 text-primary" /><div className="mt-3 text-2xl font-black">{contacts.filter((c) => c.active).length}</div><div className="text-xs text-muted-foreground">Active contacts</div></div>
        <div className="border border-border bg-card p-4"><ReceiptText className="h-4 w-4 text-amber-500" /><div className="mt-3 text-2xl font-black">{openOrders.length}</div><div className="text-xs text-muted-foreground">Open work orders</div></div>
        <div className="border border-border bg-card p-4"><ReceiptText className="h-4 w-4 text-emerald-500" /><div className="mt-3 text-2xl font-black">{closedOrders.length}</div><div className="text-xs text-muted-foreground">Closed work orders</div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-black">Account Information</h3></div>
          <div className="grid gap-5 p-4 sm:grid-cols-2">
            <Detail label="Account" value={customerAccountLabel(customer)} />
            <Detail label="Customer Type" value={capitalize(customer.customer_type)} />
            <Detail label="Phone" value={customer.phone ?? "—"} />
            <Detail label="Email" value={customer.email ?? "—"} />
            <Detail label="Website" value={customer.website ?? "—"} />
            <Detail label="Billing Email" value={customer.billing_email ?? customer.email ?? "—"} />
          </div>
        </section>

        <section className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-black">Billing & Address</h3></div>
          <div className="grid gap-5 p-4 sm:grid-cols-2">
            <Detail label="Billing Terms" value={customer.billing_terms_days === 0 ? "Due on receipt" : `Net ${customer.billing_terms_days}`} />
            <Detail label="Tax Status" value={customer.tax_exempt ? "Tax exempt" : "Taxable"} />
            <div className="sm:col-span-2 flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /><Detail label="Billing Address" value={customerAddress(customer)} /></div>
          </div>
        </section>
      </div>

      <section className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-black">Primary Contact</h3></div>
        {primary ? (
          <div className="grid gap-4 p-4 md:grid-cols-3">
            <div><div className="text-sm font-black">{fullContactName(primary)}</div><div className="mt-1 text-xs text-muted-foreground">{primary.title ?? "Contact"}</div></div>
            <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" />{primary.phone ?? primary.mobile ?? "No phone"}</div>
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" />{primary.email ?? "No email"}</div>
          </div>
        ) : <div className="p-4 text-sm text-muted-foreground">No customer contact has been added yet.</div>}
      </section>

      {(customer.tags.length > 0 || customer.notes) && (
        <section className="border border-border bg-card p-4">
          {customer.tags.length > 0 && <div className="flex flex-wrap items-center gap-2"><Tag className="h-4 w-4 text-primary" />{customer.tags.map((tag) => <span key={tag} className="border border-border bg-muted/30 px-2 py-1 text-[10px] font-bold">{tag}</span>)}</div>}
          {customer.notes && <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{customer.notes}</div>}
        </section>
      )}
    </div>
  );
}
