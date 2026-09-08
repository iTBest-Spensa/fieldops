"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
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
  X,
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

type ActivityStatus =
  | "complete"
  | "travelling"
  | "on_site"
  | "working"
  | "assigned"
  | "available"
  | "break";

type Segment = {
  start: number;
  end: number;
  id: string;
  title: string;
  time: string;
  status: ActivityStatus;
  labelSide: "top" | "bottom";
};

type ScheduleItem = {
  time: string;
  id: string;
  title: string;
  status: string;
};

type Technician = {
  initials: string;
  name: string;
  role: string;
  status: string;
  statusTone: string;
  confidence: Record<string, number>;
  track: Segment[];
  today: ScheduleItem[];
  week: Record<string, ScheduleItem[]>;
};

const technicians: Technician[] = [
  {
    initials: "AM",
    name: "Alex Morgan",
    role: "Network",
    status: "ON SITE",
    statusTone: "border-sky-500 bg-sky-500/10 text-sky-500",
    confidence: { "WO-001041": 96, "WO-001044": 64, "WO-001048": 70 },
    track: [
      { start: 8.5, end: 10, id: "WO-001032", title: "Firewall service", time: "8:30–10:00", status: "complete", labelSide: "top" },
      { start: 10.5, end: 13.75, id: "WO-001037", title: "Network outage", time: "10:30–1:45", status: "on_site", labelSide: "top" },
      { start: 13.75, end: 14.17, id: "BREAK", title: "Lunch", time: "1:45–2:10", status: "break", labelSide: "bottom" },
      { start: 14.25, end: 15.5, id: "WO-001052", title: "Wi-Fi survey", time: "2:15–3:30", status: "assigned", labelSide: "top" },
      { start: 15.5, end: 17, id: "OPEN", title: "Available", time: "3:30–5:00", status: "available", labelSide: "bottom" },
    ],
    today: [
      { time: "8:30–10:00", id: "WO-001032", title: "Firewall service", status: "COMPLETE" },
      { time: "10:30–1:45", id: "WO-001037", title: "Network outage", status: "ON SITE" },
      { time: "1:45–2:10", id: "BREAK", title: "Lunch", status: "BREAK" },
      { time: "2:15–3:30", id: "WO-001052", title: "Wi-Fi survey", status: "ASSIGNED" },
      { time: "3:30–5:00", id: "OPEN", title: "Available", status: "AVAILABLE" },
    ],
    week: {
      Mon: [{ time: "8:00–10:00", id: "WO-001020", title: "Network service", status: "COMPLETE" }],
      Tue: [
        { time: "8:30–10:00", id: "WO-001032", title: "Firewall service", status: "COMPLETE" },
        { time: "10:30–1:45", id: "WO-001037", title: "Network outage", status: "ON SITE" },
        { time: "1:45–2:10", id: "BREAK", title: "Lunch", status: "BREAK" },
        { time: "2:15–3:30", id: "WO-001052", title: "Wi-Fi survey", status: "ASSIGNED" },
      ],
      Wed: [{ time: "9:00–11:30", id: "WO-001064", title: "Network assessment", status: "ASSIGNED" }],
      Thu: [{ time: "1:00–3:00", id: "WO-001069", title: "Switch install", status: "ASSIGNED" }],
      Fri: [{ time: "8:30–12:00", id: "WO-001072", title: "Infrastructure maintenance", status: "ASSIGNED" }],
    },
  },
  {
    initials: "JS",
    name: "Jordan Singh",
    role: "Desktop",
    status: "TRAVELLING",
    statusTone: "border-cyan-500 bg-cyan-500/10 text-cyan-500",
    confidence: { "WO-001041": 58, "WO-001044": 93, "WO-001048": 84 },
    track: [
      { start: 9, end: 10.25, id: "WO-001036", title: "Server check", time: "9:00–10:15", status: "complete", labelSide: "top" },
      { start: 10.4, end: 11, id: "TRAVEL", title: "Travelling", time: "10:25–11:00", status: "travelling", labelSide: "bottom" },
      { start: 11, end: 13.5, id: "WO-001043", title: "Workstation issue", time: "11:00–1:30", status: "working", labelSide: "top" },
      { start: 13.5, end: 14, id: "BREAK", title: "Lunch", time: "1:30–2:00", status: "break", labelSide: "bottom" },
      { start: 14, end: 15, id: "OPEN", title: "Available", time: "2:00–3:00", status: "available", labelSide: "bottom" },
      { start: 15, end: 16.5, id: "WO-001059", title: "Desktop support", time: "3:00–4:30", status: "assigned", labelSide: "top" },
    ],
    today: [
      { time: "9:00–10:15", id: "WO-001036", title: "Server check", status: "COMPLETE" },
      { time: "10:25–11:00", id: "TRAVEL", title: "Travelling", status: "TRAVELLING" },
      { time: "11:00–1:30", id: "WO-001043", title: "Workstation issue", status: "WORKING" },
      { time: "1:30–2:00", id: "BREAK", title: "Lunch", status: "BREAK" },
      { time: "2:00–3:00", id: "OPEN", title: "Available", status: "AVAILABLE" },
      { time: "3:00–4:30", id: "WO-001059", title: "Desktop support", status: "ASSIGNED" },
    ],
    week: {
      Mon: [{ time: "8:30–11:00", id: "WO-001021", title: "Desktop deployment", status: "COMPLETE" }],
      Tue: [
        { time: "9:00–10:15", id: "WO-001036", title: "Server check", status: "COMPLETE" },
        { time: "11:00–1:30", id: "WO-001043", title: "Workstation issue", status: "WORKING" },
        { time: "3:00–4:30", id: "WO-001059", title: "Desktop support", status: "ASSIGNED" },
      ],
      Wed: [{ time: "10:00–12:00", id: "WO-001065", title: "User setup", status: "ASSIGNED" }],
      Thu: [{ time: "9:00–11:00", id: "WO-001068", title: "PC replacements", status: "ASSIGNED" }],
      Fri: [{ time: "1:00–3:30", id: "WO-001075", title: "Desktop service", status: "ASSIGNED" }],
    },
  },
  {
    initials: "NP",
    name: "Nina Patel",
    role: "Deployment",
    status: "AVAILABLE",
    statusTone: "border-slate-500 bg-slate-500/10 text-slate-500",
    confidence: { "WO-001041": 72, "WO-001044": 87, "WO-001048": 98 },
    track: [
      { start: 8, end: 9.75, id: "WO-001035", title: "Laptop setup", time: "8:00–9:45", status: "complete", labelSide: "top" },
      { start: 9.75, end: 12, id: "OPEN", title: "Available", time: "9:45–12:00", status: "available", labelSide: "bottom" },
      { start: 12, end: 12.5, id: "BREAK", title: "Lunch", time: "12:00–12:30", status: "break", labelSide: "bottom" },
      { start: 12.5, end: 15.25, id: "OPEN", title: "Available", time: "12:30–3:15", status: "available", labelSide: "bottom" },
      { start: 15.5, end: 16.5, id: "WO-001057", title: "User onboarding", time: "3:30–4:30", status: "assigned", labelSide: "top" },
    ],
    today: [
      { time: "8:00–9:45", id: "WO-001035", title: "Laptop setup", status: "COMPLETE" },
      { time: "9:45–12:00", id: "OPEN", title: "Available", status: "AVAILABLE" },
      { time: "12:00–12:30", id: "BREAK", title: "Lunch", status: "BREAK" },
      { time: "12:30–3:15", id: "OPEN", title: "Available", status: "AVAILABLE" },
      { time: "3:30–4:30", id: "WO-001057", title: "User onboarding", status: "ASSIGNED" },
    ],
    week: {
      Mon: [{ time: "9:00–12:00", id: "WO-001019", title: "New staff deployment", status: "COMPLETE" }],
      Tue: [
        { time: "8:00–9:45", id: "WO-001035", title: "Laptop setup", status: "COMPLETE" },
        { time: "3:30–4:30", id: "WO-001057", title: "User onboarding", status: "ASSIGNED" },
      ],
      Wed: [{ time: "8:30–11:30", id: "WO-001063", title: "Laptop rollout", status: "ASSIGNED" }],
      Thu: [{ time: "1:30–3:00", id: "WO-001070", title: "New user setup", status: "ASSIGNED" }],
      Fri: [{ time: "9:00–12:30", id: "WO-001073", title: "Deployment project", status: "ASSIGNED" }],
    },
  },
  {
    initials: "DK",
    name: "Daniel Kim",
    role: "Security",
    status: "WORKING",
    statusTone: "border-amber-500 bg-amber-500/10 text-amber-500",
    confidence: { "WO-001041": 91, "WO-001044": 60, "WO-001048": 54 },
    track: [
      { start: 8, end: 9, id: "WO-001030", title: "Router swap", time: "8:00–9:00", status: "complete", labelSide: "top" },
      { start: 9.5, end: 14.5, id: "WO-001039", title: "Switch replacement", time: "9:30–2:30", status: "working", labelSide: "top" },
      { start: 14.5, end: 15, id: "BREAK", title: "Lunch", time: "2:30–3:00", status: "break", labelSide: "bottom" },
      { start: 15, end: 16.5, id: "WO-001061", title: "Security review", time: "3:00–4:30", status: "assigned", labelSide: "top" },
    ],
    today: [
      { time: "8:00–9:00", id: "WO-001030", title: "Router swap", status: "COMPLETE" },
      { time: "9:30–2:30", id: "WO-001039", title: "Switch replacement", status: "WORKING" },
      { time: "2:30–3:00", id: "BREAK", title: "Lunch", status: "BREAK" },
      { time: "3:00–4:30", id: "WO-001061", title: "Security review", status: "ASSIGNED" },
    ],
    week: {
      Mon: [{ time: "8:00–11:30", id: "WO-001024", title: "Security remediation", status: "COMPLETE" }],
      Tue: [
        { time: "8:00–9:00", id: "WO-001030", title: "Router swap", status: "COMPLETE" },
        { time: "9:30–2:30", id: "WO-001039", title: "Switch replacement", status: "WORKING" },
        { time: "3:00–4:30", id: "WO-001061", title: "Security review", status: "ASSIGNED" },
      ],
      Wed: [{ time: "1:00–3:30", id: "WO-001066", title: "Firewall audit", status: "ASSIGNED" }],
      Thu: [{ time: "8:30–12:00", id: "WO-001071", title: "Security upgrade", status: "ASSIGNED" }],
      Fri: [{ time: "10:00–12:00", id: "WO-001076", title: "Access review", status: "ASSIGNED" }],
    },
  },
  {
    initials: "EL",
    name: "Ethan Lee",
    role: "Projects",
    status: "AVAILABLE",
    statusTone: "border-slate-500 bg-slate-500/10 text-slate-500",
    confidence: { "WO-001041": 69, "WO-001044": 78, "WO-001048": 76 },
    track: [
      { start: 8.5, end: 11, id: "WO-001028", title: "Office deployment", time: "8:30–11:00", status: "complete", labelSide: "top" },
      { start: 11, end: 12.5, id: "OPEN", title: "Available", time: "11:00–12:30", status: "available", labelSide: "bottom" },
      { start: 12.5, end: 13, id: "BREAK", title: "Lunch", time: "12:30–1:00", status: "break", labelSide: "bottom" },
      { start: 13, end: 14.75, id: "OPEN", title: "Available", time: "1:00–2:45", status: "available", labelSide: "bottom" },
      { start: 14.75, end: 16.5, id: "WO-001060", title: "Rack cleanup", time: "2:45–4:30", status: "assigned", labelSide: "top" },
    ],
    today: [
      { time: "8:30–11:00", id: "WO-001028", title: "Office deployment", status: "COMPLETE" },
      { time: "11:00–12:30", id: "OPEN", title: "Available", status: "AVAILABLE" },
      { time: "12:30–1:00", id: "BREAK", title: "Lunch", status: "BREAK" },
      { time: "1:00–2:45", id: "OPEN", title: "Available", status: "AVAILABLE" },
      { time: "2:45–4:30", id: "WO-001060", title: "Rack cleanup", status: "ASSIGNED" },
    ],
    week: {
      Mon: [{ time: "8:00–1:00", id: "WO-001018", title: "Office installation", status: "COMPLETE" }],
      Tue: [
        { time: "8:30–11:00", id: "WO-001028", title: "Office deployment", status: "COMPLETE" },
        { time: "2:45–4:30", id: "WO-001060", title: "Rack cleanup", status: "ASSIGNED" },
      ],
      Wed: [{ time: "8:00–12:00", id: "WO-001062", title: "Cabling project", status: "ASSIGNED" }],
      Thu: [{ time: "9:00–2:00", id: "WO-001067", title: "Boardroom upgrade", status: "ASSIGNED" }],
      Fri: [{ time: "8:30–1:30", id: "WO-001074", title: "Office build", status: "ASSIGNED" }],
    },
  },
];

const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];

const statusColors: Record<ActivityStatus, { line: string; text: string; label: string }> = {
  complete: { line: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Complete" },
  travelling: { line: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", label: "Travelling" },
  on_site: { line: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", label: "On Site" },
  working: { line: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Working" },
  assigned: { line: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", label: "Assigned" },
  available: { line: "bg-slate-400", text: "text-slate-500 dark:text-slate-300", label: "Available" },
  break: { line: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Break" },
};

export default function Home() {
  const [selectedJobId, setSelectedJobId] = useState(waitingJobs[0].id);
  const [selectedTechName, setSelectedTechName] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"today" | "week">("today");

  const selectedJob = waitingJobs.find((job) => job.id === selectedJobId) ?? waitingJobs[0];
  const selectedTech = technicians.find((tech) => tech.name === selectedTechName) ?? null;

  const rankedTechnicians = useMemo(
    () =>
      [...technicians].sort(
        (a, b) => (b.confidence[selectedJobId] ?? 0) - (a.confidence[selectedJobId] ?? 0)
      ),
    [selectedJobId]
  );

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedTechnicians.forEach((tech, index) => map.set(tech.name, index + 1));
    return map;
  }, [rankedTechnicians]);

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
                One clean daily line per technician. Line colors show activity status.
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

          <div className="grid gap-5 2xl:grid-cols-[300px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="border-b border-border px-4 py-4">
                <h2 className="font-bold">Waiting work</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Select one to compare dispatch fit</p>
              </div>

              <div className="divide-y divide-border">
                {waitingJobs.map((job) => {
                  const selected = job.id === selectedJobId;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full p-4 text-left transition ${selected ? "bg-primary/[0.07]" : "hover:bg-row-hover"}`}
                    >
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
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
                <div>
                  <h2 className="font-bold">Technician tracks</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Technician | Status | Daily Track
                  </p>
                </div>

                <div className="border border-primary/30 bg-primary/[0.06] px-3 py-2 rounded-none">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dispatch fit for</div>
                  <div className="mt-0.5 text-xs font-black text-primary">
                    {selectedJob.id} · {selectedJob.title}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1140px]">
                  <div className="grid grid-cols-[210px_120px_minmax(0,1fr)] border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="border-r border-border px-4 py-3">Technician</div>
                    <div className="border-r border-border px-3 py-3">Status</div>
                    <div className="px-3 py-3">Daily Track</div>
                  </div>

                  <div className="grid grid-cols-[210px_120px_minmax(0,1fr)] border-b border-border bg-background/30">
                    <div className="border-r border-border" />
                    <div className="border-r border-border" />
                    <div className="grid grid-cols-10">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="border-r border-border/50 px-1 py-2 text-center text-[10px] font-semibold text-muted-foreground last:border-r-0"
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>

                  {technicians.map((tech) => {
                    const confidence = tech.confidence[selectedJobId] ?? 0;
                    const rank = rankMap.get(tech.name) ?? 0;

                    return (
                      <div
                        key={tech.name}
                        className="grid grid-cols-[210px_120px_minmax(0,1fr)] border-b border-border last:border-b-0"
                      >
                        <button
                          onClick={() => {
                            setSelectedTechName(tech.name);
                            setScheduleView("today");
                          }}
                          className="flex items-start gap-3 border-r border-border p-3 text-left hover:bg-row-hover"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                            {tech.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{tech.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{tech.role}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[10px] font-black ${rank === 1 ? "text-primary" : "text-muted-foreground"}`}>
                                {confidence}% fit
                              </span>
                              {rank === 1 && (
                                <span className="border border-primary/30 px-1.5 py-0.5 text-[8px] font-black text-primary rounded-none">
                                  BEST
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                              View schedule
                              <ChevronRight className="h-3 w-3" />
                            </div>
                          </div>
                        </button>

                        <div className="flex items-start border-r border-border p-3">
                          <div className={`w-full border px-2 py-2 text-center text-[10px] font-black rounded-none ${tech.statusTone}`}>
                            {tech.status}
                          </div>
                        </div>

                        <SingleLineTimeline track={tech.track} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedTech && (
        <>
          <button
            aria-label="Close schedule"
            onClick={() => setSelectedTechName(null)}
            className="fixed inset-0 z-40 bg-black/35"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
              <div>
                <div className="text-xs font-semibold text-primary">Technician Schedule</div>
                <h2 className="mt-1 text-xl font-bold">{selectedTech.name}</h2>
                <div className="mt-1 text-sm text-muted-foreground">{selectedTech.role}</div>
              </div>
              <button
                onClick={() => setSelectedTechName(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-border px-5 py-4">
              <button
                onClick={() => setScheduleView("today")}
                className={`border px-4 py-2 text-sm font-bold rounded-none ${
                  scheduleView === "today"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setScheduleView("week")}
                className={`border px-4 py-2 text-sm font-bold rounded-none ${
                  scheduleView === "week"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                Week
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {scheduleView === "today" ? (
                <TodaySchedule items={selectedTech.today} />
              ) : (
                <WeekSchedule week={selectedTech.week} />
              )}
            </div>
          </aside>
        </>
      )}
    </main>
  );
}


function formatClock(hour: number) {
  const totalMinutes = Math.round(hour * 60);
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function durationLabel(start: number, end: number) {
  const minutes = Math.max(0, Math.round((end - start) * 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

type RenderTrackItem =
  | { type: "activity"; segment: Segment; originalIndex: number }
  | { type: "gap"; start: number; end: number; originalIndex: number };

function buildTrackItems(track: Segment[]): RenderTrackItem[] {
  const sorted = [...track].sort((a, b) => a.start - b.start);
  const items: RenderTrackItem[] = [];

  sorted.forEach((segment, index) => {
    if (index > 0) {
      const previous = sorted[index - 1];
      if (segment.start > previous.end) {
        items.push({
          type: "gap",
          start: previous.end,
          end: segment.start,
          originalIndex: index - 1,
        });
      }
    }

    items.push({
      type: "activity",
      segment,
      originalIndex: index,
    });
  });

  return items;
}

function TrackHint({
  title,
  id,
  status,
  start,
  end,
  detail,
}: {
  title: string;
  id: string;
  status: string;
  start: number;
  end: number;
  detail?: string;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 z-50 hidden w-60 -translate-x-1/2 border border-border bg-popover p-3 text-popover-foreground shadow-xl group-hover:block group-focus-within:block">
      <div className="text-[10px] font-black uppercase tracking-wider text-primary">{status}</div>
      <div className="mt-1 text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{id}</div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground">Start</div>
          <div className="mt-0.5 font-bold">{formatClock(start)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">End</div>
          <div className="mt-0.5 font-bold">{formatClock(end)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground">Duration</div>
          <div className="mt-0.5 font-bold">{durationLabel(start, end)}</div>
        </div>
      </div>

      {detail && (
        <div className="mt-3 border-t border-border pt-2 text-[10px] leading-4 text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}

function SingleLineTimeline({ track }: { track: Segment[] }) {
  const startHour = 8;
  const totalHours = 9;
  const nowHour = 13.25;
  const nowLeft = ((nowHour - startHour) / totalHours) * 100;
  const items = buildTrackItems(track);

  return (
    <div className="relative min-h-[118px] overflow-visible px-3 py-2">
      <div className="absolute inset-0 grid grid-cols-10 overflow-hidden">
        {hours.map((hour) => (
          <div key={hour} className="border-r border-border/30 last:border-r-0" />
        ))}
      </div>

      <div
        className="absolute bottom-2 top-2 z-20 w-px bg-rose-500/70"
        style={{ left: `${nowLeft}%` }}
      >
        <div className="absolute -top-1 -translate-x-1/2 bg-rose-500 px-1 py-0.5 text-[8px] font-black text-white">
          NOW
        </div>
      </div>

      <div className="relative h-[100px]">
        <div className="absolute left-0 right-0 top-[49px] h-px bg-border" />

        {items.map((item, index) => {
          if (item.type === "gap") {
            const left = ((item.start - startHour) / totalHours) * 100;
            const width = ((item.end - item.start) / totalHours) * 100;
            const tinyGap = (item.end - item.start) * 60 <= 10;

            return (
              <button
                key={`gap-${item.start}-${item.end}-${index}`}
                type="button"
                className="group absolute top-0 z-30 h-full cursor-help focus:outline-none"
                style={{
                  left: `${Math.max(0, left)}%`,
                  width: `${Math.max(width, 0.45)}%`,
                  minWidth: tinyGap ? "7px" : undefined,
                }}
                aria-label={`Unscheduled gap from ${formatClock(item.start)} to ${formatClock(item.end)}`}
              >
                <span className="absolute left-0 right-0 top-[47px] border-t-2 border-dashed border-slate-500/80" />
                <span className="absolute left-0 top-[43px] h-[12px] w-[12px] -translate-x-1/2 rounded-full border-2 border-background bg-slate-500" />
                <span className="absolute right-0 top-[43px] h-[12px] w-[12px] translate-x-1/2 rounded-full border-2 border-background bg-slate-500" />

                <span className="absolute left-1/2 top-[59px] -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase text-slate-500">
                  {durationLabel(item.start, item.end)} gap
                </span>

                <TrackHint
                  title="Unscheduled gap"
                  id="OPEN GAP"
                  status="Gap"
                  start={item.start}
                  end={item.end}
                  detail="No activity is scheduled in this interval."
                />
              </button>
            );
          }

          const segment = item.segment;
          const left = ((segment.start - startHour) / totalHours) * 100;
          const width = ((segment.end - segment.start) / totalHours) * 100;
          const colors = statusColors[segment.status];
          const topLabel = item.originalIndex % 2 === 0;

          const detail =
            segment.status === "available"
              ? "Technician is available for dispatch during this interval."
              : segment.status === "break"
              ? "Non-job time recorded on the technician schedule."
              : segment.status === "travelling"
              ? "Technician is travelling between assignments."
              : `Scheduled activity on this technician's daily track.`;

          return (
            <button
              key={`${segment.id}-${segment.time}-${index}`}
              type="button"
              className="group absolute top-0 z-30 h-full cursor-help text-left focus:outline-none"
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 1.5)}%`,
              }}
              aria-label={`${segment.id} ${segment.title}, ${segment.time}, ${colors.label}`}
            >
              <span className={`absolute left-0 right-0 top-[47px] h-[4px] ${colors.line}`} />

              <span
                className={`absolute left-0 top-[43px] h-[12px] w-[12px] -translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />
              <span
                className={`absolute right-0 top-[43px] h-[12px] w-[12px] translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />

              <span
                className={`absolute left-0 max-w-[170px] ${
                  topLabel ? "bottom-[57px]" : "top-[58px]"
                }`}
              >
                <span className={`block truncate text-[9px] font-black uppercase ${colors.text}`}>
                  {colors.label} · {segment.id}
                </span>
                <span className="block truncate text-[10px] font-semibold">{segment.title}</span>
                <span className="block whitespace-nowrap text-[9px] text-muted-foreground">{segment.time}</span>
              </span>

              <TrackHint
                title={segment.title}
                id={segment.id}
                status={colors.label}
                start={segment.start}
                end={segment.end}
                detail={detail}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TodaySchedule({ items }: { items: ScheduleItem[] }) {
  return (
    <div>
      <h3 className="font-bold">Tuesday, September 8</h3>
      <div className="mt-4 border-l-2 border-border pl-5">
        {items.map((item) => (
          <div key={`${item.time}-${item.id}`} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="text-xs font-bold text-muted-foreground">{item.time}</div>
            <div className="mt-1 text-xs font-black text-primary">{item.id}</div>
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="mt-0.5 text-[10px] font-bold text-muted-foreground">{item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekSchedule({ week }: { week: Record<string, ScheduleItem[]> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day} className="border border-border">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-black">{day}</div>
          <div className="divide-y divide-border">
            {(week[day] ?? []).map((item) => (
              <div key={`${day}-${item.time}-${item.id}`} className="grid grid-cols-[92px_1fr] gap-3 p-3">
                <div className="text-[11px] font-bold text-muted-foreground">{item.time}</div>
                <div>
                  <div className="text-xs font-black text-primary">{item.id}</div>
                  <div className="mt-1 text-xs font-semibold">{item.title}</div>
                  <div className="mt-0.5 text-[9px] font-bold text-muted-foreground">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
