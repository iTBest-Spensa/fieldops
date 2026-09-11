// Dispatch-specific domain/data types.

export type ActivityStatus =
  | "complete"
  | "travelling"
  | "on_site"
  | "working"
  | "assigned"
  | "available"
  | "break";

export type Segment = {
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
  actual?: boolean;
  openActual?: boolean;
  activityType?: string;
  billable?: boolean;
  plannedStart?: number;
  plannedEnd?: number;
  overrun?: boolean;
  secondaryLane?: boolean;
};

export type ScheduleItem = {
  time: string;
  id: string;
  title: string;
  status: string;
  workOrderUuid?: string;
};

export type WaitingJob = {
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

export type OvertimeRange = {
  start: number;
  end: number;
};

export type OvertimeItem = {
  technicianUuid: string;
  technicianName: string;
  workOrderUuid: string;
  assignmentId: string;
  id: string;
  title: string;
  customer: string;
  place: string;
  status: ActivityStatus;
  fullTime: string;
  overtimeTime: string;
  overtimeRanges: OvertimeRange[];
  overrun: boolean;
  sortTime: number;
};

export type Technician = {
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
  overtime: OvertimeItem[];
  today: ScheduleItem[];
  week: Record<string, ScheduleItem[]>;
};

export type DragJobPayload = {
  kind: "waiting" | "assigned";
  jobUuid: string;
  sourceTechnicianUuid?: string;
  assignmentId?: string;
};

export type AssignmentModal = {
  mode: "assign" | "move";
  job: WaitingJob;
  tech: Technician;
  sourceTechnicianUuid?: string;
  assignmentId?: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type DbWorkOrder = {
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

export type DbAssignment = {
  id: string;
  work_order_id: string;
  technician_id: string;
  assignment_role: string;
  assignment_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  accepted_at: string | null;
  released_at: string | null;
  pending_activity_type: string | null;
};

export type DbTimeEntry = {
  id: string;
  work_order_id: string;
  technician_id: string;
  assignment_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  activity_type: string;
  billable: boolean;
  billing_rate: number | null;
  pay_rate: number | null;
  approval_status: string;
  ended_reason: string | null;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
};

export type DbRole = {
  user_id: string;
  role: string;
};

export type DbCustomer = {
  id: string;
  name: string;
};

export type DbSite = {
  id: string;
  name: string;
  city: string | null;
  customer_id: string;
};

export type NewWorkOrderForm = {
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

export type DbTechProfile = {
  technician_id: string;
  specialty: string | null;
  skill_tags: string[] | null;
  service_area: string | null;
  shift_start: string | null;
  shift_end: string | null;
};

export type DbScheduleEvent = {
  id: string;
  technician_id: string;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  work_order_id: string | null;
  notes: string | null;
};
