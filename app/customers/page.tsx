"use client";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Bell, Boxes, Building2, ClipboardList, Filter, LayoutDashboard,
  Package, Plus, ReceiptText, RefreshCw, Search, Settings, Truck, Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";
import { createClient } from "@/lib/supabase/client";
import type {
  ContactForm, CustomerDetailTab, CustomerForm, CustomerStatus, CustomerSummaryView,
  DbCustomer, DbCustomerContact, DbCustomerNote, DbProfile, DbRole, DbSite, DbWorkOrder, SiteForm,
} from "./types";
import {
  customerStatuses, emptyContactForm, emptyCustomerForm, emptySiteForm, openWorkOrderStatuses,
} from "./constants";
import { capitalize, parseTags } from "./utils";
import { CustomerSummaryCards } from "./components/customer-summary-cards";
import { CustomerTable } from "./components/customer-table";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { CustomerDetailModal } from "./components/modals/customer-detail-modal";
import { CustomerSummaryModal } from "./components/modals/customer-summary-modal";
import { CustomerFormModal } from "./components/modals/customer-form-modal";
import { NewSiteModal } from "./components/modals/new-site-modal";
import { NewContactModal } from "./components/modals/new-contact-modal";
import { AddCustomerNoteModal } from "./components/modals/add-customer-note-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, active: true, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Accounts", icon: ReceiptText, href: "/accounts" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const customerSelect = "id,name,account_number,status,customer_type,phone,email,website,billing_email,billing_terms_days,tax_exempt,address1,address2,city,province_state,postal_code,country,tags,notes,created_at,updated_at";
const siteSelect = "id,customer_id,name,address1,address2,city,province_state,postal_code,country,phone,instructions,active,created_at,updated_at";
const contactSelect = "id,customer_id,site_id,first_name,last_name,title,email,phone,mobile,is_primary,receives_billing,receives_service_updates,active,created_at,updated_at";
const workOrderSelect = "id,work_order_number,customer_id,site_id,title,description,priority,status,requested_at,scheduled_start,scheduled_end,completed_at,closed_at,billing_status";

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [contacts, setContacts] = useState<DbCustomerContact[]>([]);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);
  const [notes, setNotes] = useState<DbCustomerNote[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<CustomerDetailTab>("overview");
  const [summaryView, setSummaryView] = useState<CustomerSummaryView | null>(null);

  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerFormMode, setCustomerFormMode] = useState<"new" | "edit">("new");
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [savingSite, setSavingSite] = useState(false);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [contactError, setContactError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNoticeState | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;
  const selectedSites = selectedCustomer ? sites.filter((s) => s.customer_id === selectedCustomer.id) : [];
  const selectedContacts = selectedCustomer ? contacts.filter((c) => c.customer_id === selectedCustomer.id) : [];
  const selectedWorkOrders = selectedCustomer ? workOrders.filter((o) => o.customer_id === selectedCustomer.id) : [];
  const selectedNotes = selectedCustomer
    ? notes.filter((n) => n.customer_id === selectedCustomer.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const canManage = useMemo(() => {
    if (!currentUserId) return false;
    const mine = roles.filter((r) => r.user_id === currentUserId).map((r) => r.role);
    return mine.some((r) => ["admin","manager","dispatcher","billing"].includes(r));
  }, [roles, currentUserId]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (statusFilter !== "all" && customer.status !== statusFilter) return false;
      if (!q) return true;
      const cContacts = contacts.filter((c) => c.customer_id === customer.id);
      const cSites = sites.filter((s) => s.customer_id === customer.id);
      return [
        customer.name, customer.account_number, customer.phone, customer.email,
        customer.billing_email, customer.city, customer.province_state, ...customer.tags,
        ...cContacts.flatMap((c) => [c.first_name, c.last_name, c.email, c.phone]),
        ...cSites.flatMap((s) => [s.name, s.city, s.address1]),
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, contacts, sites, search, statusFilter]);

  const showNotice = useCallback((type: ActionNoticeState["type"], message: string) => {
    setActionNotice({ type, message });
  }, []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const loadCustomers = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    setAuthRequired(false);
    setCurrentUserId(authData.user.id);

    const [
      customersResult, sitesResult, contactsResult, workOrdersResult,
      notesResult, profilesResult, rolesResult,
    ] = await Promise.all([
      supabase.from("customers").select(customerSelect).order("name"),
      supabase.from("sites").select(siteSelect).order("name"),
      supabase.from("customer_contacts").select(contactSelect).order("is_primary", { ascending: false }).order("last_name"),
      supabase.from("work_orders").select(workOrderSelect).order("requested_at", { ascending: false }),
      supabase.from("customer_notes").select("id,customer_id,note,created_by,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("user_roles").select("user_id,role"),
    ]);

    const firstError = customersResult.error ?? sitesResult.error ?? contactsResult.error ??
      workOrdersResult.error ?? notesResult.error ?? profilesResult.error ?? rolesResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setCustomers((customersResult.data ?? []) as unknown as DbCustomer[]);
    setSites((sitesResult.data ?? []) as unknown as DbSite[]);
    setContacts((contactsResult.data ?? []) as unknown as DbCustomerContact[]);
    setWorkOrders((workOrdersResult.data ?? []) as unknown as DbWorkOrder[]);
    setNotes((notesResult.data ?? []) as unknown as DbCustomerNote[]);
    setProfiles((profilesResult.data ?? []) as unknown as DbProfile[]);
    setRoles((rolesResult.data ?? []) as unknown as DbRole[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    if (authRequired) return;
    let timer: number | null = null;
    const refreshSoon = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadCustomers(), 250);
    };
    const channel = supabase
      .channel("fieldops-customers-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "sites" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_contacts" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_notes" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, refreshSoon)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [authRequired, loadCustomers, supabase]);

  function openCustomer(id: string) {
    setSelectedCustomerId(id);
    setDetailTab("overview");
  }

  function openNewCustomer() {
    setCustomerFormMode("new");
    setCustomerForm(emptyCustomerForm);
    setCustomerFormError(null);
    setCustomerFormOpen(true);
  }

  function openEditCustomer() {
    if (!selectedCustomer) return;
    setCustomerFormMode("edit");
    setCustomerForm({
      ...emptyCustomerForm,
      name: selectedCustomer.name,
      accountNumber: selectedCustomer.account_number ?? "",
      status: selectedCustomer.status,
      customerType: selectedCustomer.customer_type,
      phone: selectedCustomer.phone ?? "",
      email: selectedCustomer.email ?? "",
      website: selectedCustomer.website ?? "",
      billingEmail: selectedCustomer.billing_email ?? "",
      billingTermsDays: String(selectedCustomer.billing_terms_days ?? 30),
      taxExempt: selectedCustomer.tax_exempt,
      address1: selectedCustomer.address1 ?? "",
      address2: selectedCustomer.address2 ?? "",
      city: selectedCustomer.city ?? "",
      provinceState: selectedCustomer.province_state ?? "",
      postalCode: selectedCustomer.postal_code ?? "",
      country: selectedCustomer.country ?? "",
      tags: selectedCustomer.tags.join(", "),
      notes: selectedCustomer.notes ?? "",
    });
    setCustomerFormError(null);
    setCustomerFormOpen(true);
  }

  function customerPayload(form: CustomerForm) {
    return {
      name: form.name.trim(),
      account_number: form.accountNumber.trim() || null,
      status: form.status,
      customer_type: form.customerType,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      billing_email: form.billingEmail.trim() || null,
      billing_terms_days: Number(form.billingTermsDays),
      tax_exempt: form.taxExempt,
      address1: form.address1.trim() || null,
      address2: form.address2.trim() || null,
      city: form.city.trim() || null,
      province_state: form.provinceState.trim() || null,
      postal_code: form.postalCode.trim() || null,
      country: form.country.trim() || null,
      tags: parseTags(form.tags),
      notes: form.notes.trim() || null,
    };
  }

  async function saveCustomer() {
    setCustomerFormError(null);
    const name = customerForm.name.trim();
    const terms = Number(customerForm.billingTermsDays);
    if (!name) {
      setCustomerFormError("Customer name is required.");
      showNotice("error", "Customer save failed: Customer name is required.");
      return;
    }
    if (!Number.isFinite(terms) || terms < 0 || terms > 365) {
      setCustomerFormError("Billing terms must be between 0 and 365 days.");
      showNotice("error", "Customer save failed: Billing terms must be between 0 and 365 days.");
      return;
    }

    setSavingCustomer(true);
    showNotice("info", customerFormMode === "new" ? `Creating ${name}…` : `Saving ${name}…`);

    try {
      if (customerFormMode === "new") {
        const { data, error: insertError } = await supabase
          .from("customers").insert(customerPayload(customerForm)).select(customerSelect).single();
        if (insertError || !data) {
          const message = insertError?.message ?? "Customer was not returned after creation.";
          setCustomerFormError(message);
          showNotice("error", `Customer creation failed: ${message}`);
          return;
        }

        const created = data as unknown as DbCustomer;

        if (customerForm.primaryFirstName.trim() || customerForm.primaryLastName.trim()) {
          const first = customerForm.primaryFirstName.trim();
          const last = customerForm.primaryLastName.trim();
          if (!first || !last) {
            setSelectedCustomerId(created.id);
            setCustomerFormOpen(false);
            await loadCustomers();
            showNotice("error", "Customer was created, but primary contact was skipped because first and last name are both required.");
            return;
          }
          const { error: contactErr } = await supabase.from("customer_contacts").insert({
            customer_id: created.id, first_name: first, last_name: last,
            title: customerForm.primaryTitle.trim() || null,
            email: customerForm.primaryEmail.trim() || null,
            phone: customerForm.primaryPhone.trim() || null,
            is_primary: true, receives_billing: false, receives_service_updates: true, active: true,
          });
          if (contactErr) {
            setSelectedCustomerId(created.id);
            setCustomerFormOpen(false);
            await loadCustomers();
            showNotice("error", `Customer was created, but primary contact failed: ${contactErr.message}`);
            return;
          }
        }

        setSelectedCustomerId(created.id);
        setCustomerFormOpen(false);
        await loadCustomers();
        showNotice("success", `${created.name} was created successfully.`);
      } else {
        if (!selectedCustomer) return;
        const { error: updateError } = await supabase.from("customers")
          .update(customerPayload(customerForm)).eq("id", selectedCustomer.id);
        if (updateError) {
          setCustomerFormError(updateError.message);
          showNotice("error", `Customer update failed: ${updateError.message}`);
          return;
        }
        setCustomerFormOpen(false);
        await loadCustomers();
        showNotice("success", `${name} was updated successfully.`);
      }
    } finally {
      setSavingCustomer(false);
    }
  }

  function openAddSite() {
    setSiteForm({ ...emptySiteForm, city: selectedCustomer?.city ?? "", provinceState: selectedCustomer?.province_state ?? "", country: selectedCustomer?.country ?? "Canada" });
    setSiteError(null);
    setSiteModalOpen(true);
  }

  async function saveSite() {
    if (!selectedCustomer) return;
    const name = siteForm.name.trim();
    if (!name) {
      setSiteError("Site name is required.");
      showNotice("error", "Site creation failed: Site name is required.");
      return;
    }
    setSavingSite(true);
    const { error: insertError } = await supabase.from("sites").insert({
      customer_id: selectedCustomer.id, name,
      address1: siteForm.address1.trim() || null,
      address2: siteForm.address2.trim() || null,
      city: siteForm.city.trim() || null,
      province_state: siteForm.provinceState.trim() || null,
      postal_code: siteForm.postalCode.trim() || null,
      country: siteForm.country.trim() || null,
      phone: siteForm.phone.trim() || null,
      instructions: siteForm.instructions.trim() || null,
      active: siteForm.active,
    });
    setSavingSite(false);
    if (insertError) {
      setSiteError(insertError.message);
      showNotice("error", `Site creation failed: ${insertError.message}`);
      return;
    }
    setSiteModalOpen(false);
    await loadCustomers();
    showNotice("success", `${name} was added to ${selectedCustomer.name}.`);
  }

  function openAddContact() {
    setContactForm(emptyContactForm);
    setContactError(null);
    setContactModalOpen(true);
  }

  async function saveContact() {
    if (!selectedCustomer) return;
    const first = contactForm.firstName.trim();
    const last = contactForm.lastName.trim();
    if (!first || !last) {
      setContactError("First name and last name are required.");
      showNotice("error", "Contact creation failed: First name and last name are required.");
      return;
    }
    setSavingContact(true);

    if (contactForm.isPrimary) {
      const { error: clearErr } = await supabase.from("customer_contacts")
        .update({ is_primary: false }).eq("customer_id", selectedCustomer.id).eq("is_primary", true);
      if (clearErr) {
        setSavingContact(false);
        setContactError(clearErr.message);
        showNotice("error", `Contact creation failed: ${clearErr.message}`);
        return;
      }
    }

    const { error: insertError } = await supabase.from("customer_contacts").insert({
      customer_id: selectedCustomer.id,
      site_id: contactForm.siteId || null,
      first_name: first, last_name: last,
      title: contactForm.title.trim() || null,
      email: contactForm.email.trim() || null,
      phone: contactForm.phone.trim() || null,
      mobile: contactForm.mobile.trim() || null,
      is_primary: contactForm.isPrimary,
      receives_billing: contactForm.receivesBilling,
      receives_service_updates: contactForm.receivesServiceUpdates,
      active: contactForm.active,
    });
    setSavingContact(false);
    if (insertError) {
      setContactError(insertError.message);
      showNotice("error", `Contact creation failed: ${insertError.message}`);
      return;
    }
    setContactModalOpen(false);
    await loadCustomers();
    showNotice("success", `${first} ${last} was added successfully.`);
  }

  function openAddNote() {
    setNoteText("");
    setNoteError(null);
    setNoteModalOpen(true);
  }

  async function saveNote() {
    if (!selectedCustomer) return;
    const note = noteText.trim();
    if (note.length < 3) {
      setNoteError("Enter a meaningful customer note.");
      showNotice("error", "Customer note failed: Enter a meaningful note.");
      return;
    }
    setSavingNote(true);
    const { error: insertError } = await supabase.from("customer_notes").insert({
      customer_id: selectedCustomer.id, note, created_by: currentUserId,
    });
    setSavingNote(false);
    if (insertError) {
      setNoteError(insertError.message);
      showNotice("error", `Customer note failed: ${insertError.message}`);
      return;
    }
    setNoteModalOpen(false);
    setNoteText("");
    await loadCustomers();
    showNotice("success", "Customer note was added successfully.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ActionNotice notice={actionNotice} onClose={() => setActionNotice(null)} />

      <FieldOpsSidebar fixed />

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="hidden max-w-xl flex-1 md:block">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e)=>setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10" placeholder="Search customers, contacts, sites..." /></div>
          </div>
          <div className="ml-auto flex items-center gap-2"><FieldOpsThemeToggle /><button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><Bell className="h-4 w-4" /></button></div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="text-sm font-semibold text-primary">Customers</div><h1 className="mt-1 text-2xl font-black">Customer Management</h1><p className="mt-1 text-sm text-muted-foreground">Customer accounts, contacts, sites, service history, and billing profile.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={()=>void loadCustomers()} className="inline-flex h-10 items-center gap-2 border border-border bg-card px-3 text-xs font-black"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
              {canManage && <button type="button" onClick={openNewCustomer} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-sm font-black text-primary-foreground"><Plus className="h-4 w-4" />New Customer</button>}
            </div>
          </section>

          {authRequired ? (
            <section className="border border-border bg-card p-8 text-center"><h2 className="text-xl font-black">Sign in to load customer records</h2><Link href="/auth/login" className="mt-5 inline-flex h-10 items-center bg-primary px-5 text-sm font-black text-primary-foreground">Sign in</Link></section>
          ) : <>
            {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
            <CustomerSummaryCards
              totalCustomers={customers.length}
              activeCustomers={customers.filter((c)=>c.status==="active").length}
              openWorkOrders={workOrders.filter((o)=>openWorkOrderStatuses.has(o.status)).length}
              serviceSites={sites.length}
              onView={setSummaryView}
            />

            <section className="mt-5 border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="font-black">Customer Directory</h2><div className="mt-1 text-xs text-muted-foreground">{filteredCustomers.length} of {customers.length} customers</div></div>
                <div className="flex flex-wrap gap-2">
                  <label className="relative min-w-[260px] flex-1 lg:hidden"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e)=>setSearch(e.target.value)} className="h-10 w-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Search customers..." /></label>
                  <label className="flex h-10 items-center gap-2 border border-border bg-background px-3"><Filter className="h-3.5 w-3.5 text-muted-foreground" /><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as "all" | CustomerStatus)} className="bg-transparent text-xs font-black outline-none"><option value="all">All statuses</option>{customerStatuses.map((s)=><option key={s} value={s}>{capitalize(s)}</option>)}</select></label>
                </div>
              </div>
              {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading customers…</div> : <CustomerTable customers={filteredCustomers} contacts={contacts} sites={sites} workOrders={workOrders} onOpen={openCustomer} />}
            </section>
          </>}
        </div>
      </div>

      <CustomerSummaryModal view={summaryView} customers={customers} sites={sites} workOrders={workOrders} onOpenCustomer={openCustomer} onClose={()=>setSummaryView(null)} />
      <CustomerDetailModal customer={selectedCustomer} tab={detailTab} contacts={selectedContacts} sites={selectedSites} workOrders={selectedWorkOrders} notes={selectedNotes} profileMap={profileMap} canManage={canManage} onTabChange={setDetailTab} onEdit={openEditCustomer} onAddContact={openAddContact} onAddSite={openAddSite} onAddNote={openAddNote} onClose={()=>setSelectedCustomerId(null)} />
      <CustomerFormModal open={customerFormOpen} mode={customerFormMode} form={customerForm} setForm={setCustomerForm} saving={savingCustomer} error={customerFormError} onSave={()=>void saveCustomer()} onClose={()=>{ if(!savingCustomer){setCustomerFormOpen(false);setCustomerFormError(null);} }} />
      <NewSiteModal open={siteModalOpen} form={siteForm} setForm={setSiteForm} saving={savingSite} error={siteError} onSave={()=>void saveSite()} onClose={()=>{if(!savingSite){setSiteModalOpen(false);setSiteError(null);}}} />
      <NewContactModal open={contactModalOpen} form={contactForm} setForm={setContactForm} sites={selectedSites} saving={savingContact} error={contactError} onSave={()=>void saveContact()} onClose={()=>{if(!savingContact){setContactModalOpen(false);setContactError(null);}}} />
      <AddCustomerNoteModal open={noteModalOpen} value={noteText} saving={savingNote} error={noteError} onChange={setNoteText} onSave={()=>void saveNote()} onClose={()=>{if(!savingNote){setNoteModalOpen(false);setNoteError(null);}}} />
    </main>
  );
}
