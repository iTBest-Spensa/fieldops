"use client";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";
import { createClient } from "@/lib/supabase/client";

import type {
  ActivityEditModal,
  AssignmentModal,
  DbAssignment,
  DbCustomer,
  DbProfile,
  DbRole,
  DbScheduleEvent,
  DbSite,
  DbTechProfile,
  DbTimeEntry,
  DbWorkOrder,
  DragJobPayload,
  NewWorkOrderForm,
  Segment,
  Technician,
  WaitingJob,
} from "./types";

import {
  BOARD_END_HOUR,
  BOARD_START_HOUR,
  BOARD_TOTAL_HOURS,
  emptyNewWorkOrderForm,
} from "./constants";

import {
  dateAtHour,
  dateToDecimalHour,
  formatDateInput,
  getWeekWindow,
  rangesOverlap,
  snapHour,
  timeInputFromDate,
  timeInputToDecimalHour,
} from "./utils";

import { buildLiveBoard } from "./builders/board-builders";
import { WaitingWorkPanel } from "./components/waiting-work-panel";
import { TechnicianTracksPanel } from "./components/technician-tracks-panel";
import { OvertimeModal } from "./components/modals/overtime-modal";
import { TechnicianScheduleModal } from "./components/modals/technician-schedule-modal";
import { NewWorkOrderModal } from "./components/modals/new-work-order-modal";
import { DispatchAssignmentModal } from "./components/modals/assignment-modal";
import { ActivityEditModal as DispatchActivityEditModal } from "./components/modals/activity-edit-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, active: true, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Accounts", icon: ReceiptText, href: "/accounts" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [selectedDate, setSelectedDate] = useState("");
  const [waitingJobs, setWaitingJobs] = useState<WaitingJob[]>([]);
  const [allJobs, setAllJobs] = useState<WaitingJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedJobUuid, setSelectedJobUuid] = useState<string | null>(null);
  const [focusJobUuid, setFocusJobUuid] = useState<string | null>(null);
  const [focusTechnicianUuid, setFocusTechnicianUuid] = useState<string | null>(null);
  const [focusAssignmentId, setFocusAssignmentId] = useState<string | null>(null);
  const [focusPulse, setFocusPulse] = useState(false);
  const [overtimeTechnicianUuid, setOvertimeTechnicianUuid] = useState<string | null>(null);
  const [selectedTechUuid, setSelectedTechUuid] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<AssignmentModal | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [activityModal, setActivityModal] = useState<ActivityEditModal | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [boardCurrentTime, setBoardCurrentTime] = useState<Date | null>(null);
  const [customerOptions, setCustomerOptions] = useState<DbCustomer[]>([]);
  const [siteOptions, setSiteOptions] = useState<DbSite[]>([]);
  const [newWorkOrderOpen, setNewWorkOrderOpen] = useState(false);
  const [newWorkOrderForm, setNewWorkOrderForm] =
    useState<NewWorkOrderForm>(emptyNewWorkOrderForm);
  const [savingWorkOrder, setSavingWorkOrder] = useState(false);
  const [newWorkOrderError, setNewWorkOrderError] = useState<string | null>(null);
  const [currentUserIsTechnician, setCurrentUserIsTechnician] = useState(false);
  const [currentUserCanDispatch, setCurrentUserCanDispatch] = useState(false);
  const [claimingJobUuid, setClaimingJobUuid] = useState<string | null>(null);

  const selectedJob =
    allJobs.find((job) => job.uuid === selectedJobUuid) ??
    waitingJobs[0] ??
    null;
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

  const overtimeItems = useMemo(
    () =>
      techniciansWithFit
        .flatMap((tech) => tech.overtime)
        .sort((a, b) => a.sortTime - b.sortTime),
    [techniciansWithFit]
  );

  const overtimeTechnician =
    techniciansWithFit.find(
      (tech) => tech.uuid === overtimeTechnicianUuid
    ) ?? null;

  const overtimeTechnicianItems = overtimeTechnician?.overtime ?? [];

  const boardNowHour = boardCurrentTime ? dateToDecimalHour(boardCurrentTime) : null;
  const boardShowsNow =
    boardCurrentTime !== null &&
    selectedDate === formatDateInput(boardCurrentTime) &&
    boardNowHour !== null &&
    boardNowHour >= BOARD_START_HOUR &&
    boardNowHour <= BOARD_END_HOUR;

  const boardUsesLiveNow = boardShowsNow;
  const boardNowRatio =
    boardNowHour === null
      ? 0
      : (boardNowHour - BOARD_START_HOUR) / BOARD_TOTAL_HOURS;
  const boardNowLabel = boardCurrentTime
    ? boardCurrentTime.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";
  const quickDates = boardCurrentTime
    ? [
        { offset: -1, label: "Yesterday" },
        { offset: 0, label: "Today" },
        { offset: 1, label: "Tomorrow" },
      ].map(({ offset, label }) => {
        const date = new Date(boardCurrentTime);
        date.setDate(date.getDate() + offset);

        return {
          value: formatDateInput(date),
          label,
        };
      })
    : [];

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
      timeEntriesResult,
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
        .select("id,work_order_id,technician_id,assignment_role,assignment_status,scheduled_start,scheduled_end,accepted_at,released_at,pending_activity_type")
        .not("assignment_status", "in", '("declined","removed")'),
      supabase
        .from("time_entries")
        .select("id,work_order_id,technician_id,assignment_id,started_at,ended_at,duration_minutes,activity_type,billable,billing_rate,pay_rate,approval_status,ended_reason"),
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
      timeEntriesResult,
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
    const currentUserRoles = roles
      .filter((role) => role.user_id === authData.user.id)
      .map((role) => role.role);
    setCurrentUserIsTechnician(currentUserRoles.includes("technician"));
    setCurrentUserCanDispatch(
      currentUserRoles.some((role) =>
        ["admin", "manager", "dispatcher"].includes(role)
      )
    );
    const techProfiles = (techProfilesResult.data ?? []) as DbTechProfile[];
    const customers = (customersResult.data ?? []) as DbCustomer[];
    const sites = (sitesResult.data ?? []) as DbSite[];
    const workOrders = (workOrdersResult.data ?? []) as DbWorkOrder[];

    setCustomerOptions([...customers].sort((a, b) => a.name.localeCompare(b.name)));
    setSiteOptions([...sites].sort((a, b) => a.name.localeCompare(b.name)));
    const assignments = (assignmentsResult.data ?? []) as DbAssignment[];
    const timeEntries = (timeEntriesResult.data ?? []) as DbTimeEntry[];
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
      timeEntries,
      events,
    });

    setWaitingJobs(built.waitingJobs);
    setAllJobs(built.allJobs);
    setTechnicians(built.technicians);

    if (
      !selectedJobUuid ||
      !built.allJobs.some((job) => job.uuid === selectedJobUuid)
    ) {
      setSelectedJobUuid(built.waitingJobs[0]?.uuid ?? null);
    }

    setLoading(false);
  }, [selectedDate, supabase]);

  useEffect(() => {
    const updateBoardTime = () => setBoardCurrentTime(new Date());
    updateBoardTime();

    // Browser Date is the actual local clock reported by the user's PC.
    const timer = window.setInterval(updateBoardTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      const params = new URLSearchParams(window.location.search);

      let storedRequest: {
        jobUuid?: string;
        date?: string | null;
        technicianUuid?: string | null;
        assignmentId?: string | null;
        requestedAt?: number;
      } | null = null;

      try {
        const raw = window.sessionStorage.getItem(
          "fieldops:dispatch-locator"
        );

        if (raw) {
          storedRequest = JSON.parse(raw);
          window.sessionStorage.removeItem(
            "fieldops:dispatch-locator"
          );
        }
      } catch {
        storedRequest = null;
      }

      const requestedDate =
        params.get("date") || storedRequest?.date || null;
      const requestedJob =
        params.get("focus") || storedRequest?.jobUuid || null;
      const requestedTech =
        params.get("tech") ||
        storedRequest?.technicianUuid ||
        null;
      const requestedAssignment =
        params.get("assignment") ||
        storedRequest?.assignmentId ||
        null;

      if (requestedJob) {
        setFocusJobUuid(requestedJob);
        setSelectedJobUuid(requestedJob);
        // Blink starts only after the exact DOM target is found.
        setFocusPulse(false);
      }

      if (requestedTech) {
        setFocusTechnicianUuid(requestedTech);
      }

      if (requestedAssignment) {
        setFocusAssignmentId(requestedAssignment);
      }

      setSelectedDate(
        requestedDate || formatDateInput(new Date())
      );
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
        { event: "*", schema: "public", table: "time_entries" },
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

  useEffect(() => {
    if (!focusPulse) return;

    const timer = window.setTimeout(() => {
      setFocusPulse(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [focusPulse]);

  useEffect(() => {
    if (!selectedDate || authRequired) return;

    const refreshDispatch = () => {
      void loadBoard();
    };

    const handleAssignmentSignal = () => {
      refreshDispatch();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key ===
        "fieldops:dispatch-assignment-updated"
      ) {
        refreshDispatch();
      }
    };

    // Ensures Dispatch does not display a stale technician assignment when
    // returning from Work Orders or when another browser tab assigns a tech.
    window.addEventListener("focus", refreshDispatch);
    window.addEventListener(
      "pageshow",
      refreshDispatch
    );
    window.addEventListener(
      "fieldops:dispatch-assignment-updated",
      handleAssignmentSignal
    );
    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshDispatch
      );
      window.removeEventListener(
        "pageshow",
        refreshDispatch
      );
      window.removeEventListener(
        "fieldops:dispatch-assignment-updated",
        handleAssignmentSignal
      );
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    selectedDate,
    authRequired,
    loadBoard,
  ]);

  useEffect(() => {
    if (!focusJobUuid || loading) return;

    const exists = allJobs.some(
      (job) => job.uuid === focusJobUuid
    );

    if (exists) {
      setSelectedJobUuid(focusJobUuid);
    }

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 20;
    let retryTimer: number | null = null;

    const locate = () => {
      if (cancelled) return;

      attempt += 1;

      const assignmentSelector = focusAssignmentId
        ? `[data-fieldops-assignment="${focusAssignmentId}"][data-fieldops-segment-kind="planned"]`
        : `[data-fieldops-work-order="${focusJobUuid}"]`;

      const exactSelector = focusTechnicianUuid
        ? `[data-technician-row="${focusTechnicianUuid}"] ${assignmentSelector}`
        : assignmentSelector;

      // First try the exact technician + exact job.
      let element = document.querySelector(exactSelector);

      // An assignment id means the caller asked for one exact dispatch.
      // Never fall through and highlight another assignment for the same job.
      if (!(element instanceof HTMLElement) && !focusAssignmentId) {
        element = document.querySelector(
          `[data-fieldops-work-order="${focusJobUuid}"][data-fieldops-segment-kind="planned"]`
        ) ?? document.querySelector(
          `[data-fieldops-work-order="${focusJobUuid}"]`
        );
      }

      if (element instanceof HTMLElement) {
        setError(null);
        setFocusPulse(true);

        const scrollContainer = element.closest(
          "[data-dispatch-horizontal-scroll]"
        );

        if (scrollContainer instanceof HTMLElement) {
          const elementRect = element.getBoundingClientRect();
          const containerRect =
            scrollContainer.getBoundingClientRect();

          const elementCenter =
            elementRect.left -
            containerRect.left +
            scrollContainer.scrollLeft +
            elementRect.width / 2;

          const targetLeft =
            elementCenter -
            scrollContainer.clientWidth / 2;

          scrollContainer.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: "smooth",
          });
        }

        const row = element.closest(
          "[data-technician-row]"
        );

        if (row instanceof HTMLElement) {
          const rowRect = row.getBoundingClientRect();
          const viewportTop = 90;
          const viewportBottom =
            window.innerHeight - 30;

          if (
            rowRect.top < viewportTop ||
            rowRect.bottom > viewportBottom
          ) {
            window.scrollTo({
              top:
                window.scrollY +
                rowRect.top -
                Math.max(
                  110,
                  window.innerHeight / 3
                ),
              behavior: "smooth",
            });
          }
        }

        return;
      }

      const matchingOvertime = overtimeItems.find(
        (item) =>
          item.workOrderUuid === focusJobUuid &&
          (!focusAssignmentId || item.assignmentId === focusAssignmentId) &&
          (!focusTechnicianUuid ||
            item.technicianUuid ===
              focusTechnicianUuid)
      );

      if (matchingOvertime) {
        setError(null);
        setOvertimeTechnicianUuid(
          matchingOvertime.technicianUuid
        );
        setFocusPulse(true);
        return;
      }

      if (attempt < maxAttempts) {
        retryTimer = window.setTimeout(
          locate,
          100
        );
        return;
      }

      // Never silently highlight another work order.
      const target = allJobs.find(
        (job) => job.uuid === focusJobUuid
      );

      setError(
        target
          ? `Could not locate ${target.id} on ${selectedDate}. The work order exists, but no matching technician track segment was found.`
          : "The requested work order could not be found in Dispatch."
      );
    };

    // Give the freshly loaded board one paint before first lookup.
    retryTimer = window.setTimeout(locate, 50);

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [
    focusJobUuid,
    focusTechnicianUuid,
    focusAssignmentId,
    loading,
    allJobs,
    selectedDate,
    overtimeItems,
  ]);

  function changeDispatchDate(nextDate: string) {
    if (!nextDate || nextDate === selectedDate) return;

    // A manual date change is a fresh board view. Do not carry a
    // previous Locate-in-Dispatch target onto another calendar day.
    setError(null);
    setFocusJobUuid(null);
    setFocusTechnicianUuid(null);
    setFocusAssignmentId(null);
    setFocusPulse(false);
    setSelectedJobUuid(null);
    setOvertimeTechnicianUuid(null);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("focus");
      url.searchParams.delete("tech");
      url.searchParams.delete("assignment");
      url.searchParams.set("date", nextDate);
      window.history.replaceState(
        null,
        "",
        `${url.pathname}?${url.searchParams.toString()}`
      );
    } catch {
      // The in-memory date change still works if URL replacement is unavailable.
    }

    setSelectedDate(nextDate);
  }

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

  async function claimWaitingWork(job: WaitingJob) {
    setError(null);
    setClaimingJobUuid(job.uuid);

    const { error: claimError } = await supabase.rpc(
      "fieldops_claim_work_order",
      {
        p_work_order_id: job.uuid,
      }
    );

    if (claimError) {
      setError(claimError.message);
      setClaimingJobUuid(null);
      return;
    }

    setSelectedJobUuid(job.uuid);
    setClaimingJobUuid(null);
    await loadBoard();
  }

  async function assignWork() {
    if (!assignmentModal) return;

    setAssignmentError(null);
    setError(null);

    const startHour = timeInputToDecimalHour(assignmentModal.startTime);
    const endHour = timeInputToDecimalHour(assignmentModal.endTime);

    if (!assignmentModal.date) {
      setAssignmentError("Choose the assignment date.");
      return;
    }

    if (startHour === null || endHour === null) {
      setAssignmentError("Enter a valid start and end time.");
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

    const start = dateAtHour(assignmentModal.date, startHour);
    const end = dateAtHour(assignmentModal.date, endHour);

    setSavingAssignment(true);

    const { error: rpcError } = await supabase.rpc(
      "fieldops_reassign_work_order",
      {
        p_work_order_id: assignmentModal.job.uuid,
        p_from_assignment_id: assignmentModal.assignmentId ?? null,
        p_to_technician_id: assignmentModal.tech.uuid,
        p_scheduled_start: start.toISOString(),
        p_scheduled_end: end.toISOString(),
      }
    );

    if (rpcError) {
      setAssignmentError(rpcError.message);
      setSavingAssignment(false);
      return;
    }

    const destinationDate = assignmentModal.date;

    setAssignmentModal(null);
    setAssignmentError(null);
    setSavingAssignment(false);

    if (destinationDate !== selectedDate) {
      setSelectedDate(destinationDate);
    } else {
      await loadBoard();
    }
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

    if (hasConflict) {
      setAssignmentError(
        "The dropped time overlaps another activity. Edit the date/start/end time before confirming."
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
      date: selectedDate,
      startTime: timeInputFromDate(start),
      endTime: timeInputFromDate(end),
    });
  }

  function openActivityEditor(segment: Segment, technicianUuid: string) {
    if (!segment.workOrderUuid) return;

    const job = allJobs.find((item) => item.uuid === segment.workOrderUuid);
    const tech = techniciansWithFit.find((item) => item.uuid === technicianUuid);
    if (!job || !tech) return;

    const sourceStart = segment.sourceStartAt
      ? new Date(segment.sourceStartAt)
      : dateAtHour(selectedDate, segment.start);
    const sourceEnd = segment.sourceEndAt
      ? new Date(segment.sourceEndAt)
      : segment.openActual
      ? null
      : dateAtHour(selectedDate, segment.end);

    setActivityError(null);
    setActivityModal({
      kind: segment.actual ? "actual" : "planned",
      technicianUuid,
      technicianName: tech.name,
      jobUuid: job.uuid,
      jobId: job.id,
      jobTitle: job.title,
      assignmentId: segment.assignmentId,
      timeEntryId: segment.timeEntryId,
      startDate: formatDateInput(sourceStart),
      startTime: timeInputFromDate(sourceStart),
      endDate: sourceEnd ? formatDateInput(sourceEnd) : "",
      endTime: sourceEnd ? timeInputFromDate(sourceEnd) : "",
      activityType: segment.activityType || "work",
      billable: segment.billable ?? true,
      billingRate: segment.billingRate ?? null,
      payRate: segment.payRate ?? null,
      correctionReason: "",
    });
  }

  async function saveActivityEdit() {
    if (!activityModal) return;

    setActivityError(null);

    const startHour = timeInputToDecimalHour(activityModal.startTime);
    if (!activityModal.startDate || startHour === null) {
      setActivityError("Enter a valid start date and time.");
      return;
    }

    const start = dateAtHour(activityModal.startDate, startHour);
    let end: Date | null = null;

    if (activityModal.endTime || activityModal.endDate) {
      const endHour = timeInputToDecimalHour(activityModal.endTime);
      if (!activityModal.endDate || endHour === null) {
        setActivityError("Enter both an end date and end time, or leave both blank for an active actual entry.");
        return;
      }
      end = dateAtHour(activityModal.endDate, endHour);
      if (end <= start) {
        setActivityError("End time must be later than start time.");
        return;
      }
    }

    if (activityModal.kind === "planned" && !end) {
      setActivityError("A scheduled dispatch must have an end date and time.");
      return;
    }

    setSavingActivity(true);

    if (activityModal.kind === "planned") {
      if (!activityModal.assignmentId || !end) {
        setActivityError("This dispatch assignment could not be identified.");
        setSavingActivity(false);
        return;
      }

      const { error: updateError } = await supabase.rpc(
        "fieldops_reassign_work_order",
        {
          p_work_order_id: activityModal.jobUuid,
          p_from_assignment_id: activityModal.assignmentId,
          p_to_technician_id: activityModal.technicianUuid,
          p_scheduled_start: start.toISOString(),
          p_scheduled_end: end.toISOString(),
        }
      );

      if (updateError) {
        setActivityError(updateError.message);
        setSavingActivity(false);
        return;
      }
    } else {
      if (!activityModal.timeEntryId) {
        setActivityError("The actual time entry behind this line could not be identified.");
        setSavingActivity(false);
        return;
      }

      if (activityModal.correctionReason.trim().length < 5) {
        setActivityError("Enter a correction reason of at least 5 characters.");
        setSavingActivity(false);
        return;
      }

      const { error: correctionError } = await supabase.rpc(
        "fieldops_correct_time_entry",
        {
          p_time_entry_id: activityModal.timeEntryId,
          p_started_at: start.toISOString(),
          p_ended_at: end ? end.toISOString() : null,
          p_activity_type: activityModal.activityType,
          p_billable: activityModal.billable,
          p_billing_rate: activityModal.billingRate,
          p_pay_rate: activityModal.payRate,
          p_reason: activityModal.correctionReason.trim(),
        }
      );

      if (correctionError) {
        setActivityError(correctionError.message);
        setSavingActivity(false);
        return;
      }
    }

    setSavingActivity(false);
    setActivityModal(null);
    setActivityError(null);
    await loadBoard();
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <FieldOpsSidebar fixed />

      <div className="flex h-screen min-h-0 flex-col xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="flex-1" />

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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6">
          <section className="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">Dispatch</div>
              <h1 className="mt-1 text-2xl font-bold">Technician Track Board</h1>
              
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="relative flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => changeDispatchDate(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>

              {quickDates.map((date) => (
                <button
                  key={date.value}
                  type="button"
                  onClick={() => changeDispatchDate(date.value)}
                  className={`h-10 border px-3 text-xs font-bold ${
                    selectedDate === date.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {date.label}
                </button>
              ))}

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

              <div className="grid gap-5 2xl:grid-cols-[240px_minmax(0,1fr)]">
                <WaitingWorkPanel
                  loading={loading}
                  waitingJobs={waitingJobs}
                  selectedJob={selectedJob}
                  focusJobUuid={focusJobUuid}
                  focusPulse={focusPulse}
                  canSelfClaim={currentUserIsTechnician}
                  canDragAssign={currentUserCanDispatch}
                  claimingJobUuid={claimingJobUuid}
                  onSelectJob={setSelectedJobUuid}
                  onClaimJob={(job) => void claimWaitingWork(job)}
                />

                <TechnicianTracksPanel
                  selectedJob={selectedJob}
                  loading={loading}
                  technicians={techniciansWithFit}
                  boardShowsNow={boardShowsNow}
                  boardNowRatio={boardNowRatio}
                  boardNowLabel={boardNowLabel}
                  focusJobUuid={focusJobUuid}
                  focusAssignmentId={focusAssignmentId}
                  focusPulse={focusPulse}
                  onEditActivity={openActivityEditor}
                  boardUsesLiveNow={boardUsesLiveNow}
                  boardNowHour={boardNowHour}
                  onDropJob={handleDropJob}
                  onViewSchedule={(technicianUuid) => {
                    setSelectedTechUuid(technicianUuid);
                    setScheduleView("today");
                  }}
                  onOpenOvertime={setOvertimeTechnicianUuid}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <OvertimeModal
        technician={overtimeTechnician}
        items={overtimeTechnicianItems}
        selectedDate={selectedDate}
        focusJobUuid={focusJobUuid}
        focusTechnicianUuid={focusTechnicianUuid}
        focusPulse={focusPulse}
        onClose={() => setOvertimeTechnicianUuid(null)}
      />

      <TechnicianScheduleModal
        selectedTech={selectedTech}
        selectedJob={selectedJob}
        scheduleView={scheduleView}
        selectedDate={selectedDate}
        onScheduleViewChange={setScheduleView}
        onManageActualTime={(workOrderUuid) => {
          const params = new URLSearchParams({ focus: workOrderUuid, time: "1", return: "dispatch", date: selectedDate });
          if (selectedTech?.uuid) params.set("tech", selectedTech.uuid);
          window.location.assign(`/work-orders?${params.toString()}`);
        }}
        onClose={() => setSelectedTechUuid(null)}
      />

      <NewWorkOrderModal
        open={newWorkOrderOpen}
        savingWorkOrder={savingWorkOrder}
        newWorkOrderError={newWorkOrderError}
        customerOptions={customerOptions}
        siteOptions={siteOptions}
        newWorkOrderForm={newWorkOrderForm}
        setNewWorkOrderForm={setNewWorkOrderForm}
        setNewWorkOrderOpen={setNewWorkOrderOpen}
        onCreate={() => void createWorkOrder()}
      />

      <DispatchActivityEditModal
        activityModal={activityModal}
        setActivityModal={setActivityModal}
        activityError={activityError}
        setActivityError={setActivityError}
        savingActivity={savingActivity}
        onSave={() => void saveActivityEdit()}
      />

      <DispatchAssignmentModal
        assignmentModal={assignmentModal}
        setAssignmentModal={setAssignmentModal}
        assignmentError={assignmentError}
        setAssignmentError={setAssignmentError}
        savingAssignment={savingAssignment}
        onAssign={() => void assignWork()}
      />
    </main>
  );
}
