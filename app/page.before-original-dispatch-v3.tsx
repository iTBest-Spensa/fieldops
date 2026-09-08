"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Filter,
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
  Users,
  Wrench,
  CheckCircle2,
  Clock3,
  MessageSquareText,
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

type Job = {
  id: string;
  title: string;
  customer: string;
  start: number;
  duration: number;
  tone: "green" | "blue" | "amber" | "rose" | "violet" | "slate";
  badge?: string;
  note?: string;
};

type Tech = {
  initials: string;
  name: string;
  status: string;
  statusTone: string;
  jobs: Job[];
};

type Team = {
  name: string;
  count: number;
  technicians: Tech[];
};

const teams: Team[] = [
  {
    name: "Field Service",
    count: 5,
    technicians: [
      {
        initials: "AM",
        name: "Alex Morgan",
        status: "On clock · 4h 18m",
        statusTone: "bg-emerald-400",
        jobs: [
          { id: "WO-1041", title: "Network outage", customer: "Summit Centre", start: 0.55, duration: 1.15, tone: "rose", badge: "URGENT" },
          { id: "WO-1050", title: "Wi-Fi survey", customer: "Pine Ridge", start: 3.15, duration: 1.55, tone: "green", badge: "SERVICE" },
          { id: "WO-1062", title: "Printer issue", customer: "Cedar Health", start: 6.15, duration: 1.15, tone: "blue" },
        ],
      },
      {
        initials: "JS",
        name: "Jordan Singh",
        status: "On clock · 4h 10m",
        statusTone: "bg-sky-400",
        jobs: [
          { id: "WO-1036", title: "Server check", customer: "North Valley", start: 0.15, duration: 0.75, tone: "slate", badge: "DONE" },
          { id: "WO-1044", title: "Workstation replacement", customer: "Askwell", start: 1.0, duration: 2.0, tone: "green", badge: "PARTS" },
          { id: "WO-1058", title: "Access point install", customer: "RCMP Site", start: 4.9, duration: 2.1, tone: "blue", badge: "PO SENT" },
        ],
      },
      {
        initials: "NP",
        name: "Nina Patel",
        status: "Available",
        statusTone: "bg-emerald-400",
        jobs: [
          { id: "WO-1048", title: "New employee setup", customer: "Cedar Health", start: 0.65, duration: 1.0, tone: "green" },
          { id: "WO-1052", title: "Service standby", customer: "Internal", start: 2.0, duration: 1.35, tone: "slate" },
          { id: "WO-1060", title: "Switch replacement", customer: "Summit Centre", start: 4.15, duration: 1.5, tone: "amber", badge: "WAITING" },
        ],
      },
      {
        initials: "DK",
        name: "Daniel Kim",
        status: "On site",
        statusTone: "bg-amber-400",
        jobs: [
          { id: "WO-1039", title: "Firewall service", customer: "Copper Ridge", start: 0.7, duration: 1.7, tone: "green", badge: "ON SITE" },
          { id: "WO-1055", title: "Camera issue", customer: "Aberdeen", start: 3.55, duration: 1.25, tone: "rose", badge: "CALLBACK" },
          { id: "WO-1063", title: "Laptop delivery", customer: "Urban Systems", start: 6.0, duration: 1.65, tone: "violet" },
        ],
      },
      {
        initials: "MR",
        name: "Maya Roberts",
        status: "Off until 12:30 PM",
        statusTone: "bg-slate-400",
        jobs: [
          { id: "OFF", title: "Off shift", customer: "", start: 0, duration: 4.5, tone: "slate", note: "Available after 12:30 PM" },
          { id: "WO-1067", title: "Site assessment", customer: "Westview", start: 5.0, duration: 2.0, tone: "blue" },
        ],
      },
    ],
  },
  {
    name: "Projects & Installations",
    count: 4,
    technicians: [
      {
        initials: "EL",
        name: "Ethan Lee",
        status: "On clock · 4h 02m",
        statusTone: "bg-emerald-400",
        jobs: [
          { id: "WO-1027", title: "Office deployment", customer: "Rivershore", start: 0.5, duration: 2.3, tone: "green", badge: "INSTALL" },
          { id: "WO-1051", title: "Rack cleanup", customer: "Canyon Dental", start: 4.0, duration: 2.35, tone: "green", badge: "PROJECT" },
        ],
      },
      {
        initials: "SB",
        name: "Sam Brooks",
        status: "On clock · 4h 06m",
        statusTone: "bg-emerald-400",
        jobs: [
          { id: "WO-1032", title: "Laptop rollout", customer: "Sun Rivers", start: 1.0, duration: 1.55, tone: "blue" },
          { id: "WO-1053", title: "Boardroom upgrade", customer: "Dallas Office", start: 3.0, duration: 3.0, tone: "green", badge: "PO PENDING" },
        ],
      },
      {
        initials: "CR",
        name: "Chris Reed",
        status: "Travelling",
        statusTone: "bg-sky-400",
        jobs: [
          { id: "WO-1040", title: "AP installation", customer: "Aberdeen", start: 0.7, duration: 1.45, tone: "rose", badge: "TRAVEL" },
          { id: "WO-1056", title: "Cabling project", customer: "Valleyview", start: 2.85, duration: 3.2, tone: "green", badge: "INSTALL" },
        ],
      },
      {
        initials: "RJ",
        name: "Riley Jones",
        status: "Available",
        statusTone: "bg-emerald-400",
        jobs: [
          { id: "WO-1045", title: "Service assist", customer: "Urban Systems", start: 1.15, duration: 1.4, tone: "blue" },
          { id: "WO-1061", title: "Hardware staging", customer: "Internal", start: 4.55, duration: 1.7, tone: "amber", badge: "STAGING" },
        ],
      },
    ],
  },
];

const activity = [
  { who: "Alex Morgan", action: "arrived at", job: "WO-1041", time: "12:28 PM", tone: "bg-emerald-400" },
  { who: "Jordan Singh", action: "completed", job: "WO-1036", time: "12:22 PM", tone: "bg-blue-400" },
  { who: "Daniel Kim", action: "started work on", job: "WO-1039", time: "12:19 PM", tone: "bg-amber-400" },
  { who: "Nina Patel", action: "was assigned to", job: "WO-1048", time: "12:12 PM", tone: "bg-violet-400" },
  { who: "Ethan Lee", action: "added material to", job: "WO-1027", time: "11:58 AM", tone: "bg-sky-400" },
];

const messages = [
  { from: "Daniel Kim", text: "Need approval for replacement switch at Summit Centre.", time: "12:03 PM" },
  { from: "Chris Reed", text: "Traffic delay. ETA changed by about 15 minutes.", time: "11:49 AM" },
  { from: "Nina Patel", text: "WO-1048 equipment is ready for pickup.", time: "11:31 AM" },
];

const toneClass: Record<Job["tone"], string> = {
  green: "border-emerald-400/70 bg-emerald-400/20 text-foreground",
  blue: "border-sky-400/70 bg-sky-400/20 text-foreground",
  amber: "border-amber-400/70 bg-amber-400/20 text-foreground",
  rose: "border-rose-400/70 bg-rose-400/20 text-foreground",
  violet: "border-violet-400/70 bg-violet-400/20 text-foreground",
  slate: "border-slate-400/50 bg-slate-500/20 text-foreground",
};

const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"];

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

        <div className="border-t border-border p-3">
          <div className="rounded-xl bg-sidebar-user p-3">
            <div className="text-sm font-semibold">Development Admin</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Administrator</div>
          </div>
        </div>
      </aside>

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-5">
          <div className="flex items-center gap-3 xl:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wrench className="h-4 w-4" />
            </div>
            <span className="font-bold">FieldOps</span>
          </div>

          <div className="mx-auto hidden w-full max-w-xl md:block">
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

        <div className="grid min-h-[calc(100vh-72px)] 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 border-r border-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/55 px-4 py-3">
              <button className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-sidebar-hover">
                Today
              </button>

              <button className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-sidebar-hover">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Tue, Sep 8, 2026
              </button>

              <button className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
                <ChevronRight className="h-5 w-5" />
              </button>

              <button className="ml-1 flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-sidebar-hover">
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  New Work Order
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1180px]">
                <div className="sticky top-[72px] z-20 grid grid-cols-[210px_minmax(0,1fr)] border-b border-border bg-card">
                  <div className="border-r border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Field Team
                  </div>
                  <div className="relative grid grid-cols-9">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="border-r border-border/60 px-2 py-3 text-center text-xs font-medium text-muted-foreground last:border-r-0"
                      >
                        {hour}
                      </div>
                    ))}
                    <div className="pointer-events-none absolute bottom-0 left-[55.55%] top-0 w-px bg-rose-500/80">
                      <div className="absolute -top-1 -translate-x-1/2 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        NOW
                      </div>
                    </div>
                  </div>
                </div>

                {teams.map((team) => (
                  <div key={team.name}>
                    <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/50 px-4">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-bold">{team.name}</span>
                      <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {team.count}
                      </span>
                    </div>

                    {team.technicians.map((tech) => (
                      <div key={tech.name} className="grid grid-cols-[210px_minmax(0,1fr)] border-b border-border bg-card/35 hover:bg-row-hover">
                        <div className="flex h-[76px] items-center gap-3 border-r border-border px-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-bold">
                            {tech.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{tech.name}</div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className={`h-2 w-2 rounded-full ${tech.statusTone}`} />
                              <span className="truncate">{tech.status}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="relative h-[76px]"
                          style={{
                            backgroundImage:
                              "linear-gradient(to right, hsl(var(--border) / .55) 1px, transparent 1px)",
                            backgroundSize: "11.111% 100%",
                          }}
                        >
                          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/25" />

                          {tech.jobs.map((job) => {
                            const left = (job.start / 9) * 100;
                            const width = (job.duration / 9) * 100;
                            return (
                              <button
                                key={`${tech.name}-${job.id}`}
                                className={`absolute top-2 h-[58px] overflow-hidden rounded-lg border px-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClass[job.tone]}`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  minWidth: "86px",
                                }}
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  {job.badge && (
                                    <span className="shrink-0 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-black tracking-wide">
                                      {job.badge}
                                    </span>
                                  )}
                                  <span className="truncate text-[11px] font-bold">{job.id}</span>
                                </div>
                                <div className="mt-1 truncate text-xs font-semibold">{job.title}</div>
                                {job.customer && (
                                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{job.customer}</div>
                                )}
                                {job.note && (
                                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{job.note}</div>
                                )}
                              </button>
                            );
                          })}

                          <div className="pointer-events-none absolute bottom-0 left-[55.55%] top-0 w-px bg-rose-500/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden bg-card/60 2xl:block">
            <div className="sticky top-[72px]">
              <div className="flex h-[58px] items-center justify-between border-b border-border px-5">
                <h2 className="font-bold">Activity Center</h2>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-hover hover:text-foreground">
                  <Settings className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-border">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4" />
                    <h3 className="text-sm font-bold">Notifications</h3>
                  </div>
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mx-5 mb-4 grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-semibold">
                  <button className="rounded-md bg-card py-1.5 shadow-sm">All</button>
                  <button className="py-1.5 text-muted-foreground">Unread</button>
                </div>

                <div className="max-h-[345px] overflow-y-auto px-5 pb-3">
                  {activity.map((item) => (
                    <div key={`${item.who}-${item.time}`} className="relative border-b border-border py-3 pr-4 last:border-0">
                      <div className={`absolute right-0 top-5 h-2.5 w-2.5 rounded-full ${item.tone}`} />
                      <div className="text-sm leading-5">
                        <span className="font-semibold">{item.who}</span>{" "}
                        <span className="text-muted-foreground">{item.action}</span>{" "}
                        <span className="font-semibold text-primary">{item.job}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4" />
                    <h3 className="text-sm font-bold">Messages</h3>
                  </div>
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="mx-5 mb-4 grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-semibold">
                  <button className="rounded-md bg-card py-1.5 shadow-sm">All</button>
                  <button className="py-1.5 text-muted-foreground">Unread</button>
                </div>

                <div className="px-5">
                  {messages.map((message) => (
                    <div key={`${message.from}-${message.time}`} className="border-b border-border py-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-avatar text-[10px] font-bold">
                          {message.from.split(" ").map((x) => x[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs">
                            <span className="font-semibold">{message.from}</span>
                            <span className="text-muted-foreground"> · {message.time}</span>
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {message.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
