"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock3,
  Filter,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Dispatch", icon: Truck, active: true },
  { label: "Work Orders", icon: ClipboardList },
  { label: "Customers", icon: Building2 },
  { label: "Field Team", icon: Users },
  { label: "Assets", icon: Boxes },
  { label: "Inventory", icon: Package },
  { label: "Billing", icon: ReceiptText },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const waitingJobs = [
  {
    id: "WO-001041",
    title: "Network outage",
    customer: "Summit Professional Centre",
    place: "North Kamloops",
    time: "ASAP",
    priority: "Emergency",
    tone: "border-rose-500 bg-rose-500/10 text-rose-500",
  },
  {
    id: "WO-001044",
    title: "Replace damaged workstation",
    customer: "North Valley Accounting",
    place: "Downtown",
    time: "1:00 PM",
    priority: "High",
    tone: "border-amber-500 bg-amber-500/10 text-amber-500",
  },
  {
    id: "WO-001048",
    title: "New employee setup",
    customer: "Cedar Health Group",
    place: "South Shore",
    time: "2:30 PM",
    priority: "Normal",
    tone: "border-sky-500 bg-sky-500/10 text-sky-500",
  },
];

const technicians = [
  {
    initials: "AM",
    name: "Alex Morgan",
    role: "Network",
    status: "ON SITE",
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001032", title: "Firewall service", time: "8:30–10:00" },
    current: { id: "WO-001037", title: "Network outage", time: "10:30–1:45", tone: "border-sky-500 bg-sky-500/10" },
    next: { id: "WO-001052", title: "Wi-Fi survey", time: "2:15–3:30" },
  },
  {
    initials: "JS",
    name: "Jordan Singh",
    role: "Desktop",
    status: "TRAVELLING",
    statusTone: "border-sky-500 bg-sky-500/10 text-sky-500",
    previous: { id: "WO-001036", title: "Server check", time: "9:00–10:15" },
    current: { id: "WO-001043", title: "Workstation issue", time: "11:00–1:30", tone: "border-amber-500 bg-amber-500/10" },
    next: { id: "OPEN", title: "Available", time: "1:30–3:00" },
  },
  {
    initials: "NP",
    name: "Nina Patel",
    role: "Deployment",
    status: "AVAILABLE",
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001035", title: "Laptop setup", time: "8:00–9:45" },
    current: { id: "OPEN", title: "Available", time: "Now–3:15", tone: "border-dashed border-slate-400 bg-slate-500/5" },
    next: { id: "WO-001057", title: "User onboarding", time: "3:30–4:30" },
  },
  {
    initials: "DK",
    name: "Daniel Kim",
    role: "Security",
    status: "WORKING",
    statusTone: "border-amber-500 bg-amber-500/10 text-amber-500",
    previous: { id: "WO-001030", title: "Router swap", time: "8:00–9:00" },
    current: { id: "WO-001039", title: "Switch replacement", time: "9:30–2:30", tone: "border-amber-500 bg-amber-500/10" },
    next: { id: "WO-001061", title: "Security review", time: "3:00–4:30" },
  },
  {
    initials: "EL",
    name: "Ethan Lee",
    role: "Projects",
    status: "AVAILABLE",
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001028", title: "Office deployment", time: "8:30–11:00" },
    current: { id: "OPEN", title: "Available", time: "Now–2:45", tone: "border-dashed border-slate-400 bg-slate-500/5" },
    next: { id: "WO-001060", title: "Rack cleanup", time: "2:45–4:30" },
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar xl:flex">
        <div className="flex h-[72px] items-center gap-3 border-b border-border px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">FieldOps</div>
            <div className="text-xs text-muted-foreground">Service Operations</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="hidden max-w-xl flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                placeholder="Search work orders, customers, technicians..."
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <FieldOpsThemeToggle />
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
            </button>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">Dispatch</div>
              <h1 className="mt-1 text-2xl font-bold">Technician Track Board</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                See where each technician has been, what they are doing now, and what comes next.
              </p>
            </div>

            <div className="flex gap-2">
              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                Tue, Sep 8
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                Filter
              </button>

              <button className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            </div>
          </section>

          <section className="mb-5 grid gap-3 sm:grid-cols-3">
            <SmallMetric label="Waiting" value="8" />
            <SmallMetric label="Active Technicians" value="5" />
            <SmallMetric label="Available Now" value="2" />
          </section>

          <div className="grid gap-5 2xl:grid-cols-[300px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="border-b border-border px-4 py-4">
                <h2 className="font-bold">Waiting work</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Unassigned work orders</p>
              </div>

              <div className="divide-y divide-border">
                {waitingJobs.map((job) => (
                  <div key={job.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-primary">{job.id}</span>
                      <span className={`border px-2 py-1 text-[10px] font-bold rounded-none ${job.tone}`}>
                        {job.priority}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-bold">{job.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{job.customer}</div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.place}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {job.time}
                      </span>
                    </div>

                    <button className="mt-3 w-full border border-primary/30 bg-primary/5 py-2 text-xs font-bold text-primary rounded-none">
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">Technician tracks</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Previous → Current → Next
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">Updated just now</div>
                </div>
              </div>

              <div className="grid grid-cols-[190px_120px_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="border-r border-border px-4 py-3">Technician</div>
                <div className="border-r border-border px-3 py-3">Status</div>
                <div className="border-r border-border px-3 py-3">Previous</div>
                <div className="border-r border-border px-3 py-3">Current</div>
                <div className="px-3 py-3">Next</div>
              </div>

              {technicians.map((tech) => (
                <div
                  key={tech.name}
                  className="grid grid-cols-[190px_120px_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-3 border-r border-border p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                      {tech.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{tech.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{tech.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center border-r border-border p-3">
                    <div className={`w-full border px-2 py-2 text-center text-[10px] font-black rounded-none ${tech.statusTone}`}>
                      {tech.status}
                    </div>
                  </div>

                  <TrackBox item={tech.previous} muted />

                  <div className="border-r border-border p-3">
                    <div className={`h-full min-h-[76px] border p-3 rounded-none ${tech.current.tone}`}>
                      <div className="text-[10px] font-black text-primary">{tech.current.id}</div>
                      <div className="mt-1 truncate text-xs font-bold">{tech.current.title}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">{tech.current.time}</div>
                    </div>
                  </div>

                  <TrackBox item={tech.next} />
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function TrackBox({
  item,
  muted = false,
}: {
  item: { id: string; title: string; time: string };
  muted?: boolean;
}) {
  return (
    <div className="border-r border-border p-3 last:border-r-0">
      <div
        className={`h-full min-h-[76px] border p-3 rounded-none ${
          muted
            ? "border-border bg-muted/35"
            : item.id === "OPEN"
            ? "border-dashed border-slate-400 bg-slate-500/5"
            : "border-border bg-background/45"
        }`}
      >
        <div className={`text-[10px] font-black ${item.id === "OPEN" ? "text-emerald-500" : "text-primary"}`}>
          {item.id}
        </div>
        <div className="mt-1 truncate text-xs font-bold">{item.title}</div>
        <div className="mt-2 text-[10px] text-muted-foreground">{item.time}</div>
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/75 p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
