"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Filter,
  Gauge,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Truck,
  UserRoundCheck,
  Users,
  Wrench,
  Zap,
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

const queue = [
  {
    id: "WO-001041",
    title: "Network outage",
    customer: "Summit Professional Centre",
    location: "Kamloops",
    window: "ASAP",
    duration: "2h",
    priority: "Emergency",
    priorityStyle: "bg-rose-500/10 text-rose-500 border-rose-500/25",
  },
  {
    id: "WO-001044",
    title: "Damaged workstation replacement",
    customer: "North Valley Accounting",
    location: "Kamloops",
    window: "1:00–3:00 PM",
    duration: "1.5h",
    priority: "High",
    priorityStyle: "bg-amber-500/10 text-amber-500 border-amber-500/25",
  },
  {
    id: "WO-001048",
    title: "New employee setup",
    customer: "Cedar Health Group",
    location: "Kamloops",
    window: "2:30 PM",
    duration: "1h",
    priority: "Normal",
    priorityStyle: "bg-sky-500/10 text-sky-500 border-sky-500/25",
  },
  {
    id: "WO-001053",
    title: "Access point replacement",
    customer: "Valleyview Dental",
    location: "Kamloops",
    window: "Today",
    duration: "2h",
    priority: "Normal",
    priorityStyle: "bg-sky-500/10 text-sky-500 border-sky-500/25",
  },
];

const technicians = [
  {
    initials: "AM",
    name: "Alex Morgan",
    skill: "Network & Infrastructure",
    status: "On site",
    statusColor: "bg-emerald-400",
    load: 72,
    current: "WO-001037 · Firewall service",
    next: "WO-001052 · 2:15 PM",
    area: "North Kamloops",
    eta: "Free ~2:00 PM",
  },
  {
    initials: "JS",
    name: "Jordan Singh",
    skill: "Desktop & End User",
    status: "Travelling",
    statusColor: "bg-sky-400",
    load: 58,
    current: "En route · WO-001043",
    next: "No next job",
    area: "Downtown",
    eta: "Free ~1:35 PM",
  },
  {
    initials: "NP",
    name: "Nina Patel",
    skill: "Desktop & Deployment",
    status: "Available",
    statusColor: "bg-emerald-400",
    load: 36,
    current: "No active work",
    next: "WO-001057 · 3:30 PM",
    area: "South Shore",
    eta: "Available now",
  },
  {
    initials: "DK",
    name: "Daniel Kim",
    skill: "Network & Security",
    status: "Working",
    statusColor: "bg-amber-400",
    load: 81,
    current: "WO-001039 · Switch replacement",
    next: "WO-001061 · 3:00 PM",
    area: "Aberdeen",
    eta: "Free ~2:40 PM",
  },
  {
    initials: "EL",
    name: "Ethan Lee",
    skill: "Projects & Install",
    status: "Available",
    statusColor: "bg-emerald-400",
    load: 42,
    current: "Staging equipment",
    next: "WO-001060 · 2:45 PM",
    area: "Valleyview",
    eta: "Available now",
  },
  {
    initials: "CR",
    name: "Chris Reed",
    skill: "Projects & Cabling",
    status: "On site",
    statusColor: "bg-violet-400",
    load: 67,
    current: "WO-001046 · Office deployment",
    next: "No next job",
    area: "Sahali",
    eta: "Free ~3:15 PM",
  },
];

const exceptions = [
  {
    title: "WO-001041 waiting for assignment",
    detail: "Emergency work order has been unassigned for 18 minutes.",
    icon: AlertTriangle,
    style: "text-rose-500 bg-rose-500/10",
  },
  {
    title: "Part approval needed",
    detail: "Daniel requested approval for a replacement switch.",
    icon: Package,
    style: "text-amber-500 bg-amber-500/10",
  },
  {
    title: "Nina is available now",
    detail: "No active work until 3:30 PM.",
    icon: UserRoundCheck,
    style: "text-emerald-500 bg-emerald-500/10",
  },
];

const activity = [
  { time: "12:28", text: "Alex arrived at WO-001037", dot: "bg-emerald-400" },
  { time: "12:22", text: "Jordan completed WO-001036", dot: "bg-sky-400" },
  { time: "12:19", text: "Daniel started WO-001039", dot: "bg-amber-400" },
  { time: "12:12", text: "Nina became available", dot: "bg-emerald-400" },
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

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3 xl:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wrench className="h-4 w-4" />
            </div>
            <span className="font-bold">FieldOps</span>
          </div>

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
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-6">
          <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">Dispatch</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Dispatch Command Center</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Match incoming work with the right field person based on availability, skills, location and workload.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Tue, Sep 8
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            </div>
          </section>

          <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={ClipboardList} label="Waiting to Dispatch" value="8" detail="1 emergency" />
            <Metric icon={Users} label="Field Staff Available" value="2" detail="6 active today" />
            <Metric icon={Clock3} label="Avg. Assignment Time" value="11m" detail="Today" />
            <Metric icon={CircleDollarSign} label="Billing Ready" value="$4.9K" detail="6 completed jobs" />
          </section>

          <section className="grid gap-5 2xl:grid-cols-[350px_minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div>
                  <h2 className="font-bold">Ready to dispatch</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Unassigned and priority work</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">4 shown</span>
              </div>

              <div className="space-y-3 p-3">
                {queue.map((job) => (
                  <button
                    key={job.id}
                    className="w-full rounded-xl border border-border bg-background/50 p-4 text-left transition hover:border-primary/35 hover:bg-primary/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs font-bold text-primary">{job.id}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${job.priorityStyle}`}>
                        {job.priority}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-semibold leading-5">{job.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{job.customer}</div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center justify-end gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {job.duration}
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg bg-muted px-2.5 py-2 text-xs font-medium">
                      Window: {job.window}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
                  <div>
                    <h2 className="font-bold">Field team availability</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Choose the best person for the next assignment
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Skills
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 p-3 md:grid-cols-2">
                  {technicians.map((tech) => (
                    <div key={tech.name} className="rounded-xl border border-border bg-background/45 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-bold">
                          {tech.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-bold">{tech.name}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className={`h-2 w-2 rounded-full ${tech.statusColor}`} />
                              {tech.status}
                            </div>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{tech.skill}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <Info label="Area" value={tech.area} />
                        <Info label="Availability" value={tech.eta} />
                      </div>

                      <div className="mt-3 rounded-lg bg-muted/70 p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Current
                        </div>
                        <div className="mt-1 truncate text-xs font-semibold">{tech.current}</div>

                        <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Next
                        </div>
                        <div className="mt-1 truncate text-xs">{tech.next}</div>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Day workload</span>
                          <span>{tech.load}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${tech.load}%` }} />
                        </div>
                      </div>

                      <button className="mt-4 w-full rounded-lg border border-primary/30 bg-primary/5 py-2 text-xs font-bold text-primary transition hover:bg-primary/10">
                        Assign work
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                  <div>
                    <h2 className="font-bold">Day plan</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Workload by part of day</p>
                  </div>
                  <Gauge className="h-5 w-5 text-primary" />
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-4">
                  <DayPart title="Morning" period="8–11" jobs="7 jobs" capacity={84} />
                  <DayPart title="Midday" period="11–1" jobs="5 jobs" capacity={61} />
                  <DayPart title="Afternoon" period="1–4" jobs="9 jobs" capacity={76} />
                  <DayPart title="Late day" period="4–6" jobs="4 jobs" capacity={43} />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-4 py-4">
                  <div>
                    <h2 className="font-bold">Needs attention</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Exceptions and opportunities</p>
                  </div>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>

                <div className="space-y-3 p-3">
                  {exceptions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-xl border border-border bg-background/45 p-3">
                        <div className="flex gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.style}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-5">{item.title}</div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.detail}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="border-b border-border px-4 py-4">
                  <h2 className="font-bold">Live activity</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Latest field updates</p>
                </div>

                <div className="p-4">
                  {activity.map((item, index) => (
                    <div key={`${item.time}-${item.text}`} className="relative flex gap-3 pb-5 last:pb-0">
                      {index !== activity.length - 1 && (
                        <div className="absolute left-[5px] top-4 h-[calc(100%-4px)] w-px bg-border" />
                      )}
                      <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{item.text}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold">
                <BriefcaseBusiness className="h-4 w-4 text-primary" />
                Open full dispatch workspace
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/75 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-[11px] font-semibold">{value}</div>
    </div>
  );
}

function DayPart({
  title,
  period,
  jobs,
  capacity,
}: {
  title: string;
  period: string;
  jobs: string;
  capacity: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/45 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold">{title}</div>
        <div className="text-[10px] text-muted-foreground">{period}</div>
      </div>
      <div className="mt-2 text-lg font-bold">{jobs}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${capacity}%` }} />
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">{capacity}% capacity</div>
    </div>
  );
}
