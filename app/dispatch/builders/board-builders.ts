import type {
  ActivityStatus,
  DbAssignment,
  DbCustomer,
  DbProfile,
  DbRole,
  DbScheduleEvent,
  DbSite,
  DbTechProfile,
  DbTimeEntry,
  DbWorkOrder,
  OvertimeItem,
  OvertimeRange,
  ScheduleItem,
  Segment,
  WaitingJob,
} from "../types";

import {
  BOARD_END_HOUR,
  BOARD_START_HOUR,
  priorityTone,
  statusColors,
  statusTone,
} from "../constants";

import {
  capitalize,
  clamp,
  dateAtHour,
  dateToDecimalHour,
  datesOverlap,
  formatClock,
  formatDateInput,
  formatLocalTime,
  getDayWindow,
  getWeekWindow,
  initials,
  normalizeTags,
  normalizeText,
  rangesOverlap,
} from "../utils";

export function buildLiveBoard(args: {
  selectedDate: string;
  profiles: DbProfile[];
  roles: DbRole[];
  techProfiles: DbTechProfile[];
  customers: DbCustomer[];
  sites: DbSite[];
  workOrders: DbWorkOrder[];
  assignments: DbAssignment[];
  timeEntries: DbTimeEntry[];
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
    timeEntries,
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
        ["requested", "planned", "assigned"].includes(
          workOrder.status
        ) &&
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
      const techTimeEntries = timeEntries.filter(
        (entry) => entry.technician_id === profile.id
      );

      const dayTrack = buildTrackForDate({
        selectedDate,
        assignments: techAssignments,
        timeEntries: techTimeEntries,
        events: techEvents,
        workOrderMap,
        customerMap,
        siteMap,
      });

      const name =
        profile.full_name?.trim() || profile.email || "Unnamed Technician";

      const overtime = buildOvertimeForDate({
        selectedDate,
        technicianUuid: profile.id,
        technicianName: name,
        assignments: techAssignments,
        timeEntries: techTimeEntries,
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
      const dispatchFitByJob = Object.fromEntries(
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

      const confidenceByJob = Object.fromEntries(
        Object.entries(dispatchFitByJob).map(([jobUuid, fit]) => [
          jobUuid,
          fit.score,
        ])
      );
      return {
        uuid: profile.id,
        initials: initials(name),
        name,
        role: techProfile?.specialty?.trim() || "Technician",
        status,
        statusTone: statusTone[status] ?? statusTone.AVAILABLE,
        confidenceByJob,
        dispatchFitByJob,
        confidence: 0,
        rank: 0,
        track: dayTrack,
        overtime,
        today,
        week,
      };
    });

  return { waitingJobs, allJobs, technicians: provisional };
}

function buildOvertimeForDate(args: {
  selectedDate: string;
  technicianUuid: string;
  technicianName: string;
  assignments: DbAssignment[];
  timeEntries: DbTimeEntry[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
}) {
  const {
    selectedDate,
    technicianUuid,
    technicianName,
    assignments,
    timeEntries,
    workOrderMap,
    customerMap,
    siteMap,
  } = args;

  const dayWindow = getDayWindow(selectedDate);
  const items: OvertimeItem[] = [];

  function getOvertimeRanges(
    start: Date,
    end: Date
  ): OvertimeRange[] {
    if (
      !datesOverlap(
        start,
        end,
        dayWindow.start,
        dayWindow.end
      )
    ) {
      return [];
    }

    const dayStart =
      start < dayWindow.start
        ? dayWindow.start
        : start;
    const dayEnd =
      end > dayWindow.end
        ? dayWindow.end
        : end;

    const startHour =
      dateToDecimalHour(dayStart);
    const endHour =
      dayEnd.getTime() === dayWindow.end.getTime()
        ? 24
        : dateToDecimalHour(dayEnd);

    const ranges: OvertimeRange[] = [];

    const beforeStart = startHour;
    const beforeEnd = Math.min(
      endHour,
      BOARD_START_HOUR
    );

    if (beforeStart < beforeEnd) {
      ranges.push({
        start: beforeStart,
        end: beforeEnd,
      });
    }

    const afterStart = Math.max(
      startHour,
      BOARD_END_HOUR
    );
    const afterEnd = endHour;

    if (afterStart < afterEnd) {
      ranges.push({
        start: afterStart,
        end: afterEnd,
      });
    }

    return ranges;
  }

  function addOvertimeItem(args: {
    workOrder: DbWorkOrder;
    assignmentId: string;
    start: Date;
    end: Date;
    status: ActivityStatus;
    overrun: boolean;
  }) {
    const {
      workOrder,
      assignmentId,
      start,
      end,
      status,
      overrun,
    } = args;

    const overtimeRanges =
      getOvertimeRanges(start, end);

    if (overtimeRanges.length === 0) {
      return;
    }

    const customer = customerMap.get(
      workOrder.customer_id
    );
    const site = workOrder.site_id
      ? siteMap.get(workOrder.site_id)
      : null;

    items.push({
      technicianUuid,
      technicianName,
      workOrderUuid: workOrder.id,
      assignmentId,
      id: workOrder.work_order_number,
      title: workOrder.title,
      customer:
        customer?.name ??
        "Unknown customer",
      place:
        workOrder.service_area ??
        site?.city ??
        site?.name ??
        "No service area",
      status,
      fullTime: `${formatLocalTime(
        start
      )}–${formatLocalTime(end)}`,
      overtimeTime: overtimeRanges
        .map(
          (range) =>
            `${formatClock(
              range.start
            )}–${formatClock(range.end)}`
        )
        .join(" / "),
      overtimeRanges,
      overrun,
      sortTime: start.getTime(),
    });
  }

  // Keep every original scheduled overtime period.
  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(
      assignment.work_order_id
    );
    if (!workOrder) continue;

    const startIso =
      assignment.scheduled_start ??
      workOrder.scheduled_start;
    const endIso =
      assignment.scheduled_end ??
      workOrder.scheduled_end;

    if (!startIso || !endIso) continue;

    addOvertimeItem({
      workOrder,
      assignmentId: assignment.id,
      start: new Date(startIso),
      end: new Date(endIso),
      status: mapWorkOrderStatus(
        workOrder.status
      ),
      overrun: false,
    });
  }

  // Add only the part of actual work that exceeds the planned end.
  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(
      assignment.work_order_id
    );
    if (!workOrder) continue;

    const plannedEndIso =
      assignment.scheduled_end ??
      workOrder.scheduled_end;

    if (!plannedEndIso) continue;

    const plannedEnd =
      new Date(plannedEndIso);

    const relatedEntries =
      timeEntries.filter(
        (entry) =>
          entry.work_order_id ===
            assignment.work_order_id &&
          (
            entry.assignment_id ===
              assignment.id ||
            (
              entry.assignment_id === null &&
              entry.technician_id ===
                assignment.technician_id
            )
          )
      );

    if (relatedEntries.length === 0) {
      continue;
    }

    const latestActualEnd =
      relatedEntries.reduce<Date | null>(
        (latest, entry) => {
          const actualEnd = entry.ended_at
            ? new Date(entry.ended_at)
            : new Date();

          return !latest ||
            actualEnd > latest
            ? actualEnd
            : latest;
        },
        null
      );

    if (
      !latestActualEnd ||
      latestActualEnd <= plannedEnd
    ) {
      continue;
    }

    addOvertimeItem({
      workOrder,
      assignmentId: assignment.id,
      start: plannedEnd,
      end: latestActualEnd,
      status: "working",
      overrun: true,
    });
  }

  return items.sort(
    (a, b) => a.sortTime - b.sortTime
  );
}

function buildTrackForDate(args: {
  selectedDate: string;
  assignments: DbAssignment[];
  timeEntries: DbTimeEntry[];
  events: DbScheduleEvent[];
  workOrderMap: Map<string, DbWorkOrder>;
  customerMap: Map<string, DbCustomer>;
  siteMap: Map<string, DbSite>;
}) {
  const {
    selectedDate,
    assignments,
    timeEntries,
    events,
    workOrderMap,
    customerMap,
    siteMap,
  } = args;

  const window = getDayWindow(selectedDate);
  const track: Segment[] = [];

  // ----------------------------------------------------------------
  // PLANNED SCHEDULE IS ALWAYS PRESERVED.
  // Actual technician time never replaces the original planned line.
  // ----------------------------------------------------------------
  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(assignment.work_order_id);
    if (!workOrder) continue;

    const startIso =
      assignment.scheduled_start ?? workOrder.scheduled_start;
    const endIso =
      assignment.scheduled_end ?? workOrder.scheduled_end;

    if (!startIso || !endIso) continue;

    const start = new Date(startIso);
    const end = new Date(endIso);

    if (!datesOverlap(start, end, window.start, window.end)) {
      continue;
    }

    const clippedStart =
      start < window.start ? window.start : start;
    const clippedEnd =
      end > window.end ? window.end : end;

    const customer = customerMap.get(workOrder.customer_id);
    const site = workOrder.site_id
      ? siteMap.get(workOrder.site_id)
      : null;

    const clippedStartHour = dateToDecimalHour(clippedStart);
    const clippedEndHour =
      clippedEnd.getTime() === window.end.getTime()
        ? 24
        : dateToDecimalHour(clippedEnd);

    track.push({
      start: clippedStartHour,
      end: clippedEndHour,
      id: workOrder.work_order_number,
      title: workOrder.title,
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      status: mapWorkOrderStatus(workOrder.status),
      labelSide: track.length % 2 === 0 ? "top" : "bottom",
      customer: customer?.name,
      place:
        workOrder.service_area ??
        site?.city ??
        site?.name ??
        undefined,
      priority: capitalize(workOrder.priority),
      description: workOrder.description ?? undefined,
      workOrderUuid: workOrder.id,
      assignmentId: assignment.id,
      sourceStartAt: start.toISOString(),
      sourceEndAt: end.toISOString(),
      actual: false,
      plannedStart: dateToDecimalHour(start),
      plannedEnd: dateToDecimalHour(end),
      overrun: false,
    });
  }

  // ----------------------------------------------------------------
  // ACTUAL TIME ENTRIES = REAL STATUS SEGMENTS.
  //
  // The planned assignment remains visible, but real technician
  // lifecycle segments are also drawn from time_entries so Travel,
  // On Site, Working, Waiting and Break are not lost when a Work Order
  // later becomes Finished / Billing Ready / Closed.
  //
  // If actual activity continues past the planned end, the normal
  // status segment stops at planned end and the existing RED overrun
  // segment owns the remainder.
  // ----------------------------------------------------------------
  for (const entry of timeEntries) {
    const workOrder = workOrderMap.get(entry.work_order_id);
    if (!workOrder) continue;

    const rawStart = new Date(entry.started_at);
    const rawEnd = entry.ended_at ? new Date(entry.ended_at) : new Date();

    if (!datesOverlap(rawStart, rawEnd, window.start, window.end)) {
      continue;
    }

    const matchingAssignment =
      (entry.assignment_id
        ? assignments.find((assignment) => assignment.id === entry.assignment_id)
        : undefined) ??
      assignments.find(
        (assignment) => assignment.work_order_id === entry.work_order_id
      );

    const plannedEndIso =
      matchingAssignment?.scheduled_end ?? workOrder.scheduled_end;
    const plannedEnd = plannedEndIso ? new Date(plannedEndIso) : null;

    // Time after planned end is already represented by the RED
    // overrun line below. Do not draw a duplicate actual line there.
    if (plannedEnd && rawStart >= plannedEnd) {
      continue;
    }

    const normalEnd =
      plannedEnd && rawEnd > plannedEnd ? plannedEnd : rawEnd;

    if (normalEnd <= rawStart) {
      continue;
    }

    const clippedStart =
      rawStart < window.start ? window.start : rawStart;
    const clippedEnd =
      normalEnd > window.end ? window.end : normalEnd;

    const customer = customerMap.get(workOrder.customer_id);
    const site = workOrder.site_id
      ? siteMap.get(workOrder.site_id)
      : null;

    const displayStartHour = dateToDecimalHour(clippedStart);
    const displayEndHour =
      clippedEnd.getTime() === window.end.getTime()
        ? 24
        : dateToDecimalHour(clippedEnd);

    const clippedByPlannedEnd =
      plannedEnd !== null && rawEnd > plannedEnd;
    const isOpen =
      entry.ended_at === null && !clippedByPlannedEnd;

    track.push({
      start: displayStartHour,
      end: displayEndHour,
      id: workOrder.work_order_number,
      title: workOrder.title,
      time: isOpen
        ? `${formatLocalTime(rawStart)}–NOW`
        : `${formatLocalTime(rawStart)}–${formatLocalTime(normalEnd)}`,
      status: mapTimeEntryActivity(entry.activity_type),
      labelSide: track.length % 2 === 0 ? "top" : "bottom",
      customer: customer?.name,
      place:
        workOrder.service_area ??
        site?.city ??
        site?.name ??
        undefined,
      priority: capitalize(workOrder.priority),
      description: workOrder.description ?? undefined,
      workOrderUuid: workOrder.id,
      assignmentId: entry.assignment_id ?? matchingAssignment?.id,
      timeEntryId: entry.id,
      sourceStartAt: entry.started_at,
      sourceEndAt: entry.ended_at,
      actual: true,
      openActual: isOpen,
      activityType: entry.activity_type,
      billable: entry.billable,
      billingRate: entry.billing_rate,
      payRate: entry.pay_rate,
      plannedStart:
        matchingAssignment?.scheduled_start || workOrder.scheduled_start
          ? dateToDecimalHour(
              new Date(
                matchingAssignment?.scheduled_start ??
                  workOrder.scheduled_start!
              )
            )
          : undefined,
      plannedEnd: plannedEnd
        ? dateToDecimalHour(plannedEnd)
        : undefined,
      overrun: false,
    });
  }
  // ----------------------------------------------------------------
  // OVERRUN = ACTUAL OWNERSHIP CONTINUING BEYOND PLANNED END.
  //
  // Planned line ends at planned end.
  // A separate RED line starts at planned end and continues until the
  // technician actually stopped / transferred / finished / closed.
  // ----------------------------------------------------------------
  for (const assignment of assignments) {
    const workOrder = workOrderMap.get(assignment.work_order_id);
    if (!workOrder) continue;

    const plannedEndIso =
      assignment.scheduled_end ?? workOrder.scheduled_end;

    if (!plannedEndIso) continue;

    const plannedEnd = new Date(plannedEndIso);

    const relatedEntries = timeEntries.filter(
      (entry) =>
        entry.work_order_id === assignment.work_order_id &&
        (
          entry.assignment_id === assignment.id ||
          entry.assignment_id === null
        )
    );

    if (relatedEntries.length === 0) continue;

    const latestActualEnd = relatedEntries.reduce<Date | null>(
      (latest, entry) => {
        const end = entry.ended_at
          ? new Date(entry.ended_at)
          : new Date();

        return !latest || end > latest ? end : latest;
      },
      null
    );

    if (!latestActualEnd || latestActualEnd <= plannedEnd) {
      continue;
    }

    const overrunStart = plannedEnd;
    const overrunEnd = latestActualEnd;

    if (
      !datesOverlap(
        overrunStart,
        overrunEnd,
        window.start,
        window.end
      )
    ) {
      continue;
    }

    const clippedStart =
      overrunStart < window.start ? window.start : overrunStart;
    const clippedEnd =
      overrunEnd > window.end ? window.end : overrunEnd;

    const customer = customerMap.get(workOrder.customer_id);
    const site = workOrder.site_id
      ? siteMap.get(workOrder.site_id)
      : null;

    const hasOpenEntry = relatedEntries.some(
      (entry) => entry.ended_at === null
    );

    const latestRelatedEntry = [...relatedEntries].sort((a, b) => {
      const aEnd = a.ended_at ? new Date(a.ended_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bEnd = b.ended_at ? new Date(b.ended_at).getTime() : Number.MAX_SAFE_INTEGER;
      return bEnd - aEnd;
    })[0];

    const clippedStartHour = dateToDecimalHour(clippedStart);
    const clippedEndHour =
      clippedEnd.getTime() === window.end.getTime()
        ? 24
        : dateToDecimalHour(clippedEnd);

    track.push({
      start: clippedStartHour,
      end: clippedEndHour,
      id: workOrder.work_order_number,
      title: workOrder.title,
      time: hasOpenEntry
        ? `${formatLocalTime(overrunStart)}–NOW`
        : `${formatLocalTime(overrunStart)}–${formatLocalTime(overrunEnd)}`,
      status: "working",
      labelSide: "top",
      customer: customer?.name,
      place:
        workOrder.service_area ??
        site?.city ??
        site?.name ??
        undefined,
      priority: capitalize(workOrder.priority),
      description: workOrder.description ?? undefined,
      workOrderUuid: workOrder.id,
      assignmentId: assignment.id,
      timeEntryId: latestRelatedEntry?.id,
      sourceStartAt: latestRelatedEntry?.started_at,
      sourceEndAt: latestRelatedEntry?.ended_at ?? null,
      actual: true,
      openActual: hasOpenEntry,
      activityType: latestRelatedEntry?.activity_type ?? "work",
      billable: latestRelatedEntry?.billable ?? true,
      billingRate: latestRelatedEntry?.billing_rate ?? null,
      payRate: latestRelatedEntry?.pay_rate ?? null,
      plannedEnd: dateToDecimalHour(plannedEnd),
      overrun: true,
    });
  }

  // Schedule events remain visible as before.
  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    if (!datesOverlap(start, end, window.start, window.end)) {
      continue;
    }

    const clippedStart =
      start < window.start ? window.start : start;
    const clippedEnd =
      end > window.end ? window.end : end;

    const clippedStartHour = dateToDecimalHour(clippedStart);
    const clippedEndHour =
      clippedEnd.getTime() === window.end.getTime()
        ? 24
        : dateToDecimalHour(clippedEnd);

    track.push({
      start: clippedStartHour,
      end: clippedEndHour,
      id: event.event_type.toUpperCase(),
      title: event.title,
      time: `${formatLocalTime(start)}–${formatLocalTime(end)}`,
      status: mapEventStatus(event.event_type),
      labelSide: track.length % 2 === 0 ? "top" : "bottom",
      notes: event.notes ?? undefined,
      overrun: false,
    });
  }

  const clipped = track
    .filter(
      (segment) =>
        segment.end > BOARD_START_HOUR &&
        segment.start < BOARD_END_HOUR
    )
    .map((segment) => ({
      ...segment,
      start: Math.max(BOARD_START_HOUR, segment.start),
      end: Math.min(BOARD_END_HOUR, segment.end),
    }));

  const overruns = clipped.filter(
    (segment) => segment.overrun === true
  );

  // If a scheduled job overlaps a red overrun line, preserve that
  // scheduled job but place it on the lower lane.
  return clipped
    .map((segment) => {
      if (segment.overrun) return segment;

      const overlapsOverrun = overruns.some(
        (overrun) =>
          overrun.workOrderUuid !== segment.workOrderUuid &&
          rangesOverlap(
            segment.start,
            segment.end,
            overrun.start,
            overrun.end
          )
      );

      return {
        ...segment,
        secondaryLane: overlapsOverrun,
      };
    })
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
      workOrderUuid: workOrder.id,
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
  const activeSegments = track.filter(
    (segment) => segment.start <= now && segment.end >= now
  );

  // Prefer real activity over the planned assignment when both occupy
  // the same time. This keeps the technician status badge aligned with
  // Travel / On Site / Working instead of the Work Order's final state.
  const active =
    activeSegments.find((segment) => segment.actual === true) ??
    activeSegments[0];

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
  const endHour =
    startHour + Math.max(job.estimatedDurationMinutes, 15) / 60;

  const conflictingSegments = track
    .filter(
      (segment) =>
        segment.status !== "available" &&
        rangesOverlap(
          startHour,
          endHour,
          segment.start,
          segment.end
        )
    )
    .sort((a, b) => a.start - b.start);

  const conflict = conflictingSegments.length > 0;

  // Schedule / availability = maximum 40 points.
  const availabilityScore = conflict ? 8 : 40;

  // Skills = maximum 35 points.
  const required = normalizeTags(job.requiredSkills);
  const skills = normalizeTags(techProfile?.skill_tags ?? []);
  const matchedSkills = required.filter((requiredSkill) =>
    skills.includes(requiredSkill)
  ).length;

  const skillRatio =
    required.length === 0
      ? null
      : matchedSkills / required.length;

  const skillScore =
    required.length === 0
      ? 24
      : Math.round(35 * (skillRatio ?? 0));

  const skillsMatch =
    required.length === 0
      ? "Not specified"
      : (skillRatio ?? 0) >= 0.75
      ? "Strong"
      : (skillRatio ?? 0) >= 0.5
      ? "Partial"
      : (skillRatio ?? 0) > 0
      ? "Weak"
      : "No match";

  // Service area = maximum 15 points.
  const jobArea = normalizeText(job.serviceArea);
  const techArea = normalizeText(techProfile?.service_area);

  const areaScore =
    !jobArea || !techArea
      ? 10
      : jobArea === techArea
      ? 15
      : 5;

  const serviceArea =
    !jobArea || !techArea
      ? "Not specified"
      : jobArea === techArea
      ? "Match"
      : "Different area";

  // Workload = maximum 10 points.
  // Actual-time lines can coexist with the planned line, so use only
  // planned/scheduled segments here to avoid counting work twice.
  const scheduledHours = track
    .filter(
      (segment) =>
        segment.actual !== true &&
        !["available", "break"].includes(segment.status)
    )
    .reduce(
      (total, segment) =>
        total + Math.max(0, segment.end - segment.start),
      0
    );

  const workloadScore = Math.max(
    0,
    Math.round(
      10 * (1 - Math.min(scheduledHours / 8, 1))
    )
  );

  const workload =
    scheduledHours <= 2
      ? "Low"
      : scheduledHours <= 5
      ? "Moderate"
      : scheduledHours < 8
      ? "High"
      : "Full";

  const uniqueConflicts = Array.from(
    new Set(
      conflictingSegments.map(
        (segment) =>
          `${formatClock(segment.start)}–${formatClock(segment.end)}`
      )
    )
  );

  const timeConflict =
    uniqueConflicts.length === 0
      ? "None"
      : uniqueConflicts.slice(0, 2).join(", ");

  const score = clamp(
    availabilityScore +
      skillScore +
      areaScore +
      workloadScore,
    0,
    100
  );

  return {
    score,
    skillsMatch,
    scheduleFit: conflict ? "Conflict" : "Available",
    serviceArea,
    workload,
    timeConflict,
  };
}
function mapTimeEntryActivity(activityType: string): ActivityStatus {
  switch (activityType) {
    case "travel":
      return "travelling";
    case "on_site":
      return "on_site";
    case "work":
      return "working";
    case "waiting":
      return "break";
    case "break":
      return "break";
    default:
      return "working";
  }
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
