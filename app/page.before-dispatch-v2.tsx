import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
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

const navSections = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Dispatch", icon: Truck, active: true },
      { label: "Work Orders", icon: ClipboardList },
      { label: "Customers", icon: Building2 },
    ],
  },
  {
    label: "Team & Assets",
    items: [
      { label: "Field Team", icon: Users },
      { label: "Assets", icon: Boxes },
      { label: "Inventory", icon: Package },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Billing", icon: ReceiptText },
      { label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", icon: Settings }],
  },
];

const kpis = [
  { label: "Unassigned", value: "8", detail: "Needs dispatch", icon: ClipboardList },
  { label: "Today’s Jobs", value: "17", detail: "Across 6 field staff", icon: Truck },
  { label: "On Site", value: "4", detail: "Work in progress", icon: Wrench },
  { label: "Billing Ready", value: "6", detail: "$4,860 ready", icon: CircleDollarSign },
];

const workQueue = [
  {
    number: "WO-001041",
    title: "Network outage",
    customer: "Summit Professional Centre",
    location: "Kamloops, BC",
    time: "ASAP",
    priority: "Emergency",
    priorityClass: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
  },
  {
    number: "WO-001044",
    title: "Replace damaged workstation",
    customer: "North Valley Accounting",
    location: "Kamloops, BC",
    time: "1:00 PM",
    priority: "High",
    priorityClass: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  },
  {
    number: "WO-001048",
    title: "New employee setup",
    customer: "Cedar Health Group",
    location: "Kamloops, BC",
    time: "2:30 PM",
    priority: "Normal",
    priorityClass: "bg-sky-500/10 text-sky-500 ring-sky-500/20",
  },
];

const team = [
  { initials: "AM", name: "Alex Morgan", status: "On site", detail: "WO-001037", dot: "bg-emerald-400" },
  { initials: "JS", name: "Jordan Singh", status: "Travelling", detail: "12 min away", dot: "bg-sky-400" },
  { initials: "NP", name: "Nina Patel", status: "Available", detail: "Kamloops", dot: "bg-emerald-400" },
  { initials: "DK", name: "Daniel Kim", status: "Working", detail: "WO-001039", dot: "bg-amber-400" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wrench className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight">FieldOps</div>
            <div className="text-xs text-muted-foreground">Service Operations</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-nav-label">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                          item.active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-user px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
              BA
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Development Admin</div>
              <div className="truncate text-xs text-muted-foreground">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:ml-72">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-border bg-topbar px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="font-bold">FieldOps</div>
          </div>

          <div className="hidden max-w-md flex-1 items-center sm:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                placeholder="Search work orders, customers, assets..."
                aria-label="Search"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:block">
              Preview data
            </div>
            <FieldOpsThemeToggle />
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-sidebar-hover hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-1 text-sm font-medium text-primary">Dispatch</div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Today’s dispatch</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Assign work, follow field progress, and move completed jobs into billing from one workspace.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-95 md:self-auto"
            >
              <Plus className="h-4 w-4" />
              New Work Order
            </button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{kpi.label}</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight">{kpi.value}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{kpi.detail}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
            <div className="rounded-2xl border border-border bg-card/80 shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-bold">Unassigned work</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Work orders waiting for dispatch</p>
                </div>
                <button type="button" className="text-sm font-semibold text-primary hover:underline">
                  View all
                </button>
              </div>

              <div className="divide-y divide-border">
                {workQueue.map((job) => (
                  <div key={job.number} className="p-5 transition hover:bg-row-hover sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-primary">{job.number}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${job.priorityClass}`}>
                            {job.priority}
                          </span>
                        </div>
                        <div className="mt-2 font-semibold">{job.title}</div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.customer}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {job.time}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">Field team</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Current availability</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">4 active</div>
                </div>
              </div>

              <div className="divide-y divide-border">
                {team.map((member) => (
                  <div key={member.name} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-avatar text-xs font-bold">
                      {member.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{member.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${member.dot}`} />
                        <span>{member.status}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs font-medium text-muted-foreground">{member.detail}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-3 text-xs text-success-text">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>2 field staff are available for new work.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
