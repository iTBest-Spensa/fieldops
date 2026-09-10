export type EmploymentType = "full_time" | "part_time" | "contractor" | "casual";
export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type TechnicianDetailTab =
  | "overview"
  | "skills"
  | "schedule"
  | "work_orders"
  | "time"
  | "overtime"
  | "notes";
export type TechnicianSummaryView =
  | "all"
  | "available"
  | "active_jobs"
  | "overtime"
  | "certifications";

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type DbRole = {
  user_id: string;
  role: string;
};

export type DbTechnicianProfile = {
  technician_id: string;
  specialty: string | null;
  skill_tags: string[] | null;
  service_area: string | null;
  shift_start: string | null;
  shift_end: string | null;
  employee_number: string | null;
  job_title: string | null;
  employment_type: EmploymentType;
  hire_date: string | null;
  home_base: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DbTechnicianSkill = {
  id: string;
  technician_id: string;
  skill_name: string;
  proficiency: ProficiencyLevel;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTechnicianCertification = {
  id: string;
  technician_id: string;
  certification_name: string;
  issuer: string | null;
  credential_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTechnicianCompensation = {
  technician_id: string;
  billing_rate: number | null;
  pay_rate: number | null;
  currency: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTechnicianNote = {
  id: string;
  technician_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  requested_at: string;
  completed_at: string | null;
  closed_at: string | null;
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
  assigned_at: string | null;
  accepted_at: string | null;
  released_at: string | null;
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

export type DbScheduleEvent = {
  id: string;
  technician_id: string;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  work_order_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCustomer = {
  id: string;
  name: string;
};

export type DbSite = {
  id: string;
  customer_id: string;
  name: string;
  city: string | null;
};

export type TechnicianSnapshot = {
  technicianId: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  specialty: string | null;
  jobTitle: string | null;
  serviceArea: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  employmentType: EmploymentType;
  status: string;
  statusDetail: string;
  currentWorkOrderId: string | null;
  currentWorkOrderNumber: string | null;
  currentWorkOrderTitle: string | null;
  openWorkCount: number;
  nextAssignmentAt: string | null;
  weekOvertimeMinutes: number;
  certificationAlerts: number;
};

export type TechnicianForm = {
  fullName: string;
  phone: string;
  active: boolean;
  employeeNumber: string;
  jobTitle: string;
  employmentType: EmploymentType;
  hireDate: string;
  specialty: string;
  serviceArea: string;
  homeBase: string;
  shiftStart: string;
  shiftEnd: string;
};

export type AddTechnicianForm = {
  userId: string;
  specialty: string;
  serviceArea: string;
  shiftStart: string;
  shiftEnd: string;
};

export type SkillForm = {
  skillName: string;
  proficiency: ProficiencyLevel;
  notes: string;
};

export type CertificationForm = {
  certificationName: string;
  issuer: string;
  credentialNumber: string;
  issuedOn: string;
  expiresOn: string;
  notes: string;
};

export type ScheduleEventForm = {
  eventType: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export type CompensationForm = {
  billingRate: string;
  payRate: string;
  currency: string;
};
