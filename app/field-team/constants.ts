import type {
  AddTechnicianForm,
  CertificationForm,
  CompensationForm,
  EmploymentType,
  ProficiencyLevel,
  ScheduleEventForm,
  SkillForm,
  TechnicianForm,
} from "./types";

export const employmentTypes: EmploymentType[] = [
  "full_time",
  "part_time",
  "contractor",
  "casual",
];

export const proficiencyLevels: ProficiencyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

export const scheduleEventTypes = [
  "break",
  "lunch",
  "vacation",
  "sick",
  "training",
  "meeting",
  "unavailable",
  "travel",
  "other",
] as const;

export const activeWorkOrderStatuses = new Set([
  "requested",
  "planned",
  "assigned",
  "travelling",
  "on_site",
  "working",
  "waiting",
]);

export const terminalWorkOrderStatuses = new Set([
  "finished",
  "billing_ready",
  "closed",
  "cancelled",
]);

export const emptyTechnicianForm: TechnicianForm = {
  fullName: "",
  phone: "",
  active: true,
  employeeNumber: "",
  jobTitle: "",
  employmentType: "full_time",
  hireDate: "",
  specialty: "",
  serviceArea: "",
  homeBase: "",
  shiftStart: "07:00",
  shiftEnd: "17:00",
};

export const emptyAddTechnicianForm: AddTechnicianForm = {
  userId: "",
  specialty: "",
  serviceArea: "",
  shiftStart: "07:00",
  shiftEnd: "17:00",
};

export const emptySkillForm: SkillForm = {
  skillName: "",
  proficiency: "intermediate",
  notes: "",
};

export const emptyCertificationForm: CertificationForm = {
  certificationName: "",
  issuer: "",
  credentialNumber: "",
  issuedOn: "",
  expiresOn: "",
  notes: "",
};

export const emptyScheduleEventForm: ScheduleEventForm = {
  eventType: "unavailable",
  title: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  notes: "",
};

export const emptyCompensationForm: CompensationForm = {
  billingRate: "",
  payRate: "",
  currency: "CAD",
};
