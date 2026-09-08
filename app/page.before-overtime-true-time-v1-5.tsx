"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
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
import { createClient } from "@/lib/supabase/client";

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
  customer?: string;
  place?: string;
  priority?: string;
  description?: string;
  notes?: string;
  workOrderUuid?: string;
  assignmentId?: string;
};

type ScheduleItem = {
  time: string;
  id: string;
  title: string;
  status: string;
};

type WaitingJob = {
  uuid: string;
  id: string;
  title: string;
  description: string | null;
  customer: string;
  place: string;
  time: string;
  priority: string;
  tone: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedDurationMinutes: number;
  requiredSkills: string[];
  serviceArea: string | null;
};

type Technician = {
  uuid: string;
  initials: string;
  name: string;
  role: string;
  status: string;
  statusTone: string;
  confidenceByJob: Record<string, number>;
  confidence: number;
  rank: number;
  track: Segment[];
  today: ScheduleItem[];
  week: Record<string, ScheduleItem[]>;
};

type DragJobPayload = {
  kind: "waiting" | "assigned";
  jobUuid: string;
  sourceTechnicianUuid?: string;
  assignmentId?: string;
};

type AssignmentModal = {
  mode: "assign" | "move";
  job: WaitingJob;
  tech: Technician;
  sourceTechnicianUuid?: string;
  assignmentId?: string;
  startTime: string;
  endTime: string;
};

type DbWorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  requested_at: string;
  customer_id: string;
  site_id: string | null;
  job_type: string | null;
  estimated_duration_minutes: number | null;
  required_skills: string[] | null;
  service_area: string | null;
};

type DbAssignment = {
  id: string;
  work_order_id: string;
  technician_id: string;
  assignment_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
};

type DbRole = {
  user_id: string;
  role: string;
};

type DbCustomer = {
  id: string;
  name: string;
};

type DbSite = {
  id: string;
  name: string;
  city: string | null;
  customer_id: string;
};

type NewWorkOrderForm = {
  customerId: string;
  siteId: string;
  title: string;
  description: string;
  jobType: string;
  priority: string;
  source: string;
  scheduleDate: string;
  scheduleTime: string;
  estimatedDurationMinutes: string;
  requiredSkills: string;
  serviceArea: string;
};

type DbTechProfile = {
  technician_id: string;
  specialty: string | null;
  skill_tags: string[] | null;
  service_area: string | null;
  shift_start: string | null;
  shift_end: string | null;
};

type DbScheduleEvent = {
  id: string;
  technician_id: string;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  work_order_id: string | null;
  notes: string | null;
};

const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];

const statusColors: Record<ActivityStatus, { line: string; text: string; label: string }> = {
  complete: {
    line: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Complete",
  },
  travelling: {
    line: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "Travelling",
  },
  on_site: {
    line: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "On Site",
  },
  working: {
    line: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    label: "Working",
  },
  assigned: {
    line: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    label: "Assigned",
  },
  available: {
    line: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-300",
    label: "Available",
  },
  break: {
    line: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-300",
    label: "Break",
  },
};

const priorityTone: Record<string, string> = {
  emergency: "border-rose-500 bg-rose-500/10 text-rose-500",
  urgent: "border-rose-500 bg-rose-500/10 text-rose-500",
  high: "border-amber-500 bg-amber-500/10 text-amber-500",
  normal: "border-sky-500 bg-sky-500/10 text-sky-500",
  low: "border-slate-500 bg-slate-500/10 text-slate-500",
};

const statusTone: Record<string, string> = {
  "ON SITE": "border-blue-500 bg-blue-500/10 text-blue-500",
  TRAVELLING: "border-blue-500 bg-blue-500/10 text-blue-500",
  WORKING: "border-orange-500 bg-orange-500/10 text-orange-500",
  ASSIGNED: "border-violet-500 bg-violet-500/10 text-violet-500",
  AVAILABLE: "border-slate-500 bg-slate-500/10 text-slate-500",
  COMPLETE: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
};

const emptyNewWorkOrderForm: NewWorkOrderForm = {
  customerId: "",
  siteId: "",
  title: "",
  description: "",
  jobType: "",
  priority: "normal",
  source: "office",
  scheduleDate: "",
  scheduleTime: "",
  estimatedDurationMinutes: "60",
  requiredSkills: "",
  serviceArea: "",
};

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [selectedDate, setSelectedDate] = useState("");
  const [waitingJobs, setWaitingJobs] = useState<WaitingJob[]>([]);
  const [allJobs, setAllJobs] = useState<WaitingJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedJobUuid, setSelectedJobUuid] = useState<string | null>(null);
  const [selectedTechUuid, setSelectedTechUuid] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModal | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [boardCurrentTime, setBoardCurrentTime] = useState<Date | null>(null);
  const [customerOptions, setCustomerOptions] = useState<DbCustomer[]>([]);
  const [siteOptions, setSiteOptions] = useState<DbSite[]>([]);
  const [newWorkOrderOpen, setNewWorkOrderOpen] = useState(false);
  const [newWorkOrderForm, setNewWorkOrderForm] =
    useState<NewWorkOrderForm>(emptyNewWorkOrderForm);
  const [savingWorkOrder, setSavingWorkOrder] = useState(false);
  const [newWorkOrderError, setNewWorkOrderError] = useState<string | null>(null);

  const selectedJob =
    waitingJobs.find((job) => job.uuid === selectedJobUuid) ?? waitingJobs[0] ?? null;
  const techniciansWithFit = useMemo(() => {
    if (!selectedJobUuid) {
      return technicians.map((tech) => ({ ...tech, confidence: 0, rank: 0 }));
    }

    const ranked = [...technicians].sort(
      (a, b) =>
        (b.confidenceByJob[selectedJobUuid] ?? 0) -
        (a.confidenceByJob[selectedJobUuid] ?? 0)
    );
    const rankMap = new Map(ranked.map((tech, index) => [tech.uuid, index + 1]));

    return technicians.map((tech) => ({
      ...tech,
      confidence: tech.confidenceByJob[selectedJobUuid] ?? 0,
      rank: rankMap.get(tech.uuid) ?? 0,
    }));
  }, [technicians, selectedJobUuid]);

  const selectedTech =
    techniciansWithFit.find((tech) => tech.uuid === selectedTechUuid) ?? null;

  const boardNowHour = boardCurrentTime ? dateToDecimalHour(boardCurrentTime) : null;
  const boardShowsNow =
    boardCurrentTime !== null &&
    selectedDate === formatDateInput(boardCurrentTime) &&
    boardNowHour !== null &&
    boardNowHour >= 8 &&
    boardNowHour <= 17;
  const boardNowRatio = boardNowHour === null ? 0 : (boardNowHour - 8) / 9;

  const loadBoard = useCallback(async () => {
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }

    setAuthRequired(false);

    const week = getWeekWindow(selectedDate);

    const [
      profilesResult,
      rolesResult,
      techProfilesResult,
      customersResult,
      sitesResult,
      workOrdersResult,
      assignmentsResult,
      eventsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,active").eq("active", true),
      supabase.from("user_roles").select("user_id,role"),
      supabase
        .from("technician_profiles")
        .select("technician_id,specialty,skill_tags,service_area,shift_start,shift_end"),
      supabase.from("customers").select("id,name"),
      supabase.from("sites").select("id,name,city,customer_id"),
      supabase
        .from("work_orders")
        .select(
          "id,work_order_number,title,description,priority,status,scheduled_start,scheduled_end,requested_at,customer_id,site_id,job_type,estimated_duration_minutes,required_skills,service_area"
        )
        .neq("status", "cancelled"),
      supabase
        .from("work_order_assignments")
        .select("id,work_order_id,technician_id,assignment_status,scheduled_start,scheduled_end")
        .not("assignment_status", "in", '("declined","removed")'),
      supabase
        .from("technician_schedule_events")
        .select("id,technician_id,event_type,title,starts_at,ends_at,work_order_id,notes")
        .lt("starts_at", week.endIso)
        .gt("ends_at", week.startIso),
    ]);

    const results = [
      profilesResult,
      rolesResult,
      techProfilesResult,
      customersResult,
      sitesResult,
      workOrdersResult,
      assignmentsResult,
      eventsResult,
    ];

    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const profiles = (profilesResult.data ?? []) as DbProfile[];
    const roles = (rolesResult.data ?? []) as DbRole[];
    const techProfiles = (techProfilesResult.data ?? []) as DbTechProfile[];
    const customers = (customersResult.data ?? []) as DbCustomer[];
    const sites = (sitesResult.data ?? []) as DbSite[];
    const workOrders = (workOrdersResult.data ?? []) as DbWorkOrder[];

    setCustomerOptions([...customers].sort((a, b) => a.name.localeCompare(b.name)));
    setSiteOptions([...sites].sort((a, b) => a.name.localeCompare(b.name)));
    const assignments = (assignmentsResult.data ?? []) as DbAssignment[];
    const events = (eventsResult.data ?? []) as DbScheduleEvent[];

    const built = buildLiveBoard({
      selectedDate,
      profiles,
      roles,
      techProfiles,
      customers,
      sites,
      workOrders,
      assignments,
      events,
    });

    setWaitingJobs(built.waitingJobs);
    setAllJobs(built.allJobs);
    setTechnicians(built.technicians);

    if (!selectedJobUuid || !built.waitingJobs.some((job) => job.uuid === selectedJobUuid)) {
      setSelectedJobUuid(built.waitingJobs[0]?.uuid ?? null);
    }

    setLoading(false);
  }, [selectedDate, supabase]);

  useEffect(() => {
    const updateBoardTime = () => setBoardCurrentTime(new Date());
    updateBoardTime();

    // Follow the browser/PC local clock continuously.
    const timer = window.setInterval(updateBoardTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(formatDateInput(new Date()));
      return;
    }

    void loadBoard();
  }, [selectedDate, loadBoard]);

  useEffect(() => {
    if (!selectedDate || authRequired) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const refreshSoon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void loadBoard(), 250);
    };

    const channel = supabase
      .channel("fieldops-dispatch-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, refreshSoon)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_order_assignments" },
        refreshSoon
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_schedule_events" },
        refreshSoon
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshSoon)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [authRequired, loadBoard, supabase]);

  function openNewWorkOrder() {
    setNewWorkOrderError(null);

    const firstCustomer = customerOptions[0] ?? null;
    const matchingSites = firstCustomer
      ? siteOptions.filter((site) => site.customer_id === firstCustomer.id)
      : [];
    const firstSite = matchingSites[0] ?? null;

    setNewWorkOrderForm({
      ...emptyNewWorkOrderForm,
      customerId: firstCustomer?.id ?? "",
      siteId: firstSite?.id ?? "",
      scheduleDate: selectedDate,
      serviceArea: firstSite?.city ?? "",
    });
    setNewWorkOrderOpen(true);
  }

  async function createWorkOrder() {
    setNewWorkOrderError(null);

    const title = newWorkOrderForm.title.trim();

    if (!newWorkOrderForm.customerId) {
      setNewWorkOrderError("Select a customer.");
      return;
    }

    if (!title) {
      setNewWorkOrderError("Enter a work-order title.");
      return;
    }

    const duration = Number(newWorkOrderForm.estimatedDurationMinutes);
    if (!Number.isFinite(duration) || duration < 15) {
      setNewWorkOrderError("Estimated duration must be at least 15 minutes.");
      return;
    }

    const hasScheduleDate = Boolean(newWorkOrderForm.scheduleDate);
    const hasScheduleTime = Boolean(newWorkOrderForm.scheduleTime);

    if (hasScheduleDate !== hasScheduleTime) {
      setNewWorkOrderError(
        "Enter both a schedule date and start time, or leave both blank."
      );
      return;
    }

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;

    if (hasScheduleDate && hasScheduleTime) {
      const [hours, minutes] = newWorkOrderForm.scheduleTime
        .split(":")
        .map(Number);

      const start = dateAtHour(
        newWorkOrderForm.scheduleDate,
        hours + minutes / 60
      );
      const end = new Date(start.getTime() + duration * 60 * 1000);

      scheduledStart = start.toISOString();
      scheduledEnd = end.toISOString();
    }

    const selectedSite = newWorkOrderForm.siteId
      ? siteOptions.find((site) => site.id === newWorkOrderForm.siteId) ?? null
      : null;

    const requiredSkills = newWorkOrderForm.requiredSkills
      .split(",")
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);

    setSavingWorkOrder(true);

    const { data, error: insertError } = await supabase
      .from("work_orders")
      .insert({
        customer_id: newWorkOrderForm.customerId,
        site_id: newWorkOrderForm.siteId || null,
        title,
        description: newWorkOrderForm.description.trim() || null,
        job_type: newWorkOrderForm.jobType.trim() || null,
        priority: newWorkOrderForm.priority,
        status: scheduledStart ? "planned" : "requested",
        source: newWorkOrderForm.source,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        estimated_duration_minutes: Math.round(duration),
        required_skills: requiredSkills,
        service_area:
          newWorkOrderForm.serviceArea.trim() ||
          selectedSite?.city ||
          null,
      })
      .select("id,work_order_number")
      .single();

    if (insertError) {
      setNewWorkOrderError(insertError.message);
      setSavingWorkOrder(false);
      return;
    }

    setSavingWorkOrder(false);
    setNewWorkOrderOpen(false);
    setNewWorkOrderForm(emptyNewWorkOrderForm);

    await loadBoard();

    if (data?.id) {
      setSelectedJobUuid(data.id);
    }
  }

  async function assignWork() {
    if (!assignmentModal) return;

    setAssignmentError(null);
    setError(null);

    const startHour = timeInputToDecimalHour(assignmentModal.startTime);
    const endHour = timeInputToDecimalHour(assignmentModal.endTime);

    if (startHour === null || endHour === null) {
      setAssignmentError("Enter a valid start and end time.");
      return;
    }

    if (startHour < 8 || endHour > 17) {
      setAssignmentError("Dispatch time must stay inside the 8:00 AM–5:00 PM board.");
      return;
    }

    if (endHour <= startHour) {
      setAssignmentError("End time must be later than start time.");
      return;
    }

    const targetTech = techniciansWithFit.find(
      (item) => item.uuid === assignmentModal.tech.uuid
    );

    if (!targetTech) {
      setAssignmentError("The selected technician is no longer available.");
      return;
    }

    const duplicateAssignmentOnTarget = targetTech.track.some(
      (segment) =>
        segment.workOrderUuid === assignmentModal.job.uuid &&
        segment.assignmentId !== assignmentModal.assignmentId
    );

    if (duplicateAssignmentOnTarget) {
      setAssignmentError("This work order is already assigned to that technician.");
      return;
    }

    const hasConflict = targetTech.track.some((segment) => {
      if (
        assignmentModal.assignmentId &&
        segment.assignmentId === assignmentModal.assignmentId
      ) {
        return false;
      }

      return (
        segment.status !== "available" &&
        segment.id !== "OPEN" &&
        rangesOverlap(startHour, endHour, segment.start, segment.end)
      );
    });

    if (hasConflict) {
      setAssignmentError(
        "That edited time conflicts with another activity for this technician."
      );
      return;
    }

    const start = dateAtHour(selectedDate, startHour);
    const end = dateAtHour(selectedDate, endHour);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    setSavingAssignment(true);

    let assignmentResult;

    if (assignmentModal.mode === "move" && assignmentModal.assignmentId) {
      assignmentResult = await supabase
        .from("work_order_assignments")
        .update({
          technician_id: assignmentModal.tech.uuid,
          scheduled_start: startIso,
          scheduled_end: endIso,
        })
        .eq("id", assignmentModal.assignmentId);
    } else {
      const { data: existing, error: existingError } = await supabase
        .from("work_order_assignments")
        .select("id")
        .eq("work_order_id", assignmentModal.job.uuid)
        .eq("technician_id", assignmentModal.tech.uuid)
        .maybeSingle();

      if (existingError) {
        setAssignmentError(existingError.message);
        setSavingAssignment(false);
        return;
      }

      const assignmentPayload = {
        work_order_id: assignmentModal.job.uuid,
        technician_id: assignmentModal.tech.uuid,
        assignment_status: "assigned",
        scheduled_start: startIso,
        scheduled_end: endIso,
      };

      assignmentResult = existing?.id
        ? await supabase
            .from("work_order_assignments")
            .update(assignmentPayload)
            .eq("id", existing.id)
        : await supabase.from("work_order_assignments").insert(assignmentPayload);
    }

    if (assignmentResult.error) {
      setAssignmentError(assignmentResult.error.message);
      setSavingAssignment(false);
      return;
    }

    const workOrderUpdate =
      assignmentModal.mode === "move"
        ? {
            scheduled_start: startIso,
            scheduled_end: endIso,
          }
        : {
            status: "assigned",
            scheduled_start: startIso,
            scheduled_end: endIso,
          };

    const { error: workOrderError } = await supabase
      .from("work_orders")
      .update(workOrderUpdate)
      .eq("id", assignmentModal.job.uuid);

    if (workOrderError) {
      setAssignmentError(workOrderError.message);
      setSavingAssignment(false);
      return;
    }

    setAssignmentModal(null);
    setAssignmentError(null);
    setSavingAssignment(false);
    await loadBoard();
  }

  function handleDropJob(
    payload: DragJobPayload,
    techUuid: string,
    dropHour: number
  ) {
    const job =
      waitingJobs.find((item) => item.uuid === payload.jobUuid) ??
      allJobs.find((item) => item.uuid === payload.jobUuid);

    const tech = techniciansWithFit.find((item) => item.uuid === techUuid);
    if (!job || !tech) return;

    setAssignmentError(null);

    const snappedHour = snapHour(dropHour, 15);
    const durationHours = Math.max(job.estimatedDurationMinutes, 15) / 60;
    const endHour = snappedHour + durationHours;

    const hasConflict = tech.track.some((segment) => {
      if (payload.assignmentId && segment.assignmentId === payload.assignmentId) {
        return false;
      }

      return (
        segment.status !== "available" &&
        segment.id !== "OPEN" &&
        rangesOverlap(snappedHour, endHour, segment.start, segment.end)
      );
    });

    if (endHour > 17) {
      setAssignmentError(
        "The dropped time runs past 5:00 PM. Edit the start/end time before confirming."
      );
    } else if (hasConflict) {
      setAssignmentError(
        "The dropped time overlaps another activity. Edit the start/end time before confirming."
      );
    } else {
      setAssignmentError(null);
    }

    const start = dateAtHour(selectedDate, snappedHour);
    const end = dateAtHour(selectedDate, endHour);

    const modalTech = {
      ...tech,
      confidence: tech.confidenceByJob[job.uuid] ?? 0,
    };

    setAssignmentModal({
      mode: payload.kind === "assigned" ? "move" : "assign",
      job,
      tech: modalTech,
      sourceTechnicianUuid: payload.sourceTechnicianUuid,
      assignmentId: payload.assignmentId,
      startTime: timeInputFromDate(start),
      endTime: timeInputFromDate(end),
    });
  }

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
                type="button"
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
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
            >
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

            <div className="flex flex-wrap gap-2">
              <label className="relative flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>

              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold"
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>

              <button
                type="button"
                onClick={openNewWorkOrder}
                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            </div>
          </section>

          {authRequired ? (
            <section className="rounded-2xl border border-border bg-card p-8 text-center">
              <h2 className="text-xl font-bold">Sign in to load live dispatch data</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                FieldOps now reads protected customer, technician and work-order data from Supabase.
              </p>
              <Link
                href="/auth/login"
                className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Sign in
              </Link>
            </section>
          ) : (
            <>
              {error && (
                <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                  {error}
                </div>
              )}

              <div className="grid gap-5 2xl:grid-cols-[300px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
                  <div className="border-b border-border px-4 py-4">
                    <h2 className="font-bold">Waiting work</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Select one to compare dispatch fit. Drag it onto a technician track to assign.
                    </p>
                  </div>

                  {loading ? (
                    <div className="p-5 text-sm text-muted-foreground">Loading live work orders…</div>
                  ) : waitingJobs.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground">
                      No unassigned work orders are waiting.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {waitingJobs.map((job) => {
                        const selected = job.uuid === selectedJob?.uuid;
                        return (
                          <button
                            key={job.uuid}
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              const payload: DragJobPayload = {
                                kind: "waiting",
                                jobUuid: job.uuid,
                              };
                              event.dataTransfer.setData(
                                "application/x-fieldops-job",
                                JSON.stringify(payload)
                              );
                              event.dataTransfer.setData("text/plain", job.uuid);
                            }}
                            onClick={() => setSelectedJobUuid(job.uuid)}
                            className={`w-full p-4 text-left transition ${
                              selected ? "bg-primary/[0.07]" : "hover:bg-row-hover"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black text-primary">{job.id}</span>
                              <span
                                className={`border px-2 py-1 text-[10px] font-bold rounded-none ${job.tone}`}
                              >
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
                  )}
                </section>

                <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/75 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
                    <div>
                      <h2 className="font-bold">Technician tracks</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Technician | Daily Track
                      </p>
                    </div>

                    {selectedJob && (
                      <div className="border border-primary/30 bg-primary/[0.06] px-3 py-2 rounded-none">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Dispatch fit for
                        </div>
                        <div className="mt-0.5 text-xs font-black text-primary">
                          {selectedJob.id} · {selectedJob.title}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[1120px]">
                      <div className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="border-r border-border px-4 py-3">Technician</div>
                        <div className="px-3 py-3">Daily Track</div>
                      </div>

                      <div className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border bg-background/30">
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

                      {loading ? (
                        <div className="p-6 text-sm text-muted-foreground">Loading technicians…</div>
                      ) : techniciansWithFit.length === 0 ? (
                        <div className="p-6 text-sm text-muted-foreground">
                          No active users currently have the Technician role.
                        </div>
                      ) : (
                        <div className="relative">
                          {boardShowsNow && (
                            <div
                              className="pointer-events-none absolute bottom-0 top-0 z-40 w-px bg-rose-500/70"
                              style={{
                                left: `calc(${boardNowRatio * 100}% + ${250 * (1 - boardNowRatio)}px)`,
                              }}
                            >
                              <div className="absolute -top-5 -translate-x-1/2 bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                                NOW
                              </div>
                            </div>
                          )}

                          {techniciansWithFit.map((tech) => (
                            <div
                              key={tech.uuid}
                              className="grid grid-cols-[250px_minmax(0,1fr)] border-b border-border last:border-b-0"
                            >
                              <div className="flex items-start gap-3 border-r border-border p-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-avatar text-xs font-black">
                                  {tech.initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-bold">{tech.name}</div>
                                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                                    {tech.role}
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`border px-1.5 py-0.5 text-[8px] font-black rounded-none ${
                                        tech.statusTone
                                      }`}
                                    >
                                      {tech.status}
                                    </span>

                                    {selectedJob && (
                                      <>
                                        <span
                                          className={`text-[9px] font-black ${
                                            tech.rank === 1 ? "text-primary" : "text-muted-foreground"
                                          }`}
                                        >
                                          {tech.confidence}% fit
                                        </span>
                                        {tech.rank === 1 && (
                                          <span className="border border-primary/30 px-1.5 py-0.5 text-[8px] font-black text-primary rounded-none">
                                            BEST
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTechUuid(tech.uuid);
                                      setScheduleView("today");
                                    }}
                                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                                  >
                                    View schedule
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <SingleLineTimeline
                                track={tech.track}
                                technicianId={tech.uuid}
                                onDropJob={handleDropJob}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close schedule"
            onClick={() => setSelectedTechUuid(null)}
            className="absolute inset-0 bg-black/45"
          />

          <section className="relative z-10 flex max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-primary">Technician Schedule</div>
                <h2 className="mt-1 truncate text-xl font-bold">{selectedTech.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedTech.role}</span>
                  <span
                    className={`border px-2 py-1 text-[9px] font-black rounded-none ${
                      selectedTech.statusTone
                    }`}
                  >
                    {selectedTech.status}
                  </span>
                  {selectedJob && (
                    <span className="border border-primary/25 bg-primary/[0.06] px-2 py-1 text-[9px] font-black text-primary rounded-none">
                      {selectedTech.confidence}% FIT FOR {selectedJob.id}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTechUuid(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex gap-2">
                <button
                  type="button"
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
                  type="button"
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

              <div className="text-xs font-semibold text-muted-foreground">{selectedDate}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {scheduleView === "today" ? (
                <TodaySchedule items={selectedTech.today} selectedDate={selectedDate} />
              ) : (
                <WeekSchedule week={selectedTech.week} selectedDate={selectedDate} />
              )}
            </div>
          </section>
        </div>
      )}

      {newWorkOrderOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close new work order"
            onClick={() => {
              if (!savingWorkOrder) setNewWorkOrderOpen(false);
            }}
            className="absolute inset-0 bg-black/50"
          />

          <section className="relative z-10 flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
              <div>
                <div className="text-xs font-semibold text-primary">Dispatch</div>
                <h2 className="mt-1 text-xl font-bold">New Work Order</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a job and place it directly into Waiting work.
                </p>
              </div>

              <button
                type="button"
                disabled={savingWorkOrder}
                onClick={() => setNewWorkOrderOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {newWorkOrderError && (
                <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                  {newWorkOrderError}
                </div>
              )}

              {customerOptions.length === 0 ? (
                <div className="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                  No customers exist yet. Create a customer before creating a work order.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold">
                      Work order title <span className="text-rose-500">*</span>
                    </span>
                    <input
                      autoFocus
                      value={newWorkOrderForm.title}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="e.g. Replace failed workstation"
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">
                      Customer <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={newWorkOrderForm.customerId}
                      onChange={(event) => {
                        const customerId = event.target.value;
                        const matchingSites = siteOptions.filter(
                          (site) => site.customer_id === customerId
                        );
                        const firstSite = matchingSites[0] ?? null;

                        setNewWorkOrderForm((current) => ({
                          ...current,
                          customerId,
                          siteId: firstSite?.id ?? "",
                          serviceArea: firstSite?.city ?? "",
                        }));
                      }}
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Select customer</option>
                      {customerOptions.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">Site</span>
                    <select
                      value={newWorkOrderForm.siteId}
                      onChange={(event) => {
                        const siteId = event.target.value;
                        const site =
                          siteOptions.find((item) => item.id === siteId) ?? null;

                        setNewWorkOrderForm((current) => ({
                          ...current,
                          siteId,
                          serviceArea: site?.city ?? current.serviceArea,
                        }));
                      }}
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">No specific site</option>
                      {siteOptions
                        .filter(
                          (site) =>
                            !newWorkOrderForm.customerId ||
                            site.customer_id === newWorkOrderForm.customerId
                        )
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                            {site.city ? ` · ${site.city}` : ""}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">Priority</span>
                    <select
                      value={newWorkOrderForm.priority}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">Source</span>
                    <select
                      value={newWorkOrderForm.source}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          source: event.target.value,
                        }))
                      }
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="office">Office</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">Job type</span>
                    <input
                      value={newWorkOrderForm.jobType}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          jobType: event.target.value,
                        }))
                      }
                      placeholder="e.g. Desktop Support"
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold">Service area</span>
                    <input
                      value={newWorkOrderForm.serviceArea}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          serviceArea: event.target.value,
                        }))
                      }
                      placeholder="e.g. Downtown"
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <div className="md:col-span-2 grid gap-3 border border-border bg-muted/20 p-4 md:grid-cols-[1fr_1fr_180px]">
                    <label>
                      <span className="mb-1.5 block text-xs font-bold">
                        Schedule date
                      </span>
                      <input
                        type="date"
                        value={newWorkOrderForm.scheduleDate}
                        onChange={(event) =>
                          setNewWorkOrderForm((current) => ({
                            ...current,
                            scheduleDate: event.target.value,
                          }))
                        }
                        className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold">
                        Start time
                      </span>
                      <input
                        type="time"
                        step={900}
                        value={newWorkOrderForm.scheduleTime}
                        onChange={(event) =>
                          setNewWorkOrderForm((current) => ({
                            ...current,
                            scheduleTime: event.target.value,
                          }))
                        }
                        className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold">
                        Est. minutes
                      </span>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={newWorkOrderForm.estimatedDurationMinutes}
                        onChange={(event) =>
                          setNewWorkOrderForm((current) => ({
                            ...current,
                            estimatedDurationMinutes: event.target.value,
                          }))
                        }
                        className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <div className="md:col-span-3 text-[11px] text-muted-foreground">
                      Leave both schedule fields blank for an unscheduled job.
                    </div>
                  </div>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold">
                      Required skills
                    </span>
                    <input
                      value={newWorkOrderForm.requiredSkills}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          requiredSkills: event.target.value,
                        }))
                      }
                      placeholder="network, firewall, windows"
                      className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      Separate skills with commas. They are used by Dispatch Fit.
                    </span>
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold">Description</span>
                    <textarea
                      rows={4}
                      value={newWorkOrderForm.description}
                      onChange={(event) =>
                        setNewWorkOrderForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Describe the issue, request, access instructions or other dispatch details..."
                      className="w-full resize-y border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4">
              <div className="text-[11px] text-muted-foreground">
                FieldOps generates the work-order number automatically.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingWorkOrder}
                  onClick={() => setNewWorkOrderOpen(false)}
                  className="h-10 border border-border px-4 text-sm font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingWorkOrder || customerOptions.length === 0}
                  onClick={() => void createWorkOrder()}
                  className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {savingWorkOrder ? "Creating…" : "Create Work Order"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {assignmentModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-primary">
                  {assignmentModal.mode === "move" ? "Move Work Order" : "Confirm Dispatch"}
                </div>
                <h2 className="mt-1 text-lg font-bold">{assignmentModal.job.id}</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  {assignmentModal.job.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignmentModal(null);
                  setAssignmentError(null);
                }}
                className="flex h-9 w-9 items-center justify-center border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {assignmentError && (
              <div className="mt-4 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                {assignmentError}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Info
                label={assignmentModal.mode === "move" ? "Move to" : "Technician"}
                value={assignmentModal.tech.name}
              />
              <Info
                label="Dispatch fit"
                value={`${assignmentModal.tech.confidence}%`}
              />
            </div>

            <div className="mt-5 border border-border bg-muted/20 p-4">
              <div className="text-xs font-bold">Assignment time</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Dragging chooses the approximate slot. Edit the exact time before confirming.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1.5 block text-[11px] font-bold">Start</span>
                  <input
                    type="time"
                    step={900}
                    value={assignmentModal.startTime}
                    onChange={(event) =>
                      setAssignmentModal((current) =>
                        current
                          ? {
                              ...current,
                              startTime: event.target.value,
                            }
                          : current
                      )
                    }
                    className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[11px] font-bold">End</span>
                  <input
                    type="time"
                    step={900}
                    value={assignmentModal.endTime}
                    onChange={(event) =>
                      setAssignmentModal((current) =>
                        current
                          ? {
                              ...current,
                              endTime: event.target.value,
                            }
                          : current
                      )
                    }
                    className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="mt-3 text-[11px] text-muted-foreground">
                {assignmentModal.startTime && assignmentModal.endTime
                  ? `${formatTimeInputLabel(assignmentModal.startTime)} – ${formatTimeInputLabel(
                      assignmentModal.endTime
                    )}`
                  : "Enter a start and end time."}
              </div>
            </div>

            {assignmentModal.job.description && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Job description
                </div>
                <div className="mt-1 text-sm leading-5">
                  {assignmentModal.job.description}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignmentModal(null);
                  setAssignmentError(null);
                }}
                className="h-10 border border-border px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAssignment}
                onClick={() => void assignWork()}
                className="h-10 bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {savingAssignment
                  ? assignmentModal.mode === "move"
                    ? "Moving…"
                    : "Assigning…"
                  : assignmentModal.mode === "move"
                  ? "Confirm Move"
                  : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function buildLiveBoard(args: {
  selectedDate: string;
  profiles: DbProfile[];
  roles: DbRole[];
  techProfiles: DbTechProfile[];
  customers: DbCustomer[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  assignments: DbAssignment[];
  events: DbScheduleEvent[];
}) {
  const {
    selectedDate,
    profiles,
    roles,
    techProfiles,
    customers,
    sites,
    workOrders,
    assignments,
    events,
  } = args;

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  const workOrderMap = new Map(workOrders.map((workOrder) => [workOrder.id, workOrder]));
  const techProfileMap = new Map(
    techProfiles.map((profile) => [profile.technician_id, profile])
  );

  const activeAssignments = assignments.filter(
    (assignment) => !["declined", "removed"].includes(assignment.assignment_status)
  );

  const assignedWorkOrderIds = new Set(activeAssignments.map((assignment) => assignment.work_order_id));

  const allJobs: WaitingJob[] = workOrders.map((workOrder) => {
    const customer = customerMap.get(workOrder.customer_id);
    const site = workOrder.site_id ? siteMap.get(workOrder.site_id) : null;
    const start = workOrder.scheduled_start ? new Date(workOrder.scheduled_start) : null;

    return {
      uuid: workOrder.id,
      id: workOrder.work_order_number,
      title: workOrder.title,
      description: workOrder.description,
      customer: customer?.name ?? "Unknown customer",
      place: workOrder.service_area ?? site?.city ?? site?.name ?? "No site",
      time: start
        ? formatLocalTime(start)
        : ["emergency", "urgent"].includes(workOrder.priority)
        ? "ASAP"
        : "Unscheduled",
      priority: capitalize(workOrder.priority),
      tone: priorityTone[workOrder.priority] ?? priorityTone.normal,
      scheduledStart: workOrder.scheduled_start,
      scheduledEnd: workOrder.scheduled_end,
      estimatedDurationMinutes: workOrder.estimated_duration_minutes ?? 60,
      requiredSkills: workOrder.required_skills ?? [],
      serviceArea: workOrder.service_area ?? site?.city ?? null,
    };
  });

  const waitingJobs: WaitingJob[] = allJobs
    .filter((job) => {
      const workOrder = workOrderMap.get(job.uuid);
      return (
        workOrder !== undefined &&
        ["requested", "planned"].includes(workOrder.status) &&
        !assignedWorkOrderIds.has(workOrder.id)
      );
    })
    .sort((a, b) => {
      const priorityWeight: Record<string, number> = {
        Emergency: 5,
        Urgent: 4,
        High: 3,
        Normal: 2,
        Low: 1,
      };

      const workOrderA = workOrderMap.get(a.uuid);
      const workOrderB = workOrderMap.get(b.uuid);

      return (
        (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0) ||
        new Date(workOrderA?.requested_at ?? 0).getTime() -
          new Date(workOrderB?.requested_at ?? 0).getTime()
      );
    });


  const technicianIds = new Set(
    roles.filter((role) => role.role === "technician").map((role) => role.user_id)
  );

  const provisional = profiles
    .filter((profile) => technicianIds.has(profile.id))
    .map((profile) => {
      const techProfile = techProfileMap.get(profile.id);
      const techAssignments = activeAssignments.filter(
        (assignment) => assignment.technician_id === profile.id
      );
      const techEvents = events.filter((event) => event.technician_id === profile.id);

      const dayTrack = buildTrackForDate({
        selectedDate,
        assignments: techAssignments,
        events: techEvents,
        workOrderMap,
        customerMap,
        siteMap,
      });

      const today = buildScheduleForDate({
        date: selectedDate,
        assignments: techAssignments,
        events: techEvents,
        workOrderMap,
      });

      const week = buildWeekSchedule({
        selectedDate,
        assignments: techAssignments,
        events: techEvents,
        workOrderMap,
      });

      const status = deriveTechnicianStatus(selectedDate, dayTrack);
      const confidenceByJob = Object.fromEntries(
        allJobs.map((job) => [
          job.uuid,
          computeDispatchFit({
            job,
            techProfile,
            track: dayTrack,
            selectedDate,
          }),
        ])
      );

      const name = profile.full_name?.trim() || profile.email || "Unnamed Technician";

      return {
        uuid: profile.id,
        initials: initials(name),
        name,
        role: techProfile?.specialty?.trim() || "Technician",
        status,
        statusTone: statusTone[status] ?? statusTone.AVAILABLE,
        confidenceByJob,
        confidence: 0,
        rank: 0,
        track: dayTrack,
        today,
        week,
      };
    });

  return { waitingJobs, allJobs, technicians: provisional };
}

function buildTrackForDate(args: {
  selectedDate: string;
  assignments: DbAssignment[];
  events: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
}) {
  const { selectedDate, assignments, events, workOrderMap, customerMap, siteMap } = args;
  const window = getDayWindow(selectedDate);
  const track: Segment[] = [];

  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(assignment.work_order_id);
    if (!workOrder) continue;

    const startIso = assignment.scheduled_start ?? workOrder.scheduled_start;
    const endIso = assignment.scheduled_end ?? workOrder.scheduled_end;
    if (!startIso || !endIso) continue;

    const start = new Date(startIso);
    const end = new Date(endIso);

    if (!datesOverlap(start, end, window.start, window.end)) continue;

    const clippedStart = start < window.start ? window.start : start;
    const clippedEnd = end > window.end ? window.end : end;

    const customer = customerMap.get(workOrder.customer_id);
    const site = workOrder.site_id ? siteMap.get(workOrder.site_id) : null;

    track.push({
      start: dateToDecimalHour(clippedStart),
      end: dateToDecimalHour(clippedEnd),
      id: workOrder.work_order_number,
      title: workOrder.title,
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      status: mapWorkOrderStatus(workOrder.status),
      labelSide: track.length % 2 === 0 ? "top" : "bottom",
      customer: customer?.name,
      place: workOrder.service_area ?? site?.city ?? site?.name ?? undefined,
      priority: capitalize(workOrder.priority),
      description: workOrder.description ?? undefined,
      workOrderUuid: workOrder.id,
      assignmentId: assignment.id,
    });
  }

  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    if (!datesOverlap(start, end, window.start, window.end)) continue;

    const clippedStart = start < window.start ? window.start : start;
    const clippedEnd = end > window.end ? window.end : end;

    track.push({
      start: dateToDecimalHour(clippedStart),
      end: dateToDecimalHour(clippedEnd),
      id: event.event_type.toUpperCase(),
      title: event.title,
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      status: mapEventStatus(event.event_type),
      labelSide: track.length % 2 === 0 ? "top" : "bottom",
      notes: event.notes ?? undefined,
    });
  }

  return track
    .filter((segment) => segment.end > 8 && segment.start < 17)
    .map((segment) => ({
      ...segment,
      start: Math.max(8, segment.start),
      end: Math.min(17, segment.end),
    }))
    .sort((a, b) => a.start - b.start);
}

function buildScheduleForDate(args: {
  date: string;
  assignments: DbAssignment[];
  events: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
}) {
  const { date, assignments, events, workOrderMap } = args;
  const window = getDayWindow(date);
  const items: Array<ScheduleItem & { sortTime: number }> = [];

  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(assignment.work_order_id);
    if (!workOrder) continue;

    const startIso = assignment.scheduled_start ?? workOrder.scheduled_start;
    const endIso = assignment.scheduled_end ?? workOrder.scheduled_end;
    if (!startIso || !endIso) continue;

    const start = new Date(startIso);
    const end = new Date(endIso);
    if (!datesOverlap(start, end, window.start, window.end)) continue;

    items.push({
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      id: workOrder.work_order_number,
      title: workOrder.title,
      status: statusColors[mapWorkOrderStatus(workOrder.status)].label.toUpperCase(),
      sortTime: start.getTime(),
    });
  }

  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);
    if (!datesOverlap(start, end, window.start, window.end)) continue;

    items.push({
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      id: event.event_type.toUpperCase(),
      title: event.title,
      status: statusColors[mapEventStatus(event.event_type)].label.toUpperCase(),
      sortTime: start.getTime(),
    });
  }

  return items
    .sort((a, b) => a.sortTime - b.sortTime)
    .map(({ sortTime: _sortTime, ...item }) => item);
}

function buildWeekSchedule(args: {
  selectedDate: string;
  assignments: DbAssignment[];
  events: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
}) {
  const { selectedDate, assignments, events, workOrderMap } = args;
  const week = getWeekWindow(selectedDate);
  const days: Record<string, ScheduleItem[]> = {};

  for (let offset = 0; offset < 5; offset += 1) {
    const date = new Date(week.start);
    date.setDate(date.getDate() + offset);
    const dateString = formatDateInput(date);
    const label = date.toLocaleDateString(undefined, { weekday: "short" });

    days[label] = buildScheduleForDate({
      date: dateString,
      assignments,
      events,
      workOrderMap,
    });
  }

  return days;
}

function deriveTechnicianStatus(selectedDate: string, track: Segment[]) {
  const today = formatDateInput(new Date());
  if (selectedDate !== today) return track.length > 0 ? "ASSIGNED" : "AVAILABLE";

  const now = dateToDecimalHour(new Date());
  const active = track.find((segment) => segment.start <= now && segment.end >= now);

  if (!active) return "AVAILABLE";

  const mapping: Record<ActivityStatus, string> = {
    complete: "COMPLETE",
    travelling: "TRAVELLING",
    on_site: "ON SITE",
    working: "WORKING",
    assigned: "ASSIGNED",
    available: "AVAILABLE",
    break: "AVAILABLE",
  };

  return mapping[active.status];
}

function computeDispatchFit(args: {
  job: WaitingJob;
  techProfile: DbTechProfile | undefined;
  track: Segment[];
  selectedDate: string;
}) {
  const { job, techProfile, track, selectedDate } = args;

  const proposedStart = job.scheduledStart
    ? new Date(job.scheduledStart)
    : selectedDate === formatDateInput(new Date())
    ? new Date()
    : dateAtHour(selectedDate, 8);

  const startHour = dateToDecimalHour(proposedStart);
  const endHour = startHour + Math.max(job.estimatedDurationMinutes, 15) / 60;

  const conflict = track.some(
    (segment) =>
      segment.status !== "available" &&
      rangesOverlap(startHour, endHour, segment.start, segment.end)
  );

  const availabilityScore = conflict ? 8 : 40;

  const required = normalizeTags(job.requiredSkills);
  const skills = normalizeTags(techProfile?.skill_tags ?? []);
  const skillScore =
    required.length === 0
      ? 24
      : Math.round(
          35 *
            (required.filter((requiredSkill) => skills.includes(requiredSkill)).length /
              required.length)
        );

  const jobArea = normalizeText(job.serviceArea);
  const techArea = normalizeText(techProfile?.service_area);
  const areaScore =
    !jobArea || !techArea ? 10 : jobArea === techArea ? 15 : 5;

  const scheduledHours = track
    .filter((segment) => !["available", "break"].includes(segment.status))
    .reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0);

  const workloadScore = Math.max(0, Math.round(10 * (1 - Math.min(scheduledHours / 8, 1))));

  return clamp(availabilityScore + skillScore + areaScore + workloadScore, 0, 100);
}

function mapWorkOrderStatus(status: string): ActivityStatus {
  switch (status) {
    case "travelling":
      return "travelling";
    case "on_site":
      return "on_site";
    case "working":
      return "working";
    case "finished":
    case "billing_ready":
    case "closed":
      return "complete";
    default:
      return "assigned";
  }
}

function mapEventStatus(eventType: string): ActivityStatus {
  switch (eventType) {
    case "travel":
      return "travelling";
    case "lunch":
    case "break":
    case "training":
    case "meeting":
    case "unavailable":
    case "other":
    default:
      return "break";
  }
}

function formatClock(hour: number) {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function timeInputFromDate(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function timeInputToDecimalHour(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours + minutes / 60;
}

function formatTimeInputLabel(value: string) {
  const hour = timeInputToDecimalHour(value);
  return hour === null ? value : formatClock(hour);
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

type HoverHintData = {
  left: number;
  top: number;
  placement: "above" | "below";
  title: string;
  id: string;
  status: string;
  start: number;
  end: number;
  customer?: string;
  place?: string;
  priority?: string;
  description?: string;
  detail?: string;
};

function HoverHintPortal({ hint }: { hint: HoverHintData | null }) {
  if (!hint || typeof document === "undefined") return null;

  const above = hint.placement === "above";

  return createPortal(
    <div
      className="pointer-events-none fixed z-[99999] w-72 border border-slate-300 bg-white p-3 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      style={{
        left: hint.left,
        top: hint.top,
        transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <div
        className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 ${
          above
            ? "bottom-0 translate-y-1/2 border-b border-r"
            : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />

      <div className="text-[10px] font-black uppercase tracking-wider text-primary">
        {hint.status}
      </div>
      <div className="mt-1 text-sm font-bold">{hint.title}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{hint.id}</div>

      {(hint.customer || hint.place || hint.priority) && (
        <div className="mt-3 space-y-1 text-[10px]">
          {hint.customer && (
            <div>
              <span className="text-muted-foreground">Customer: </span>
              <span className="font-bold">{hint.customer}</span>
            </div>
          )}
          {hint.place && (
            <div>
              <span className="text-muted-foreground">Location: </span>
              <span className="font-bold">{hint.place}</span>
            </div>
          )}
          {hint.priority && (
            <div>
              <span className="text-muted-foreground">Priority: </span>
              <span className="font-bold">{hint.priority}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground">Start</div>
          <div className="mt-0.5 font-bold">{formatClock(hint.start)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">End</div>
          <div className="mt-0.5 font-bold">{formatClock(hint.end)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-muted-foreground">Duration</div>
          <div className="mt-0.5 font-bold">{durationLabel(hint.start, hint.end)}</div>
        </div>
      </div>

      {hint.description && (
        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Description
          </div>
          <div className="mt-1 text-[10px] leading-4 text-slate-700 dark:text-slate-200">
            {hint.description}
          </div>
        </div>
      )}

      {hint.detail && (
        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Details
          </div>
          <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
            {hint.detail}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function SingleLineTimeline({
  track,
  technicianId,
  onDropJob,
}: {
  track: Segment[];
  technicianId: string;
  onDropJob: (payload: DragJobPayload, techUuid: string, dropHour: number) => void;
}) {
  const [hint, setHint] = useState<HoverHintData | null>(null);
  const [dragHour, setDragHour] = useState<number | null>(null);

  const startHour = 8;
  const totalHours = 9;
  const items = buildTrackItems(track);

  function openHint(
    target: HTMLElement,
    data: Omit<HoverHintData, "left" | "top" | "placement">
  ) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 288;
    const half = tooltipWidth / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, half + 10),
      window.innerWidth - half - 10
    );

    const useAbove = rect.bottom + 220 > window.innerHeight;

    setHint({
      ...data,
      left,
      top: useAbove ? rect.top - 10 : rect.bottom + 10,
      placement: useAbove ? "above" : "below",
    });
  }

  function hourFromPointer(clientX: number, rect: DOMRect) {
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return startHour + ratio * totalHours;
  }

  return (
    <div
      className="relative min-h-[118px] overflow-visible px-3 py-2"
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setDragHour(snapHour(hourFromPointer(event.clientX, rect), 15));
      }}
      onDragLeave={() => setDragHour(null)}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const dropHour = snapHour(hourFromPointer(event.clientX, rect), 15);
        const fieldOpsPayload = event.dataTransfer.getData(
          "application/x-fieldops-job"
        );
        const fallbackJobUuid = event.dataTransfer.getData("text/plain");
        setDragHour(null);

        let payload: DragJobPayload | null = null;

        if (fieldOpsPayload) {
          try {
            payload = JSON.parse(fieldOpsPayload) as DragJobPayload;
          } catch {
            payload = null;
          }
        }

        if (!payload && fallbackJobUuid) {
          payload = {
            kind: "waiting",
            jobUuid: fallbackJobUuid,
          };
        }

        if (payload?.jobUuid) {
          onDropJob(payload, technicianId, dropHour);
        }
      }}
    >
      <div className="absolute inset-0 grid grid-cols-10 overflow-hidden">
        {hours.map((hour) => (
          <div key={hour} className="border-r border-border/30 last:border-r-0" />
        ))}
      </div>

      {dragHour !== null && (
        <div
          className="pointer-events-none absolute bottom-2 top-2 z-40 w-px bg-primary"
          style={{ left: `${((dragHour - startHour) / totalHours) * 100}%` }}
        >
          <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap bg-primary px-1 py-0.5 text-[8px] font-black text-primary-foreground">
            {formatClock(dragHour)}
          </div>
        </div>
      )}

      <div className="relative h-[100px]">
        <div className="absolute left-0 right-0 top-[49px] h-px bg-border" />

        {items.map((item, index) => {
          if (item.type === "gap") {
            const left = ((item.start - startHour) / totalHours) * 100;
            const width = ((item.end - item.start) / totalHours) * 100;
            const tinyGap = (item.end - item.start) * 60 <= 10;

            return (
              <div
                key={`gap-${item.start}-${item.end}-${index}`}
                className="absolute top-0 z-30 h-full cursor-help"
                style={{
                  left: `${Math.max(0, left)}%`,
                  width: `${Math.max(width, 0.45)}%`,
                  minWidth: tinyGap ? "7px" : undefined,
                }}
                onMouseEnter={(event) =>
                  openHint(event.currentTarget, {
                    title: "Unscheduled gap",
                    id: "OPEN GAP",
                    status: "Gap",
                    start: item.start,
                    end: item.end,
                    detail: "No activity is scheduled in this interval.",
                  })
                }
                onMouseLeave={() => setHint(null)}
              >
                <span className="absolute left-0 right-0 top-[47px] border-t-2 border-dashed border-slate-500/80" />
                <span className="absolute left-0 top-[43px] h-[12px] w-[12px] -translate-x-1/2 rounded-full border-2 border-background bg-slate-500" />
                <span className="absolute right-0 top-[43px] h-[12px] w-[12px] translate-x-1/2 rounded-full border-2 border-background bg-slate-500" />

                <span className="absolute left-1/2 top-[60px] w-full -translate-x-1/2 overflow-hidden px-0.5 text-center text-[7px] font-black uppercase text-slate-500">
                  <span className="block truncate">{durationLabel(item.start, item.end)} gap</span>
                </span>
              </div>
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
              ? segment.notes ?? "Non-job time recorded on the technician schedule."
              : segment.status === "travelling"
              ? segment.notes ?? "Technician is travelling between assignments."
              : segment.workOrderUuid
              ? undefined
              : segment.notes ?? "Scheduled activity on this technician's daily track.";

          const canMoveJob =
            Boolean(segment.workOrderUuid) && segment.status !== "complete";

          return (
            <div
              key={`${segment.id}-${segment.time}-${index}`}
              draggable={canMoveJob}
              title={canMoveJob ? "Drag to move or reschedule this work order" : undefined}
              className={`absolute top-0 z-30 h-full text-left ${
                canMoveJob ? "cursor-grab active:cursor-grabbing" : "cursor-help"
              }`}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(width, 1.5)}%`,
              }}
              onDragStart={(event) => {
                if (!canMoveJob || !segment.workOrderUuid) {
                  event.preventDefault();
                  return;
                }

                setHint(null);
                event.dataTransfer.effectAllowed = "move";

                const payload: DragJobPayload = {
                  kind: "assigned",
                  jobUuid: segment.workOrderUuid,
                  sourceTechnicianUuid: technicianId,
                  assignmentId: segment.assignmentId,
                };

                event.dataTransfer.setData(
                  "application/x-fieldops-job",
                  JSON.stringify(payload)
                );
                event.dataTransfer.setData("text/plain", segment.workOrderUuid);
              }}
              onMouseEnter={(event) =>
                openHint(event.currentTarget, {
                  title: segment.title,
                  id: segment.id,
                  status: colors.label,
                  start: segment.start,
                  end: segment.end,
                  customer: segment.customer,
                  place: segment.place,
                  priority: segment.priority,
                  description: segment.workOrderUuid
                    ? segment.description ?? "No description provided."
                    : undefined,
                  detail,
                })
              }
              onMouseLeave={() => setHint(null)}
            >
              <span className={`absolute left-0 right-0 top-[47px] h-[4px] ${colors.line}`} />

              <span
                className={`absolute left-0 top-[43px] h-[12px] w-[12px] -translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />
              <span
                className={`absolute right-0 top-[43px] h-[12px] w-[12px] translate-x-1/2 rounded-full border-2 border-background ${colors.line}`}
              />

              <span
                className={`absolute left-1/2 w-full -translate-x-1/2 overflow-hidden px-1 ${
                  topLabel ? "bottom-[57px]" : "top-[58px]"
                }`}
              >
                <span className={`block truncate text-[8px] font-black uppercase ${colors.text}`}>
                  {colors.label}
                </span>
                <span className="block truncate text-[9px] font-semibold">{segment.title}</span>
                <span className="block truncate whitespace-nowrap text-[8px] text-muted-foreground">
                  {segment.time}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <HoverHintPortal hint={hint} />
    </div>
  );
}

function TodaySchedule({
  items,
  selectedDate,
}: {
  items: ScheduleItem[];
  selectedDate: string;
}) {
  const date = parseDateInput(selectedDate);

  return (
    <div>
      <h3 className="font-bold">
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </h3>

      {items.length === 0 ? (
        <div className="mt-4 text-sm text-muted-foreground">No scheduled activity.</div>
      ) : (
        <div className="mt-4 border-l-2 border-border pl-5">
          {items.map((item) => (
            <div key={`${item.time}-${item.id}`} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="text-xs font-bold text-muted-foreground">{item.time}</div>
              <div className="mt-1 text-xs font-black text-primary">{item.id}</div>
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                {item.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekSchedule({
  week,
  selectedDate,
}: {
  week: Record<string, ScheduleItem[]>;
  selectedDate: string;
}) {
  const labels = Object.keys(week);
  const range = getWeekWindow(selectedDate);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Week schedule</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {range.start.toLocaleDateString()} –{" "}
          {new Date(range.end.getTime() - 1).toLocaleDateString()}
        </p>
      </div>

      {labels.map((day) => (
        <div key={day} className="border border-border">
          <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-black">
            {day}
          </div>
          <div className="divide-y divide-border">
            {(week[day] ?? []).length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No scheduled activity</div>
            ) : (
              week[day].map((item) => (
                <div
                  key={`${day}-${item.time}-${item.id}`}
                  className="grid grid-cols-[92px_1fr] gap-3 p-3"
                >
                  <div className="text-[11px] font-bold text-muted-foreground">{item.time}</div>
                  <div>
                    <div className="text-xs font-black text-primary">{item.id}</div>
                    <div className="mt-1 text-xs font-semibold">{item.title}</div>
                    <div className="mt-0.5 text-[9px] font-bold text-muted-foreground">
                      {item.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getDayWindow(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

function getWeekWindow(value: string) {
  const date = parseDateInput(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

function dateToDecimalHour(date: Date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function dateAtHour(dateString: string, hour: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  return new Date(year, month - 1, day, wholeHour, minutes, 0, 0);
}

function formatLocalTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function datesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function snapHour(hour: number, minutes: number) {
  const step = minutes / 60;
  return Math.round(hour / step) * step;
}

function normalizeTags(values: string[]) {
  return values.map((value) => normalizeText(value)).filter((value): value is string => Boolean(value));
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function capitalize(value: string) {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
