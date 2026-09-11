"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  Filter,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Truck,
  Users,
  Building2,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";
import { createClient } from "@/lib/supabase/client";
import type {
  AddTechnicianForm,
  CertificationForm,
  CompensationForm,
  DbAssignment,
  DbCustomer,
  DbProfile,
  DbRole,
  DbScheduleEvent,
  DbSite,
  DbTechnicianCertification,
  DbTechnicianCompensation,
  DbTechnicianNote,
  DbTechnicianProfile,
  DbTechnicianSkill,
  DbTimeEntry,
  DbWorkOrder,
  ScheduleEventForm,
  SkillForm,
  TechnicianDetailTab,
  TechnicianForm,
  TechnicianSnapshot,
  TechnicianSummaryView,
} from "./types";
import {
  activeWorkOrderStatuses,
  emptyAddTechnicianForm,
  emptyCertificationForm,
  emptyCompensationForm,
  emptyScheduleEventForm,
  emptySkillForm,
  emptyTechnicianForm,
} from "./constants";
import {
  activityLabel,
  certificationState,
  dateInput,
  eventOverlaps,
  isWithinShift,
  localDateTime,
  outsideShiftMinutesForEntry,
  technicianName,
  weekBounds,
} from "./utils";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { FieldTeamSummaryCards } from "./components/field-team-summary-cards";
import { TechnicianTable } from "./components/technician-table";
import { TechnicianDetailModal } from "./components/modals/technician-detail-modal";
import { FieldTeamSummaryModal } from "./components/modals/field-team-summary-modal";
import { TechnicianFormModal } from "./components/modals/technician-form-modal";
import { AddTechnicianModal } from "./components/modals/add-technician-modal";
import { SkillModal } from "./components/modals/skill-modal";
import { CertificationModal } from "./components/modals/certification-modal";
import { ScheduleEventModal } from "./components/modals/schedule-event-modal";
import { CompensationModal } from "./components/modals/compensation-modal";
import { AddTechnicianNoteModal } from "./components/modals/add-technician-note-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, active: true, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const profileSelect = "id,full_name,email,phone,active,created_at,updated_at";
const technicianProfileSelect = "technician_id,specialty,skill_tags,service_area,shift_start,shift_end,employee_number,job_title,employment_type,hire_date,home_base,created_at,updated_at";
const skillSelect = "id,technician_id,skill_name,proficiency,active,notes,created_by,created_at,updated_at";
const certificationSelect = "id,technician_id,certification_name,issuer,credential_number,issued_on,expires_on,active,notes,created_by,created_at,updated_at";
const compensationSelect = "technician_id,billing_rate,pay_rate,currency,updated_by,created_at,updated_at";
const noteSelect = "id,technician_id,note,created_by,created_at";
const workOrderSelect = "id,work_order_number,customer_id,site_id,title,description,priority,status,scheduled_start,scheduled_end,requested_at,completed_at,closed_at,service_area";
const assignmentSelect = "id,work_order_id,technician_id,assignment_role,assignment_status,scheduled_start,scheduled_end,assigned_at,accepted_at,released_at";
const timeEntrySelect = "id,work_order_id,technician_id,assignment_id,started_at,ended_at,duration_minutes,activity_type,billable,billing_rate,pay_rate,approval_status,ended_reason";
const scheduleEventSelect = "id,technician_id,event_type,title,starts_at,ends_at,work_order_id,notes,created_by,created_at,updated_at";

export default function FieldTeamPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [technicianProfiles, setTechnicianProfiles] = useState<DbTechnicianProfile[]>([]);
  const [skills, setSkills] = useState<DbTechnicianSkill[]>([]);
  const [certifications, setCertifications] = useState<DbTechnicianCertification[]>([]);
  const [compensation, setCompensation] = useState<DbTechnicianCompensation[]>([]);
  const [notes, setNotes] = useState<DbTechnicianNote[]>([]);
  const [workOrders, setWorkOrders] = useState<DbWorkOrder[]>([]);
  const [assignments, setAssignments] = useState<DbAssignment[]>([]);
  const [timeEntries, setTimeEntries] = useState<DbTimeEntry[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<DbScheduleEvent[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);

  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "inactive">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "busy" | "unavailable" | "off_shift">("all");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<TechnicianDetailTab>("overview");
  const [summaryView, setSummaryView] = useState<TechnicianSummaryView | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [technicianForm, setTechnicianForm] = useState<TechnicianForm>(emptyTechnicianForm);
  const [technicianFormError, setTechnicianFormError] = useState<string | null>(null);
  const [savingTechnician, setSavingTechnician] = useState(false);

  const [addTechnicianOpen, setAddTechnicianOpen] = useState(false);
  const [addTechnicianForm, setAddTechnicianForm] = useState<AddTechnicianForm>(emptyAddTechnicianForm);
  const [addTechnicianError, setAddTechnicianError] = useState<string | null>(null);
  const [addingTechnician, setAddingTechnician] = useState(false);

  const [skillOpen, setSkillOpen] = useState(false);
  const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [savingSkill, setSavingSkill] = useState(false);

  const [certificationOpen, setCertificationOpen] = useState(false);
  const [certificationForm, setCertificationForm] = useState<CertificationForm>(emptyCertificationForm);
  const [certificationError, setCertificationError] = useState<string | null>(null);
  const [savingCertification, setSavingCertification] = useState(false);

  const [scheduleEventOpen, setScheduleEventOpen] = useState(false);
  const [scheduleEventForm, setScheduleEventForm] = useState<ScheduleEventForm>(emptyScheduleEventForm);
  const [scheduleEventError, setScheduleEventError] = useState<string | null>(null);
  const [savingScheduleEvent, setSavingScheduleEvent] = useState(false);

  const [compensationOpen, setCompensationOpen] = useState(false);
  const [compensationForm, setCompensationForm] = useState<CompensationForm>(emptyCompensationForm);
  const [compensationError, setCompensationError] = useState<string | null>(null);
  const [savingCompensation, setSavingCompensation] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const [actionNotice, setActionNotice] = useState<ActionNoticeState | null>(null);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const technicianProfileMap = useMemo(() => new Map(technicianProfiles.map((profile) => [profile.technician_id, profile])), [technicianProfiles]);
  const workOrderMap = useMemo(() => new Map(workOrders.map((workOrder) => [workOrder.id, workOrder])), [workOrders]);
  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const siteMap = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const compensationMap = useMemo(() => new Map(compensation.map((item) => [item.technician_id, item])), [compensation]);

  const myRoles = useMemo(() => roles.filter((role) => role.user_id === currentUserId).map((role) => role.role), [roles, currentUserId]);
  const isAdmin = myRoles.includes("admin");
  const canManage = isAdmin || myRoles.includes("manager");
  const canSchedule = canManage || myRoles.includes("dispatcher");
  const canAddNote = canSchedule;

  const technicianIds = useMemo(() => {
    const ids = new Set<string>();
    technicianProfiles.forEach((profile) => ids.add(profile.technician_id));
    roles.filter((role) => role.role === "technician").forEach((role) => ids.add(role.user_id));
    return ids;
  }, [technicianProfiles, roles]);

  const technicianSnapshots = useMemo<TechnicianSnapshot[]>(() => {
    const effectiveNowMs = nowMs ?? 0;
    const now = new Date(effectiveNowMs);
    const week = weekBounds(now);

    return profiles
      .filter((profile) => technicianIds.has(profile.id))
      .map((profile) => {
        const techProfile = technicianProfileMap.get(profile.id) ?? null;
        const techAssignments = assignments.filter((assignment) => assignment.technician_id === profile.id);
        const techEntries = timeEntries.filter((entry) => entry.technician_id === profile.id);
        const techEvents = scheduleEvents.filter((event) => event.technician_id === profile.id);
        const techCertifications = certifications.filter((certification) => certification.technician_id === profile.id);

        const openEntry = [...techEntries]
          .filter((entry) => entry.ended_at === null)
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] ?? null;

        const currentEvent = techEvents.find((event) => new Date(event.starts_at).getTime() <= effectiveNowMs && new Date(event.ends_at).getTime() > effectiveNowMs) ?? null;
        const currentAssignment = techAssignments.find((assignment) =>
          assignment.assignment_status !== "removed" &&
          assignment.assignment_status !== "declined" &&
          assignment.assignment_status !== "completed" &&
          assignment.released_at === null &&
          assignment.scheduled_start !== null &&
          assignment.scheduled_end !== null &&
          new Date(assignment.scheduled_start).getTime() <= effectiveNowMs &&
          new Date(assignment.scheduled_end).getTime() > effectiveNowMs
        ) ?? null;

        const currentWorkOrderId = openEntry?.work_order_id ?? currentAssignment?.work_order_id ?? null;
        const currentWorkOrder = currentWorkOrderId ? workOrderMap.get(currentWorkOrderId) ?? null : null;

        let status = "Available";
        let statusDetail = "Ready for dispatch";
        if (!profile.active) {
          status = "Inactive";
          statusDetail = "Inactive FieldOps account";
        } else if (openEntry) {
          status = activityLabel(openEntry.activity_type);
          statusDetail = `${activityLabel(openEntry.activity_type)} since ${new Date(openEntry.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
        } else if (currentEvent) {
          status = activityLabel(currentEvent.event_type);
          statusDetail = currentEvent.title;
        } else if (currentAssignment) {
          status = activityLabel(currentWorkOrder?.status === "planned" ? "assigned" : currentWorkOrder?.status ?? "assigned");
          statusDetail = currentWorkOrder ? `${currentWorkOrder.work_order_number} · ${currentWorkOrder.title}` : "Scheduled assignment";
        } else if (!isWithinShift(now, techProfile?.shift_start ?? "07:00", techProfile?.shift_end ?? "17:00")) {
          status = "Off Shift";
          statusDetail = "Outside configured shift";
        }

        const openWorkCount = techAssignments.filter((assignment) => {
          if (["removed", "declined", "completed"].includes(assignment.assignment_status) || assignment.released_at !== null) return false;
          const workOrder = workOrderMap.get(assignment.work_order_id);
          return workOrder ? activeWorkOrderStatuses.has(workOrder.status) : false;
        }).length;

        const nextAssignmentAt = techAssignments
          .filter((assignment) => assignment.assignment_status !== "removed" && assignment.assignment_status !== "declined" && assignment.assignment_status !== "completed" && assignment.released_at === null && assignment.scheduled_start && new Date(assignment.scheduled_start).getTime() > effectiveNowMs)
          .map((assignment) => assignment.scheduled_start!)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

        const weekOvertimeMinutes = techEntries.reduce((sum, entry) => sum + outsideShiftMinutesForEntry(
          entry,
          techProfile?.shift_start ?? "07:00",
          techProfile?.shift_end ?? "17:00",
          now,
          week.start,
          week.end,
        ), 0);

        const certificationAlerts = techCertifications.filter((certification) => certificationState(certification, now).alert).length;

        return {
          technicianId: profile.id,
          name: technicianName(profile.full_name, profile.email),
          email: profile.email,
          phone: profile.phone,
          active: profile.active,
          specialty: techProfile?.specialty ?? null,
          jobTitle: techProfile?.job_title ?? null,
          serviceArea: techProfile?.service_area ?? null,
          shiftStart: techProfile?.shift_start ?? "07:00",
          shiftEnd: techProfile?.shift_end ?? "17:00",
          employmentType: techProfile?.employment_type ?? "full_time",
          status,
          statusDetail,
          currentWorkOrderId,
          currentWorkOrderNumber: currentWorkOrder?.work_order_number ?? null,
          currentWorkOrderTitle: currentWorkOrder?.title ?? null,
          openWorkCount,
          nextAssignmentAt,
          weekOvertimeMinutes,
          certificationAlerts,
        };
      })
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [profiles, technicianIds, technicianProfileMap, assignments, timeEntries, scheduleEvents, certifications, workOrderMap, nowMs]);

  const filteredTechnicians = useMemo(() => {
    const query = search.trim().toLowerCase();
    return technicianSnapshots.filter((tech) => {
      if (accountFilter === "active" && !tech.active) return false;
      if (accountFilter === "inactive" && tech.active) return false;
      if (availabilityFilter === "available" && tech.status !== "Available") return false;
      if (availabilityFilter === "busy" && tech.currentWorkOrderId === null) return false;
      if (availabilityFilter === "off_shift" && tech.status !== "Off Shift") return false;
      if (availabilityFilter === "unavailable") {
        const unavailable = tech.active && tech.currentWorkOrderId === null && !["Available", "Off Shift"].includes(tech.status);
        if (!unavailable) return false;
      }
      if (!query) return true;
      const techSkills = skills.filter((skill) => skill.technician_id === tech.technicianId && skill.active).map((skill) => skill.skill_name);
      const profile = technicianProfileMap.get(tech.technicianId);
      return [tech.name, tech.email, tech.phone, tech.jobTitle, tech.specialty, tech.serviceArea, profile?.employee_number, profile?.home_base, ...techSkills, ...(profile?.skill_tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [technicianSnapshots, accountFilter, availabilityFilter, search, skills, technicianProfileMap]);

  const selectedProfile = selectedTechnicianId ? profileMap.get(selectedTechnicianId) ?? null : null;
  const selectedTechnicianProfile = selectedTechnicianId ? technicianProfileMap.get(selectedTechnicianId) ?? null : null;
  const selectedSnapshot = technicianSnapshots.find((snapshot) => snapshot.technicianId === selectedTechnicianId) ?? null;
  const selectedSkills = selectedTechnicianId ? skills.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const selectedCertifications = selectedTechnicianId ? certifications.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const selectedCompensation = selectedTechnicianId ? compensationMap.get(selectedTechnicianId) ?? null : null;
  const selectedNotes = selectedTechnicianId ? notes.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const selectedAssignments = selectedTechnicianId ? assignments.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const selectedTimeEntries = selectedTechnicianId ? timeEntries.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const selectedScheduleEvents = selectedTechnicianId ? scheduleEvents.filter((item) => item.technician_id === selectedTechnicianId) : [];
  const canViewSelectedCompensation = Boolean(selectedTechnicianId && (canManage || currentUserId === selectedTechnicianId));
  const canEditSelectedCompensation = canManage;

  const addCandidates = useMemo(() => profiles.filter((profile) => !technicianIds.has(profile.id)).sort((a, b) => technicianName(a.full_name, a.email).localeCompare(technicianName(b.full_name, b.email))), [profiles, technicianIds]);

  const showNotice = useCallback((type: ActionNoticeState["type"], message: string) => setActionNotice({ type, message }), []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const loadTeam = useCallback(async (silent = false) => {
    setError(null);
    if (!silent) setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    setAuthRequired(false);
    setCurrentUserId(authData.user.id);

    const [
      profilesResult,
      rolesResult,
      technicianProfilesResult,
      skillsResult,
      certificationsResult,
      compensationResult,
      notesResult,
      workOrdersResult,
      assignmentsResult,
      timeEntriesResult,
      scheduleEventsResult,
      customersResult,
      sitesResult,
    ] = await Promise.all([
      supabase.from("profiles").select(profileSelect).order("full_name"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("technician_profiles").select(technicianProfileSelect),
      supabase.from("technician_skills").select(skillSelect).order("skill_name"),
      supabase.from("technician_certifications").select(certificationSelect).order("certification_name"),
      supabase.from("technician_compensation").select(compensationSelect),
      supabase.from("technician_notes").select(noteSelect).order("created_at", { ascending: false }),
      supabase.from("work_orders").select(workOrderSelect).order("requested_at", { ascending: false }),
      supabase.from("work_order_assignments").select(assignmentSelect).order("assigned_at", { ascending: false }),
      supabase.from("time_entries").select(timeEntrySelect).order("started_at", { ascending: false }),
      supabase.from("technician_schedule_events").select(scheduleEventSelect).order("starts_at", { ascending: true }),
      supabase.from("customers").select("id,name").order("name"),
      supabase.from("sites").select("id,customer_id,name,city").order("name"),
    ]);

    const results = [profilesResult, rolesResult, technicianProfilesResult, skillsResult, certificationsResult, compensationResult, notesResult, workOrdersResult, assignmentsResult, timeEntriesResult, scheduleEventsResult, customersResult, sitesResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProfiles((profilesResult.data ?? []) as unknown as DbProfile[]);
    setRoles((rolesResult.data ?? []) as unknown as DbRole[]);
    setTechnicianProfiles((technicianProfilesResult.data ?? []) as unknown as DbTechnicianProfile[]);
    setSkills((skillsResult.data ?? []) as unknown as DbTechnicianSkill[]);
    setCertifications((certificationsResult.data ?? []) as unknown as DbTechnicianCertification[]);
    setCompensation((compensationResult.data ?? []) as unknown as DbTechnicianCompensation[]);
    setNotes((notesResult.data ?? []) as unknown as DbTechnicianNote[]);
    setWorkOrders((workOrdersResult.data ?? []) as unknown as DbWorkOrder[]);
    setAssignments((assignmentsResult.data ?? []) as unknown as DbAssignment[]);
    setTimeEntries((timeEntriesResult.data ?? []) as unknown as DbTimeEntry[]);
    setScheduleEvents((scheduleEventsResult.data ?? []) as unknown as DbScheduleEvent[]);
    setCustomers((customersResult.data ?? []) as unknown as DbCustomer[]);
    setSites((sitesResult.data ?? []) as unknown as DbSite[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadTeam(); }, [loadTeam]);

  useEffect(() => {
    if (authRequired) return;
    let timer: number | null = null;
    const refreshSoon = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadTeam(true), 250);
    };
    const channel = supabase
      .channel("fieldops-field-team-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_profiles" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_skills" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_certifications" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_compensation" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_notes" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_schedule_events" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_order_assignments" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, refreshSoon)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [authRequired, loadTeam, supabase]);

  function openTechnician(technicianId: string) {
    setSelectedTechnicianId(technicianId);
    setDetailTab("overview");
  }

  function openEditTechnician() {
    if (!selectedProfile) return;
    const techProfile = selectedTechnicianProfile;
    setTechnicianForm({
      fullName: selectedProfile.full_name ?? "",
      phone: selectedProfile.phone ?? "",
      active: selectedProfile.active,
      employeeNumber: techProfile?.employee_number ?? "",
      jobTitle: techProfile?.job_title ?? "",
      employmentType: techProfile?.employment_type ?? "full_time",
      hireDate: techProfile?.hire_date ?? "",
      specialty: techProfile?.specialty ?? "",
      serviceArea: techProfile?.service_area ?? "",
      homeBase: techProfile?.home_base ?? "",
      shiftStart: techProfile?.shift_start?.slice(0, 5) ?? "07:00",
      shiftEnd: techProfile?.shift_end?.slice(0, 5) ?? "17:00",
    });
    setTechnicianFormError(null);
    setEditOpen(true);
  }

  async function saveTechnician() {
    if (!selectedTechnicianId) return;
    if (technicianForm.fullName.trim().length < 2) {
      setTechnicianFormError("Enter the technician's full name.");
      return;
    }
    if (!technicianForm.shiftStart || !technicianForm.shiftEnd || technicianForm.shiftEnd <= technicianForm.shiftStart) {
      setTechnicianFormError("Shift end must be later than shift start.");
      return;
    }
    setSavingTechnician(true);
    setTechnicianFormError(null);
    showNotice("info", "Saving technician profile…");
    const { error: rpcError } = await supabase.rpc("fieldops_update_technician", {
      p_technician_id: selectedTechnicianId,
      p_full_name: technicianForm.fullName.trim(),
      p_phone: technicianForm.phone.trim() || null,
      p_active: technicianForm.active,
      p_employee_number: technicianForm.employeeNumber.trim() || null,
      p_job_title: technicianForm.jobTitle.trim() || null,
      p_employment_type: technicianForm.employmentType,
      p_hire_date: technicianForm.hireDate || null,
      p_specialty: technicianForm.specialty.trim() || null,
      p_service_area: technicianForm.serviceArea.trim() || null,
      p_home_base: technicianForm.homeBase.trim() || null,
      p_shift_start: technicianForm.shiftStart,
      p_shift_end: technicianForm.shiftEnd,
    });
    setSavingTechnician(false);
    if (rpcError) {
      setTechnicianFormError(rpcError.message);
      showNotice("error", `Technician update failed: ${rpcError.message}`);
      return;
    }
    setEditOpen(false);
    await loadTeam();
    showNotice("success", "Technician profile updated successfully.");
  }

  function openAddTechnician() {
    setAddTechnicianForm({ ...emptyAddTechnicianForm, userId: addCandidates[0]?.id ?? "" });
    setAddTechnicianError(null);
    setAddTechnicianOpen(true);
  }

  async function saveAddTechnician() {
    if (!addTechnicianForm.userId) {
      setAddTechnicianError("Select an existing FieldOps user.");
      return;
    }
    if (!addTechnicianForm.shiftStart || !addTechnicianForm.shiftEnd || addTechnicianForm.shiftEnd <= addTechnicianForm.shiftStart) {
      setAddTechnicianError("Shift end must be later than shift start.");
      return;
    }
    setAddingTechnician(true);
    setAddTechnicianError(null);
    showNotice("info", "Adding technician…");
    const { error: rpcError } = await supabase.rpc("fieldops_enable_technician", {
      p_user_id: addTechnicianForm.userId,
      p_specialty: addTechnicianForm.specialty.trim() || null,
      p_service_area: addTechnicianForm.serviceArea.trim() || null,
      p_shift_start: addTechnicianForm.shiftStart,
      p_shift_end: addTechnicianForm.shiftEnd,
    });
    setAddingTechnician(false);
    if (rpcError) {
      setAddTechnicianError(rpcError.message);
      showNotice("error", `Add technician failed: ${rpcError.message}`);
      return;
    }
    const newId = addTechnicianForm.userId;
    setAddTechnicianOpen(false);
    await loadTeam();
    setSelectedTechnicianId(newId);
    setDetailTab("overview");
    showNotice("success", "Technician was added to the Field Team.");
  }

  function openAddSkill() {
    setSkillForm(emptySkillForm);
    setSkillError(null);
    setSkillOpen(true);
  }

  async function saveSkill() {
    if (!selectedTechnicianId) return;
    const skillName = skillForm.skillName.trim();
    if (skillName.length < 2) {
      setSkillError("Enter a skill name.");
      return;
    }
    setSavingSkill(true);
    const { error: insertError } = await supabase.from("technician_skills").insert({
      technician_id: selectedTechnicianId,
      skill_name: skillName,
      proficiency: skillForm.proficiency,
      active: true,
      notes: skillForm.notes.trim() || null,
      created_by: currentUserId,
    });
    setSavingSkill(false);
    if (insertError) {
      setSkillError(insertError.message);
      showNotice("error", `Skill failed: ${insertError.message}`);
      return;
    }
    setSkillOpen(false);
    await loadTeam();
    showNotice("success", `${skillName} was added and synchronized to Dispatch skill tags.`);
  }

  async function deactivateSkill(skill: DbTechnicianSkill) {
    if (!window.confirm(`Deactivate skill "${skill.skill_name}"?`)) return;
    const { error: updateError } = await supabase.from("technician_skills").update({ active: false }).eq("id", skill.id);
    if (updateError) {
      showNotice("error", `Skill update failed: ${updateError.message}`);
      return;
    }
    await loadTeam();
    showNotice("success", `${skill.skill_name} was deactivated.`);
  }

  function openAddCertification() {
    setCertificationForm(emptyCertificationForm);
    setCertificationError(null);
    setCertificationOpen(true);
  }

  async function saveCertification() {
    if (!selectedTechnicianId) return;
    const name = certificationForm.certificationName.trim();
    if (name.length < 2) {
      setCertificationError("Enter a certification name.");
      return;
    }
    if (certificationForm.issuedOn && certificationForm.expiresOn && certificationForm.expiresOn < certificationForm.issuedOn) {
      setCertificationError("Certification expiry cannot be earlier than the issue date.");
      return;
    }
    setSavingCertification(true);
    const { error: insertError } = await supabase.from("technician_certifications").insert({
      technician_id: selectedTechnicianId,
      certification_name: name,
      issuer: certificationForm.issuer.trim() || null,
      credential_number: certificationForm.credentialNumber.trim() || null,
      issued_on: certificationForm.issuedOn || null,
      expires_on: certificationForm.expiresOn || null,
      active: true,
      notes: certificationForm.notes.trim() || null,
      created_by: currentUserId,
    });
    setSavingCertification(false);
    if (insertError) {
      setCertificationError(insertError.message);
      showNotice("error", `Certification failed: ${insertError.message}`);
      return;
    }
    setCertificationOpen(false);
    await loadTeam();
    showNotice("success", `${name} was added.`);
  }

  async function deactivateCertification(certification: DbTechnicianCertification) {
    if (!window.confirm(`Deactivate certification "${certification.certification_name}"?`)) return;
    const { error: updateError } = await supabase.from("technician_certifications").update({ active: false }).eq("id", certification.id);
    if (updateError) {
      showNotice("error", `Certification update failed: ${updateError.message}`);
      return;
    }
    await loadTeam();
    showNotice("success", `${certification.certification_name} was deactivated.`);
  }

  function openAddScheduleEvent() {
    setScheduleEventForm({ ...emptyScheduleEventForm, date: dateInput(new Date()) });
    setScheduleEventError(null);
    setScheduleEventOpen(true);
  }

  async function saveScheduleEvent() {
    if (!selectedTechnicianId) return;
    if (!scheduleEventForm.title.trim()) {
      setScheduleEventError("Enter an event title.");
      return;
    }
    if (!scheduleEventForm.date || !scheduleEventForm.startTime || !scheduleEventForm.endTime) {
      setScheduleEventError("Enter date, start time, and end time.");
      return;
    }
    const start = localDateTime(scheduleEventForm.date, scheduleEventForm.startTime);
    const end = localDateTime(scheduleEventForm.date, scheduleEventForm.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setScheduleEventError("Event end must be later than event start.");
      return;
    }

    const assignmentConflict = selectedAssignments.some((assignment) =>
      !["removed", "declined", "completed"].includes(assignment.assignment_status) &&
      assignment.released_at === null &&
      eventOverlaps(start, end, assignment.scheduled_start, assignment.scheduled_end)
    );
    const eventConflict = selectedScheduleEvents.some((event) => eventOverlaps(start, end, event.starts_at, event.ends_at));
    const actualConflict = selectedTimeEntries.some((entry) => eventOverlaps(start, end, entry.started_at, entry.ended_at ?? new Date().toISOString()));
    if (assignmentConflict || eventConflict || actualConflict) {
      setScheduleEventError("This event overlaps existing assigned work, actual time, or another schedule event. Reschedule the conflict first.");
      return;
    }

    setSavingScheduleEvent(true);
    const { error: insertError } = await supabase.from("technician_schedule_events").insert({
      technician_id: selectedTechnicianId,
      event_type: scheduleEventForm.eventType,
      title: scheduleEventForm.title.trim(),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      notes: scheduleEventForm.notes.trim() || null,
      created_by: currentUserId,
    });
    setSavingScheduleEvent(false);
    if (insertError) {
      setScheduleEventError(insertError.message);
      showNotice("error", `Schedule event failed: ${insertError.message}`);
      return;
    }
    setScheduleEventOpen(false);
    await loadTeam();
    showNotice("success", "Schedule event was added successfully.");
  }

  async function deleteScheduleEvent(event: DbScheduleEvent) {
    if (!window.confirm(`Delete schedule event "${event.title}"?`)) return;
    const { error: deleteError } = await supabase.from("technician_schedule_events").delete().eq("id", event.id);
    if (deleteError) {
      showNotice("error", `Schedule event delete failed: ${deleteError.message}`);
      return;
    }
    await loadTeam();
    showNotice("success", "Schedule event was deleted.");
  }

  function openCompensation() {
    const item = selectedCompensation;
    setCompensationForm({
      billingRate: item?.billing_rate === null || item?.billing_rate === undefined ? "" : String(item.billing_rate),
      payRate: item?.pay_rate === null || item?.pay_rate === undefined ? "" : String(item.pay_rate),
      currency: item?.currency ?? "CAD",
    });
    setCompensationError(null);
    setCompensationOpen(true);
  }

  async function saveCompensation() {
    if (!selectedTechnicianId) return;
    const billingRate = compensationForm.billingRate.trim() === "" ? null : Number(compensationForm.billingRate);
    const payRate = compensationForm.payRate.trim() === "" ? null : Number(compensationForm.payRate);
    if ((billingRate !== null && (!Number.isFinite(billingRate) || billingRate < 0)) || (payRate !== null && (!Number.isFinite(payRate) || payRate < 0))) {
      setCompensationError("Billing and pay rates must be valid non-negative numbers.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(compensationForm.currency.trim().toUpperCase())) {
      setCompensationError("Currency must be a three-letter code such as CAD or USD.");
      return;
    }
    setSavingCompensation(true);
    const { error: upsertError } = await supabase.from("technician_compensation").upsert({
      technician_id: selectedTechnicianId,
      billing_rate: billingRate,
      pay_rate: payRate,
      currency: compensationForm.currency.trim().toUpperCase(),
      updated_by: currentUserId,
    }, { onConflict: "technician_id" });
    setSavingCompensation(false);
    if (upsertError) {
      setCompensationError(upsertError.message);
      showNotice("error", `Rate update failed: ${upsertError.message}`);
      return;
    }
    setCompensationOpen(false);
    await loadTeam();
    showNotice("success", "Default technician rates updated successfully.");
  }

  function openAddNote() {
    setNoteText("");
    setNoteError(null);
    setNoteOpen(true);
  }

  async function saveNote() {
    if (!selectedTechnicianId) return;
    const note = noteText.trim();
    if (note.length < 3) {
      setNoteError("Enter a meaningful technician note.");
      return;
    }
    setSavingNote(true);
    const { error: insertError } = await supabase.from("technician_notes").insert({ technician_id: selectedTechnicianId, note, created_by: currentUserId });
    setSavingNote(false);
    if (insertError) {
      setNoteError(insertError.message);
      showNotice("error", `Technician note failed: ${insertError.message}`);
      return;
    }
    setNoteOpen(false);
    setNoteText("");
    await loadTeam();
    showNotice("success", "Technician note was added successfully.");
  }

  const availableNow = technicianSnapshots.filter((tech) => tech.status === "Available").length;
  const activeJobs = technicianSnapshots.filter((tech) => tech.currentWorkOrderId !== null && !["Available", "Off Shift", "Inactive"].includes(tech.status)).length;
  const overtimeMinutes = technicianSnapshots.reduce((sum, tech) => sum + tech.weekOvertimeMinutes, 0);
  const certificationAlerts = certifications.filter((certification) => certificationState(certification, new Date(nowMs ?? 0)).alert).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ActionNotice notice={actionNotice} onClose={() => setActionNotice(null)} />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar xl:flex">
        <CompanyBrand className="h-[72px] border-b border-border px-4" />
        <nav className="flex-1 space-y-1 p-3">{navigation.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"}`}><Icon className="h-[18px] w-[18px]" />{item.label}</Link>; })}</nav>
      </aside>

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border bg-topbar px-4 backdrop-blur-xl lg:px-6">
          <div className="hidden max-w-xl flex-1 md:block"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-border bg-input-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10" placeholder="Search technicians, skills, service areas..." /></div></div>
          <div className="ml-auto flex items-center gap-2"><FieldOpsThemeToggle /><button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><Bell className="h-4 w-4" /></button></div>
        </header>

        <div className="px-4 py-5 lg:px-6">
          <section className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="text-sm font-semibold text-primary">Field Team</div><h1 className="mt-1 text-2xl font-black">Technician Management</h1><p className="mt-1 text-sm text-muted-foreground">People, skills, schedules, actual time, outside-shift work, certifications, and field readiness.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void loadTeam()} className="inline-flex h-10 items-center gap-2 border border-border bg-card px-3 text-xs font-black"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>{isAdmin && <button type="button" onClick={openAddTechnician} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-sm font-black text-primary-foreground"><Plus className="h-4 w-4" />Add Technician</button>}</div>
          </section>

          {authRequired ? (
            <section className="border border-border bg-card p-8 text-center"><h2 className="text-xl font-black">Sign in to load Field Team records</h2><Link href="/auth/login" className="mt-5 inline-flex h-10 items-center bg-primary px-5 text-sm font-black text-primary-foreground">Sign in</Link></section>
          ) : <>
            {error && <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
            <FieldTeamSummaryCards totalTechnicians={technicianSnapshots.length} availableNow={availableNow} activeJobs={activeJobs} overtimeMinutes={overtimeMinutes} certificationAlerts={certificationAlerts} onView={setSummaryView} />

            <section className="mt-5 border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="font-black">Technician Directory</h2><div className="mt-1 text-xs text-muted-foreground">{filteredTechnicians.length} of {technicianSnapshots.length} technicians</div></div>
                <div className="flex flex-wrap gap-2">
                  <label className="relative min-w-[260px] flex-1 md:hidden"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Search technicians..." /></label>
                  <label className="flex h-10 items-center gap-2 border border-border bg-background px-3"><Filter className="h-3.5 w-3.5 text-muted-foreground" /><select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value as typeof accountFilter)} className="bg-transparent text-xs font-black outline-none"><option value="all">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                  <label className="flex h-10 items-center gap-2 border border-border bg-background px-3"><select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value as typeof availabilityFilter)} className="bg-transparent text-xs font-black outline-none"><option value="all">All availability</option><option value="available">Available now</option><option value="busy">On work now</option><option value="unavailable">Unavailable / event</option><option value="off_shift">Off shift</option></select></label>
                </div>
              </div>
              {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading Field Team…</div> : <TechnicianTable technicians={filteredTechnicians} onOpen={openTechnician} />}
            </section>
          </>}
        </div>
      </div>

      <FieldTeamSummaryModal view={summaryView} technicians={technicianSnapshots} certifications={certifications} profileMap={profileMap} onOpenTechnician={openTechnician} onClose={() => setSummaryView(null)} />
      <TechnicianDetailModal
        profile={selectedProfile}
        technicianProfile={selectedTechnicianProfile}
        snapshot={selectedSnapshot}
        tab={detailTab}
        skills={selectedSkills}
        certifications={selectedCertifications}
        compensation={selectedCompensation}
        notes={selectedNotes}
        assignments={selectedAssignments}
        timeEntries={selectedTimeEntries}
        scheduleEvents={selectedScheduleEvents}
        workOrderMap={workOrderMap}
        customerMap={customerMap}
        siteMap={siteMap}
        profileMap={profileMap}
        canManage={canManage}
        canSchedule={canSchedule}
        canAddNote={canAddNote}
        canViewCompensation={canViewSelectedCompensation}
        canEditCompensation={canEditSelectedCompensation}
        onTabChange={setDetailTab}
        onEdit={openEditTechnician}
        onEditCompensation={openCompensation}
        onAddSkill={openAddSkill}
        onAddCertification={openAddCertification}
        onDeactivateSkill={(skill) => void deactivateSkill(skill)}
        onDeactivateCertification={(certification) => void deactivateCertification(certification)}
        onAddScheduleEvent={openAddScheduleEvent}
        onDeleteScheduleEvent={(event) => void deleteScheduleEvent(event)}
        onAddNote={openAddNote}
        onClose={() => setSelectedTechnicianId(null)}
      />
      <TechnicianFormModal open={editOpen} profile={selectedProfile} form={technicianForm} setForm={setTechnicianForm} saving={savingTechnician} error={technicianFormError} onSave={() => void saveTechnician()} onClose={() => { if (!savingTechnician) { setEditOpen(false); setTechnicianFormError(null); } }} />
      <AddTechnicianModal open={addTechnicianOpen} candidates={addCandidates} form={addTechnicianForm} setForm={setAddTechnicianForm} saving={addingTechnician} error={addTechnicianError} onSave={() => void saveAddTechnician()} onClose={() => { if (!addingTechnician) { setAddTechnicianOpen(false); setAddTechnicianError(null); } }} />
      <SkillModal open={skillOpen} form={skillForm} setForm={setSkillForm} saving={savingSkill} error={skillError} onSave={() => void saveSkill()} onClose={() => { if (!savingSkill) { setSkillOpen(false); setSkillError(null); } }} />
      <CertificationModal open={certificationOpen} form={certificationForm} setForm={setCertificationForm} saving={savingCertification} error={certificationError} onSave={() => void saveCertification()} onClose={() => { if (!savingCertification) { setCertificationOpen(false); setCertificationError(null); } }} />
      <ScheduleEventModal open={scheduleEventOpen} form={scheduleEventForm} setForm={setScheduleEventForm} saving={savingScheduleEvent} error={scheduleEventError} onSave={() => void saveScheduleEvent()} onClose={() => { if (!savingScheduleEvent) { setScheduleEventOpen(false); setScheduleEventError(null); } }} />
      <CompensationModal open={compensationOpen} form={compensationForm} setForm={setCompensationForm} saving={savingCompensation} error={compensationError} onSave={() => void saveCompensation()} onClose={() => { if (!savingCompensation) { setCompensationOpen(false); setCompensationError(null); } }} />
      <AddTechnicianNoteModal open={noteOpen} value={noteText} saving={savingNote} error={noteError} onChange={setNoteText} onSave={() => void saveNote()} onClose={() => { if (!savingNote) { setNoteOpen(false); setNoteError(null); } }} />
    </main>
  );
}
