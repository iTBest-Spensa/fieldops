export type WorkOrderStatus =
  | "requested"
  | "planned"
  | "assigned"
  | "travelling"
  | "on_site"
  | "working"
  | "waiting"
  | "finished"
  | "billing_ready"
  | "closed"
  | "cancelled";

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  job_type: string | null;
  priority: string;
  status: string;
  source: string;
  requested_at: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  closed_at: string | null;
  customer_po: string | null;
  completion_summary: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  estimated_duration_minutes: number | null;
  required_skills: string[] | null;
  service_area: string | null;
  billing_status: string | null;
  billing_ready_at: string | null;
  billed_at: string | null;
};

export type DbCustomer = {
  id: string;
  name: string;
};

export type DbSite = {
  id: string;
  customer_id: string;
  name: string;
  address1: string | null;
  city: string | null;
  province_state: string | null;
};

export type DbAssignment = {
  id: string;
  work_order_id: string;
  technician_id: string;
  assignment_role: string;
  assignment_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  assigned_at: string | null;
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

export type WorkOrderOverrun = {
  key: string;
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  technicianId: string;
  technicianName: string;
  plannedEnd: string;
  actualEnd: string | null;
  overrunMinutes: number;
  active: boolean;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type DbRole = {
  user_id: string;
  role: string;
};

export type SummaryView = "requested" | "today" | "progress" | "dispatch" | "billing" | "closed" | "overrun";

export type EditWorkOrderForm = {
  title: string;
  description: string;
  jobType: string;
  priority: string;
  serviceArea: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
};

export type AssignTechnicianForm = {
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type TimeEditorForm = {
  technicianId: string;
  startedAt: string;
  endedAt: string;
  activityType: string;
  billable: boolean;
  billingRate: string;
  payRate: string;
  reason: string;
};

export type ServerAvailability = {
  technician_id: string;
  fits_requested_window: boolean;
  free_windows: Array<{
    start: string;
    end: string;
  }>;
};

export type DbEvent = {
  id: string;
  work_order_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type DbNote = {
  id: string;
  work_order_id: string;
  note: string;
  visibility: "internal" | "customer";
  created_by: string | null;
  created_at: string;
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
