"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
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
  Search,
  Settings,
  Sparkles,
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

const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];

const queue = [
  {
    id: "WO-001041",
    title: "Network outage",
    customer: "Summit Professional Centre",
    place: "North Kamloops",
    window: "ASAP",
    urgency: "Emergency",
    style: "border-rose-500/30 bg-rose-500/[0.06] text-rose-500",
  },
  {
    id: "WO-001044",
    title: "Replace damaged workstation",
    customer: "North Valley Accounting",
    place: "Downtown",
    window: "1:00–3:00 PM",
    urgency: "High",
    style: "border-amber-500/30 bg-amber-500/[0.06] text-amber-500",
  },
  {
    id: "WO-001048",
    title: "New employee setup",
    customer: "Cedar Health Group",
    place: "South Shore",
    window: "2:30 PM",
    urgency: "Normal",
    style: "border-sky-500/30 bg-sky-500/[0.06] text-sky-500",
  },
];

const lanes = [
  {
    initials: "AM",
    name: "Alex Morgan",
    specialty: "Network",
    availability: "Free ~2:10 PM",
    confidence: 94,
    status: "On Site",
    dot: "bg-emerald-400",
    segments: [
      { start: 0.2, width: 1.2, label: "WO-001032", title: "Firewall service", tone: "emerald", state: "Complete", progress: 100 },
      { start: 2.0, width: 2.0, label: "WO-001037", title: "Network outage", tone: "sky", state: "Working", progress: 68 },
      { start: 5.2, width: 1.4, label: "WO-001052", title: "Wi-Fi survey", tone: "violet", state: "Next", progress: 0 },
    ],
  },
  {
    initials: "JS",
    name: "Jordan Singh",
    specialty: "Desktop",
    availability: "Free ~1:35 PM",
    confidence: 87,
    status: "Travelling",
    dot: "bg-sky-400",
    segments: [
      { start: 0.7, width: 1.1, label: "WO-001036", title: "Server check", tone: "emerald", state: "Complete", progress: 100 },
      { start: 2.2, width: 1.7, label: "WO-001043", title: "Workstation issue", tone: "amber", state: "Travelling", progress: 22 },
      { start: 4.6, width: 1.5, label: "OPEN", title: "Available window", tone: "slate", state: "Gap", progress: 0 },
    ],
  },
  {
    initials: "NP",
    name: "Nina Patel",
    specialty: "Deployment",
    availability: "Available now",
    confidence: 98,
    status: "Available",
    dot: "bg-emerald-400",
    segments: [
      { start: 0.1, width: 1.5, label: "WO-001035", title: "Laptop setup", tone: "emerald", state: "Complete", progress: 100 },
      { start: 2.0, width: 2.2, label: "OPEN", title: "Available window", tone: "slate", state: "Available", progress: 0 },
      { start: 5.7, width: 1.3, label: "WO-001057", title: "User onboarding", tone: "violet", state: "Next", progress: 0 },
    ],
  },
  {
    initials: "DK",
    name: "Daniel Kim",
    specialty: "Security",
    availability: "Free ~2:40 PM",
    confidence: 91,
    status: "Working",
    dot: "bg-amber-400",
    segments: [
      { start: 0.0, width: 1.0, label: "WO-001030", title: "Router swap", tone: "emerald", state: "Complete", progress: 100 },
      { start: 1.4, width: 2.6, label: "WO-001039", title: "Switch replacement", tone: "amber", state: "Working", progress: 54 },
      { start: 5.1, width: 1.6, label: "WO-001061", title: "Security review", tone: "violet", state: "Next", progress: 0 },
    ],
  },
  {
    initials: "EL",
    name: "Ethan Lee",
    specialty: "Projects",
    availability: "Available now",
    confidence: 89,
    status: "Available",
    dot: "bg-emerald-400",
    segments: [
      { start: 0.4, width: 1.8, label: "WO-001028", title: "Office deployment", tone: "emerald", state: "Complete", progress: 100 },
      { start: 3.0, width: 1.6, label: "OPEN", title: "Project capacity", tone: "slate", state: "Available", progress: 0 },
      { start: 5.2, width: 2.0, label: "WO-001060", title: "Rack cleanup", tone: "sky", state: "Assigned", progress: 8 },
    ],
  },
];

const signals = [
  {
    icon: AlertTriangle,
    title: "Emergency work unassigned",
    detail: "WO-001041 has been waiting 18 min.",
    style: "bg-rose-500/10 text-rose-500",
  },
  {
    icon: UserRoundCheck,
    title: "Best match available",
    detail: "Nina is 98% match for WO-001048.",
    style: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: Package,
    title: "Part approval needed",
    detail: "WO-001039 requires replacement switch approval.",
    style: "bg-amber-500/10 text-amber-500",
  },
];

const toneMap: Record<string, string> = {
  emerald: "border-emerald-400/50 bg-emerald-400/10",
  sky: "border-sky-400/50 bg-sky-400/10",
  amber: "border-amber-400/50 bg-amber-400/10",
  violet: "border-violet-400/50 bg-violet-400/10",
  slate: "border-dashed border-slate-400/40 bg-slate-500/[0.05]",
};

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
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Live Dispatch Tracks</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Track field staff across the day, see current job progress, detect gaps, and place new work into the best available lane.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                Tue, Sep 8
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
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
            <Metric icon={ClipboardList} label="Waiting" value="8" detail="1 emergency" />
            <Metric icon={Truck} label="In Motion" value="3" detail="Travelling now" />
            <Metric icon={CheckCircle2} label="On Site / Working" value="4" detail="Active jobs" />
            <Metric icon={CircleDollarSign} label="Billing Ready" value="$4.9K" detail="6 jobs" />
          </section>

          <div className="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)_300px]">
            <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">Work waiting</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Drag or assign into a track</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">3</span>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {queue.map((job) => (
                  <button key={job.id} className="w-full rounded-xl border border-border bg-background/50 p-4 text-left transition hover:border-primary/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-primary">{job.id}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${job.style}`}>
                        {job.urgency}
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
                        {job.window}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
                <div>
                  <h2 className="font-bold">Technician tracks</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Each lane shows the person’s journey, not just appointments
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Complete
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-sky-400" /> Active
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-violet-400" /> Next
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1080px]">
                  <div className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-border bg-muted/25">
                    <div className="border-r border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Field person
                    </div>
                    <div className="grid grid-cols-10">
                      {hours.map((hour) => (
                        <div key={hour} className="border-r border-border/50 px-1 py-3 text-center text-[11px] font-medium text-muted-foreground last:border-r-0">
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>

                  {lanes.map((lane) => (
                    <div key={lane.name} className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-border last:border-b-0">
                      <div className="border-r border-border p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                            {lane.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{lane.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{lane.specialty}</div>
                            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                              <span className={`h-2 w-2 rounded-full ${lane.dot}`} />
                              <span>{lane.status}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">{lane.availability}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/[0.06] px-2.5 py-2">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Dispatch confidence
                          </span>
                          <span className="text-xs font-black text-primary">{lane.confidence}%</span>
                        </div>
                      </div>

                      <div
                        className="relative h-[118px]"
                        style={{
                          backgroundImage: "linear-gradient(to right, hsl(var(--border) / .5) 1px, transparent 1px)",
                          backgroundSize: "10% 100%",
                        }}
                      >
                        <div className="absolute left-[47%] top-0 bottom-0 z-10 w-px bg-rose-500/70">
                          <span className="absolute -top-[1px] -translate-x-1/2 rounded-b bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                            NOW
                          </span>
                        </div>

                        {lane.segments.map((segment, idx) => {
                          const left = (segment.start / 10) * 100;
                          const width = (segment.width / 10) * 100;
                          return (
                            <div
                              key={`${lane.name}-${segment.label}-${idx}`}
                              className={`absolute top-5 h-[78px] overflow-hidden rounded-xl border p-2.5 shadow-sm ${toneMap[segment.tone]}`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                minWidth: "92px",
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-[10px] font-black">{segment.label}</span>
                                <span className="shrink-0 rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-bold">
                                  {segment.state}
                                </span>
                              </div>
                              <div className="mt-1 truncate text-[11px] font-semibold">{segment.title}</div>

                              {segment.progress > 0 && segment.progress < 100 && (
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/70">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${segment.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-border bg-card/75 shadow-sm">
                <div className="border-b border-border px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Dispatch signals</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">What needs attention</p>
                    </div>
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                </div>

                <div className="space-y-3 p-3">
                  {signals.map((signal) => {
                    const Icon = signal.icon;
                    return (
                      <div key={signal.title} className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="flex gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${signal.style}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">{signal.title}</div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{signal.detail}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/75 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Track utilization</div>
                    <div className="mt-1 text-2xl font-black">67%</div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Gauge className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[67%] rounded-full bg-primary" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <div className="text-[10px] text-muted-foreground">Open gaps</div>
                    <div className="mt-1 text-sm font-bold">3</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <div className="text-[10px] text-muted-foreground">Overloaded</div>
                    <div className="mt-1 text-sm font-bold">1</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
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
          <div className="mt-1 text-2xl font-black">{value}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
