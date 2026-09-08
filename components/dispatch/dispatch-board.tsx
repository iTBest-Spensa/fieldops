"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Filter,
  Gauge,
  GripVertical,
  MapPin,
  PackageCheck,
  PanelRightClose,
  Route,
  Search,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  initialWorkOrders,
  teams,
  technicians,
  type Technician,
  type TechnicianStatus,
  type WorkOrder,
  type WorkOrderStatus,
} from "./dispatch-data";

const DAY_START = 8 * 60;
const DAY_END = 17 * 60;
const DAY_MINUTES = DAY_END - DAY_START;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function statusDot(status: TechnicianStatus) {
  if (status === "available") return "bg-emerald-500";
  if (status === "travelling") return "bg-sky-500";
  if (status === "on_site") return "bg-violet-500";
  if (status === "working") return "bg-amber-500";
  return "bg-slate-400";
}

function jobTone(status: WorkOrderStatus) {
  if (status === "travelling") {
    return "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/45";
  }
  if (status === "on_site") {
    return "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/45";
  }
  if (status === "working") {
    return "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/45";
  }
  if (status === "waiting") {
    return "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/45";
  }
  if (status === "billing_ready") {
    return "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/45";
  }
  return "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900";
}

function priorityRail(priority: WorkOrder["priority"]) {
  if (priority === "emergency") return "bg-rose-500";
  if (priority === "high") return "bg-amber-500";
  return "bg-emerald-500";
}

function statusLabel(status: WorkOrderStatus) {
  return status.replaceAll("_", " ");
}

function formatClock(relativeMinutes: number) {
  const absolute = DAY_START + relativeMinutes;
  let hour = Math.floor(absolute / 60);
  const minute = absolute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  if (hour > 12) hour -= 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function pct(relativeMinutes: number) {
  return Math.max(0, Math.min(100, (relativeMinutes / DAY_MINUTES) * 100));
}

function technicianFit(technician: Technician, workOrder: WorkOrder) {
  const hasSkill = technician.skills.some(
    (skill) => skill.toLowerCase() === workOrder.requiredSkill.toLowerCase(),
  );
  const availability = technician.freeHours >= (workOrder.endMinutes - workOrder.startMinutes) / 60;
  const active = technician.status !== "off";
  const score = (hasSkill ? 55 : 12) + (availability ? 30 : 8) + (active ? 15 : 0);
  return { technician, hasSkill, availability, score };
}

export function DispatchBoard() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [selectedId, setSelectedId] = useState<string | null>("wo-1041");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  const selected = workOrders.find((workOrder) => workOrder.id === selectedId) ?? null;
  const unassigned = workOrders.filter((workOrder) => workOrder.technicianId === null);
  const activeCount = technicians.filter((technician) => technician.status !== "off").length;
  const availableCount = technicians.filter((technician) => technician.status === "available").length;
  const openCapacity = technicians.reduce((sum, technician) => sum + technician.freeHours, 0);

  const bestFits = useMemo(() => {
    if (!selected) return [];
    return technicians
      .map((technician) => technicianFit(technician, selected))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [selected]);

  const visibleTeams = teams.filter((team) => teamFilter === "all" || team === teamFilter);

  const filteredWorkOrders = (technicianId: string) => {
    const needle = query.trim().toLowerCase();
    return workOrders.filter((workOrder) => {
      if (workOrder.technicianId !== technicianId) return false;
      if (!needle) return true;
      return [workOrder.number, workOrder.title, workOrder.customer, workOrder.location]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  };

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function assignToTechnician(workOrderId: string, technicianId: string) {
    const technician = technicians.find((person) => person.id === technicianId);
    const workOrder = workOrders.find((item) => item.id === workOrderId);
    if (!technician || !workOrder) return;

    setWorkOrders((current) =>
      current.map((item) =>
        item.id === workOrderId ? { ...item, technicianId } : item,
      ),
    );
    setSelectedId(workOrderId);
    showToast(`${workOrder.number} assigned to ${technician.name}`);
  }

  function unassign(workOrderId: string) {
    const workOrder = workOrders.find((item) => item.id === workOrderId);
    if (!workOrder) return;
    setWorkOrders((current) =>
      current.map((item) =>
        item.id === workOrderId ? { ...item, technicianId: null } : item,
      ),
    );
    showToast(`${workOrder.number} moved back to the work queue`);
  }

  return (
    <div className="relative min-h-[calc(100vh-108px)] bg-[#f4f7fa] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[1900px] px-5 py-5 lg:px-7">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Live operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Dispatch</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Balance field capacity, move work between people, and spot problems before the day slips.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
              <CalendarDays size={16} /> Today
            </button>
            <button aria-label="Previous day" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
              <ChevronLeft size={17} />
            </button>
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Tue, Sep 8, 2026
            </div>
            <button aria-label="Next day" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<BriefcaseBusiness size={18} />} label="Unassigned" value={String(unassigned.length)} note="Ready for dispatch" />
          <MetricCard icon={<UserRound size={18} />} label="Field team active" value={String(activeCount)} note={`${availableCount} available now`} />
          <MetricCard icon={<Gauge size={18} />} label="Open capacity" value={`${openCapacity.toFixed(1)}h`} note="Across today's shifts" />
          <MetricCard icon={<AlertTriangle size={18} />} label="Needs attention" value="2" note="1 emergency · 1 stock risk" />
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[250px] flex-1 lg:w-[340px] lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search work orders, customers..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <select
                  value={teamFilter}
                  onChange={(event) => setTeamFilter(event.target.value)}
                  className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium outline-none dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="all">All teams</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <LegendDot className="bg-sky-500" label="Travelling" />
              <LegendDot className="bg-violet-500" label="On site" />
              <LegendDot className="bg-emerald-500" label="Working" />
              <LegendDot className="bg-amber-500" label="Waiting" />
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/45">
            <button
              type="button"
              onClick={() => setQueueOpen((open) => !open)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-rose-50 px-2 text-xs font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">{unassigned.length}</span>
                <div>
                  <p className="text-sm font-bold">Work queue</p>
                  <p className="text-xs text-slate-500">Drag a card onto a field team member to assign it.</p>
                </div>
              </div>
              {queueOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {queueOpen && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-4">
                {unassigned.length ? unassigned.map((workOrder) => (
                  <button
                    key={workOrder.id}
                    draggable
                    onDragStart={() => setDraggedId(workOrder.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => setSelectedId(workOrder.id)}
                    className="group relative min-w-[270px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
                  >
                    <div className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${priorityRail(workOrder.priority)}`} />
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{workOrder.number}</p>
                        <p className="mt-1 text-sm font-bold">{workOrder.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{workOrder.customer}</p>
                      </div>
                      <GripVertical size={16} className="mt-1 text-slate-300 transition group-hover:text-slate-500" />
                    </div>
                  </button>
                )) : (
                  <div className="flex h-16 items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 size={17} className="text-emerald-500" /> Everything is assigned.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1180px]">
              <div className="grid grid-cols-[250px_minmax(900px,1fr)] border-b border-slate-200 dark:border-slate-800">
                <div className="flex h-14 items-center border-r border-slate-200 px-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800">
                  Field team
                </div>
                <div className="relative h-14">
                  {HOURS.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-y-0 border-l border-slate-200 dark:border-slate-800"
                      style={{ left: `${(index / (HOURS.length - 1)) * 100}%` }}
                    >
                      <span className="absolute left-2 top-3 whitespace-nowrap text-xs font-medium text-slate-400">
                        {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "PM" : "AM"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {visibleTeams.map((team) => {
                const people = technicians.filter((technician) => technician.team === team);
                return (
                  <div key={team}>
                    <div className="grid grid-cols-[250px_minmax(900px,1fr)] border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/55">
                      <div className="border-r border-slate-200 px-4 py-2 dark:border-slate-800">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">{team}</p>
                      </div>
                      <div className="flex items-center px-3 text-[11px] text-slate-400">
                        {people.length} field staff · {people.reduce((sum, technician) => sum + technician.freeHours, 0).toFixed(1)}h open capacity
                      </div>
                    </div>

                    {people.map((technician) => (
                      <div
                        key={technician.id}
                        className="grid grid-cols-[250px_minmax(900px,1fr)] border-b border-slate-200 last:border-b-0 dark:border-slate-800"
                      >
                        <button
                          type="button"
                          className="flex h-[86px] items-center gap-3 border-r border-slate-200 px-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {technician.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold">{technician.name}</p>
                              <span className={`h-2 w-2 rounded-full ${statusDot(technician.status)}`} />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{technician.statusLabel} · {technician.shiftLabel}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${technician.utilization}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400">{technician.utilization}%</span>
                            </div>
                          </div>
                        </button>

                        <div
                          className="relative h-[86px] bg-white transition dark:bg-slate-900"
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (draggedId) assignToTechnician(draggedId, technician.id);
                            setDraggedId(null);
                          }}
                        >
                          {HOURS.map((hour, index) => (
                            <div
                              key={hour}
                              className="pointer-events-none absolute inset-y-0 border-l border-slate-100 dark:border-slate-800/70"
                              style={{ left: `${(index / (HOURS.length - 1)) * 100}%` }}
                            />
                          ))}

                          {filteredWorkOrders(technician.id).map((workOrder) => {
                            const left = pct(workOrder.startMinutes);
                            const width = Math.max(5.5, pct(workOrder.endMinutes) - left);
                            const isSelected = selectedId === workOrder.id;
                            return (
                              <button
                                key={workOrder.id}
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  setDraggedId(workOrder.id);
                                  event.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => setDraggedId(null)}
                                onClick={() => setSelectedId(workOrder.id)}
                                className={`group absolute top-3 h-[61px] overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:z-20 hover:-translate-y-0.5 hover:shadow-md ${jobTone(workOrder.status)} ${isSelected ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900" : ""}`}
                                style={{ left: `calc(${left}% + 4px)`, width: `calc(${width}% - 8px)` }}
                                title={`${workOrder.number} · ${workOrder.title}`}
                              >
                                <div className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${priorityRail(workOrder.priority)}`} />
                                <div className="flex min-w-0 items-start gap-2 pl-1">
                                  <GripVertical size={13} className="mt-0.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{workOrder.number}</span>
                                      {workOrder.priority !== "normal" && (
                                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${workOrder.priority === "emergency" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                                          {workOrder.priority}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs font-bold">{workOrder.title}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{workOrder.customer}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {selected && (
        <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-[410px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">{selected.number}</span>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${selected.priority === "emergency" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : selected.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {selected.priority}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                aria-label="Close work inspector"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Work inspector</p>
              <div className="mt-4 space-y-3 text-sm">
                <InfoRow icon={<BriefcaseBusiness size={16} />} label="Customer" value={selected.customer} />
                <InfoRow icon={<MapPin size={16} />} label="Location" value={selected.location} />
                <InfoRow icon={<Clock3 size={16} />} label="Window" value={`${formatClock(selected.startMinutes)} – ${formatClock(selected.endMinutes)}`} />
                <InfoRow icon={<Wrench size={16} />} label="Type" value={selected.jobType} />
                <InfoRow icon={<Route size={16} />} label="Travel" value={selected.travelMinutes ? `${selected.travelMinutes} min` : "Not set"} />
                <InfoRow icon={<PackageCheck size={16} />} label="Stock" value={selected.inventoryNote ?? "No inventory note"} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Assignment</p>
                  <p className="mt-1 text-xs text-slate-500">Current field owner for this work.</p>
                </div>
                <PanelRightClose size={17} className="text-slate-400" />
              </div>
              <div className="mt-4">
                {selected.technicianId ? (
                  (() => {
                    const technician = technicians.find((person) => person.id === selected.technicianId);
                    if (!technician) return null;
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xs font-bold shadow-sm dark:bg-slate-800">{technician.initials}</div>
                          <div>
                            <p className="text-sm font-bold">{technician.name}</p>
                            <p className="text-xs text-slate-500">{technician.statusLabel}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => unassign(selected.id)} className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400">Unassign</button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">
                    This work order is still in the queue.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/65 p-4 dark:border-emerald-900 dark:bg-emerald-950/25">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white"><Sparkles size={17} /></div>
                <div>
                  <p className="text-sm font-bold">Best fit</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    FieldOps ranks the current team using skill match, available capacity, and shift status. This preview does not auto-dispatch anybody.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {bestFits.map((fit, index) => (
                  <button
                    key={fit.technician.id}
                    type="button"
                    onClick={() => assignToTechnician(selected.id, fit.technician.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3 text-left transition hover:border-emerald-400 dark:border-emerald-900 dark:bg-slate-900 dark:hover:border-emerald-700"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{fit.technician.initials}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">{fit.technician.name}</p>
                          {index === 0 && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Top</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {fit.hasSkill ? `${selected.requiredSkill} ✓` : `${selected.requiredSkill} gap`} · {fit.technician.freeHours.toFixed(1)}h open
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{fit.score}%</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-11 rounded-xl border border-slate-200 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">Open work order</button>
              <button type="button" className="h-11 rounded-xl bg-emerald-500 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">Message field staff</button>
            </div>
          </div>
        </aside>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl dark:bg-white dark:text-slate-950">
          <CheckCircle2 size={17} className="text-emerald-500" /> {toast}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">{icon}</div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} /> {label}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[24px_84px_1fr] items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
