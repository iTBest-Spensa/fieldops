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

type WaitingJob = {
  id: string;
  title: string;
  customer: string;
  place: string;
  time: string;
  priority: string;
  tone: string;
};

const waitingJobs: WaitingJob[] = [
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

type ScheduleItem = {
  time: string;
  id: string;
  title: string;
  status: string;
};

type Tech = {
  initials: string;
  name: string;
  role: string;
  status: string;
  statusTone: string;
  previous: { id: string; title: string; time: string };
  current: { id: string; title: string; time: string; tone: string };
  next: { id: string; title: string; time: string };
  confidence: Record<string, number>;
  today: ScheduleItem[];
  week: Record<string, ScheduleItem[]>;
};

const technicians: Tech[] = [
  {
    initials: "AM",
    name: "Alex Morgan",
    role: "Network",
    status: "ON SITE",
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001032", title: "Firewall service", time: "8:30–10:00" },
    current: { id: "WO-001037", title: "Network outage", time: "10:30–1:45", tone: "border-sky-500 bg-sky-500/10" },
    next: { id: "WO-001052", title: "Wi-Fi survey", time: "2:15–3:30" },
    confidence: { "WO-001041": 96, "WO-001044": 64, "WO-001048": 70 },
    today: [
      { time: "8:30–10:00", id: "WO-001032", title: "Firewall service", status: "COMPLETE" },
      { time: "10:30–1:45", id: "WO-001037", title: "Network outage", status: "WORKING" },
      { time: "1:45–2:15", id: "OPEN", title: "Available", status: "OPEN" },
      { time: "2:15–3:30", id: "WO-001052", title: "Wi-Fi survey", status: "ASSIGNED" },
      { time: "3:30–5:00", id: "OPEN", title: "Available", status: "OPEN" },
    ],
    week: {
      Mon: [
        { time: "8:00–10:00", id: "WO-001020", title: "Network service", status: "COMPLETE" },
        { time: "11:00–1:00", id: "WO-001025", title: "Firewall review", status: "COMPLETE" },
      ],
      Tue: [
        { time: "8:30–10:00", id: "WO-001032", title: "Firewall service", status: "COMPLETE" },
        { time: "10:30–1:45", id: "WO-001037", title: "Network outage", status: "WORKING" },
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
    statusTone: "border-sky-500 bg-sky-500/10 text-sky-500",
    previous: { id: "WO-001036", title: "Server check", time: "9:00–10:15" },
    current: { id: "WO-001043", title: "Workstation issue", time: "11:00–1:30", tone: "border-amber-500 bg-amber-500/10" },
    next: { id: "OPEN", title: "Available", time: "1:30–3:00" },
    confidence: { "WO-001041": 58, "WO-001044": 93, "WO-001048": 84 },
    today: [
      { time: "9:00–10:15", id: "WO-001036", title: "Server check", status: "COMPLETE" },
      { time: "11:00–1:30", id: "WO-001043", title: "Workstation issue", status: "TRAVELLING" },
      { time: "1:30–3:00", id: "OPEN", title: "Available", status: "OPEN" },
      { time: "3:00–4:30", id: "WO-001059", title: "Desktop support", status: "ASSIGNED" },
    ],
    week: {
      Mon: [{ time: "8:30–11:00", id: "WO-001021", title: "Desktop deployment", status: "COMPLETE" }],
      Tue: [
        { time: "9:00–10:15", id: "WO-001036", title: "Server check", status: "COMPLETE" },
        { time: "11:00–1:30", id: "WO-001043", title: "Workstation issue", status: "TRAVELLING" },
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
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001035", title: "Laptop setup", time: "8:00–9:45" },
    current: { id: "OPEN", title: "Available", time: "Now–3:15", tone: "border-dashed border-slate-400 bg-slate-500/5" },
    next: { id: "WO-001057", title: "User onboarding", time: "3:30–4:30" },
    confidence: { "WO-001041": 72, "WO-001044": 87, "WO-001048": 98 },
    today: [
      { time: "8:00–9:45", id: "WO-001035", title: "Laptop setup", status: "COMPLETE" },
      { time: "9:45–3:15", id: "OPEN", title: "Available", status: "OPEN" },
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
    previous: { id: "WO-001030", title: "Router swap", time: "8:00–9:00" },
    current: { id: "WO-001039", title: "Switch replacement", time: "9:30–2:30", tone: "border-amber-500 bg-amber-500/10" },
    next: { id: "WO-001061", title: "Security review", time: "3:00–4:30" },
    confidence: { "WO-001041": 91, "WO-001044": 60, "WO-001048": 54 },
    today: [
      { time: "8:00–9:00", id: "WO-001030", title: "Router swap", status: "COMPLETE" },
      { time: "9:30–2:30", id: "WO-001039", title: "Switch replacement", status: "WORKING" },
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
    statusTone: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    previous: { id: "WO-001028", title: "Office deployment", time: "8:30–11:00" },
    current: { id: "OPEN", title: "Available", time: "Now–2:45", tone: "border-dashed border-slate-400 bg-slate-500/5" },
    next: { id: "WO-001060", title: "Rack cleanup", time: "2:45–4:30" },
    confidence: { "WO-001041": 69, "WO-001044": 78, "WO-001048": 76 },
    today: [
      { time: "8:30–11:00", id: "WO-001028", title: "Office deployment", status: "COMPLETE" },
      { time: "11:00–2:45", id: "OPEN", title: "Available", status: "OPEN" },
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
                Select waiting work to compare dispatch fit, then open a technician to see the full day or week.
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Select one to rank technician fit
                </p>
              </div>

              <div className="divide-y divide-border">
                {waitingJobs.map((job) => {
                  const selected = job.id === selectedJobId;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full p-4 text-left transition ${
                        selected ? "bg-primary/[0.07]" : "hover:bg-row-hover"
                      }`}
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

                      {selected && (
                        <div className="mt-3 border-l-2 border-primary pl-2 text-[10px] font-semibold text-primary">
                          Ranking technicians for this work order
                        </div>
                      )}
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
                    Previous → Current → Next
                  </p>
                </div>

                <div className="border border-primary/30 bg-primary/[0.06] px-3 py-2 rounded-none">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Confidence for
                  </div>
                  <div className="mt-0.5 text-xs font-black text-primary">
                    {selectedJob.id} · {selectedJob.title}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1150px]">
                  <div className="grid grid-cols-[190px_112px_112px_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="border-r border-border px-4 py-3">Technician</div>
                    <div className="border-r border-border px-3 py-3">Status</div>
                    <div className="border-r border-border px-3 py-3">Confidence</div>
                    <div className="border-r border-border px-3 py-3">Previous</div>
                    <div className="border-r border-border px-3 py-3">Current</div>
                    <div className="px-3 py-3">Next</div>
                  </div>

                  {technicians.map((tech) => {
                    const confidence = tech.confidence[selectedJobId] ?? 0;
                    const rank = rankMap.get(tech.name) ?? 0;
                    return (
                      <div
                        key={tech.name}
                        className="grid grid-cols-[190px_112px_112px_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] border-b border-border last:border-b-0"
                      >
                        <button
                          onClick={() => {
                            setSelectedTechName(tech.name);
                            setScheduleView("today");
                          }}
                          className="flex items-center gap-3 border-r border-border p-4 text-left transition hover:bg-row-hover"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                            {tech.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{tech.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{tech.role}</div>
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                              View schedule
                              <ChevronRight className="h-3 w-3" />
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center border-r border-border p-3">
                          <div className={`w-full border px-2 py-2 text-center text-[10px] font-black rounded-none ${tech.statusTone}`}>
                            {tech.status}
                          </div>
                        </div>

                        <div className="flex items-center border-r border-border p-3">
                          <div
                            className={`w-full border px-2 py-2 text-center rounded-none ${
                              rank === 1
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background/45"
                            }`}
                          >
                            <div className={`text-lg font-black ${rank === 1 ? "text-primary" : ""}`}>
                              {confidence}%
                            </div>
                            <div className="mt-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                              {rank === 1 ? "Best match" : `Rank ${rank}`}
                            </div>
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

function TodaySchedule({ items }: { items: ScheduleItem[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold">Tuesday, September 8</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Complete day schedule</p>
        </div>
        <CalendarDays className="h-5 w-5 text-primary" />
      </div>

      <div className="border-l-2 border-border pl-5">
        {items.map((item, index) => (
          <div key={`${item.time}-${item.id}`} className="relative pb-5 last:pb-0">
            <span
              className={`absolute -left-[27px] top-2 h-3 w-3 border-2 border-background ${
                item.status === "OPEN" ? "bg-emerald-500" : "bg-primary"
              }`}
            />
            <div className="text-xs font-bold text-muted-foreground">{item.time}</div>
            <div
              className={`mt-2 border p-3 rounded-none ${
                item.status === "OPEN"
                  ? "border-dashed border-emerald-500/50 bg-emerald-500/[0.05]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-black ${item.id === "OPEN" ? "text-emerald-500" : "text-primary"}`}>
                  {item.id}
                </span>
                <span className="border border-border px-2 py-1 text-[9px] font-bold rounded-none">
                  {item.status}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold">{item.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekSchedule({ week }: { week: Record<string, ScheduleItem[]> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-bold">Week of September 7–11</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">All scheduled work for the week</p>
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day} className="border border-border bg-card/50">
            <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-black uppercase tracking-wider">
              {day}
            </div>

            <div className="divide-y divide-border">
              {(week[day] ?? []).length > 0 ? (
                week[day].map((item) => (
                  <div key={`${day}-${item.time}-${item.id}`} className="grid grid-cols-[92px_1fr] gap-3 p-3">
                    <div className="text-[11px] font-bold text-muted-foreground">{item.time}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary">{item.id}</span>
                        <span className="border border-border px-1.5 py-0.5 text-[8px] font-bold rounded-none">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold">{item.title}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-muted-foreground">No scheduled work</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
