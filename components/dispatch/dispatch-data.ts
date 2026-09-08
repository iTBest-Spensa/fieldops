export type TechnicianStatus =
  | "available"
  | "travelling"
  | "on_site"
  | "working"
  | "off";

export type WorkOrderStatus =
  | "scheduled"
  | "travelling"
  | "on_site"
  | "working"
  | "waiting"
  | "billing_ready";

export type WorkPriority = "normal" | "high" | "emergency";

export type Technician = {
  id: string;
  name: string;
  initials: string;
  team: string;
  status: TechnicianStatus;
  statusLabel: string;
  shiftLabel: string;
  skills: string[];
  location: string;
  freeHours: number;
  utilization: number;
};

export type WorkOrder = {
  id: string;
  number: string;
  title: string;
  customer: string;
  location: string;
  status: WorkOrderStatus;
  priority: WorkPriority;
  technicianId: string | null;
  startMinutes: number;
  endMinutes: number;
  jobType: string;
  requiredSkill: string;
  inventoryNote?: string;
  travelMinutes?: number;
};

export const teams = [
  "Network & Infrastructure",
  "End User Support",
  "Installations",
];

export const technicians: Technician[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    initials: "AM",
    team: "Network & Infrastructure",
    status: "on_site",
    statusLabel: "On site",
    shiftLabel: "On clock · 4h 23m",
    skills: ["Networks", "Servers", "Microsoft 365"],
    location: "Kamloops",
    freeHours: 1.5,
    utilization: 73,
  },
  {
    id: "jordan",
    name: "Jordan Singh",
    initials: "JS",
    team: "Network & Infrastructure",
    status: "travelling",
    statusLabel: "Travelling",
    shiftLabel: "12 min away",
    skills: ["Networks", "VoIP", "Wi-Fi"],
    location: "Kamloops",
    freeHours: 2,
    utilization: 68,
  },
  {
    id: "nina",
    name: "Nina Patel",
    initials: "NP",
    team: "End User Support",
    status: "available",
    statusLabel: "Available",
    shiftLabel: "2.5h open today",
    skills: ["Desktop Support", "Microsoft 365", "Onboarding"],
    location: "Kamloops",
    freeHours: 2.5,
    utilization: 51,
  },
  {
    id: "daniel",
    name: "Daniel Kim",
    initials: "DK",
    team: "End User Support",
    status: "working",
    statusLabel: "Working",
    shiftLabel: "On clock · 4h 11m",
    skills: ["Desktop Support", "Hardware", "Printers"],
    location: "Kamloops",
    freeHours: 1,
    utilization: 79,
  },
  {
    id: "chris",
    name: "Chris Brown",
    initials: "CB",
    team: "Installations",
    status: "available",
    statusLabel: "Available",
    shiftLabel: "3.0h open today",
    skills: ["Installations", "Cabling", "Wi-Fi"],
    location: "Kamloops",
    freeHours: 3,
    utilization: 44,
  },
  {
    id: "sarah",
    name: "Sarah Lee",
    initials: "SL",
    team: "Installations",
    status: "off",
    statusLabel: "Off shift",
    shiftLabel: "Starts 1:00 PM",
    skills: ["Installations", "Hardware"],
    location: "Kamloops",
    freeHours: 1.5,
    utilization: 36,
  },
];

export const initialWorkOrders: WorkOrder[] = [
  {
    id: "wo-1041",
    number: "WO-001041",
    title: "Network outage",
    customer: "Summit Professional Centre",
    location: "Kamloops, BC",
    status: "on_site",
    priority: "emergency",
    technicianId: "alex",
    startMinutes: 60,
    endMinutes: 180,
    jobType: "Network incident",
    requiredSkill: "Networks",
    inventoryNote: "No parts required",
    travelMinutes: 18,
  },
  {
    id: "wo-1037",
    number: "WO-001037",
    title: "Server health check",
    customer: "Pine Ridge Legal",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: "alex",
    startMinutes: 230,
    endMinutes: 330,
    jobType: "Server maintenance",
    requiredSkill: "Servers",
    inventoryNote: "Remote toolkit only",
    travelMinutes: 14,
  },
  {
    id: "wo-1048",
    number: "WO-001048",
    title: "New employee setup",
    customer: "Cedar Health Group",
    location: "Kamloops, BC",
    status: "travelling",
    priority: "normal",
    technicianId: "jordan",
    startMinutes: 90,
    endMinutes: 210,
    jobType: "User onboarding",
    requiredSkill: "Microsoft 365",
    inventoryNote: "Laptop reserved · Dock reserved",
    travelMinutes: 12,
  },
  {
    id: "wo-1056",
    number: "WO-001056",
    title: "Wi-Fi coverage check",
    customer: "Thompson Valley Dental",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: "jordan",
    startMinutes: 290,
    endMinutes: 390,
    jobType: "Wireless assessment",
    requiredSkill: "Wi-Fi",
    inventoryNote: "Survey kit available",
    travelMinutes: 16,
  },
  {
    id: "wo-1044",
    number: "WO-001044",
    title: "Replace damaged workstation",
    customer: "North Valley Accounting",
    location: "Kamloops, BC",
    status: "working",
    priority: "high",
    technicianId: "daniel",
    startMinutes: 45,
    endMinutes: 165,
    jobType: "Hardware replacement",
    requiredSkill: "Hardware",
    inventoryNote: "Dell workstation · 1 in stock",
    travelMinutes: 9,
  },
  {
    id: "wo-1063",
    number: "WO-001063",
    title: "Printer deployment",
    customer: "Riverbend Insurance",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: "nina",
    startMinutes: 210,
    endMinutes: 300,
    jobType: "Device deployment",
    requiredSkill: "Desktop Support",
    inventoryNote: "Printer staged in warehouse",
    travelMinutes: 11,
  },
  {
    id: "wo-1068",
    number: "WO-001068",
    title: "Office network install",
    customer: "Juniper Property Group",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "high",
    technicianId: "chris",
    startMinutes: 120,
    endMinutes: 330,
    jobType: "Installation",
    requiredSkill: "Installations",
    inventoryNote: "Switches and APs staged",
    travelMinutes: 22,
  },
  {
    id: "wo-1071",
    number: "WO-001071",
    title: "Conference room setup",
    customer: "Bluebird Engineering",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: "sarah",
    startMinutes: 330,
    endMinutes: 450,
    jobType: "Installation",
    requiredSkill: "Installations",
    inventoryNote: "Display mount reserved",
    travelMinutes: 15,
  },
  {
    id: "wo-1078",
    number: "WO-001078",
    title: "Firewall replacement",
    customer: "Aberdeen Medical Clinic",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "high",
    technicianId: null,
    startMinutes: 240,
    endMinutes: 360,
    jobType: "Network change",
    requiredSkill: "Networks",
    inventoryNote: "Firewall reserved · Config pending",
    travelMinutes: 13,
  },
  {
    id: "wo-1081",
    number: "WO-001081",
    title: "Laptop replacement",
    customer: "Pacific Survey Group",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: null,
    startMinutes: 300,
    endMinutes: 390,
    jobType: "Hardware replacement",
    requiredSkill: "Desktop Support",
    inventoryNote: "Laptop in stock · Dock low stock",
    travelMinutes: 8,
  },
  {
    id: "wo-1084",
    number: "WO-001084",
    title: "New access point install",
    customer: "Copper Ridge Realty",
    location: "Kamloops, BC",
    status: "scheduled",
    priority: "normal",
    technicianId: null,
    startMinutes: 360,
    endMinutes: 450,
    jobType: "Installation",
    requiredSkill: "Wi-Fi",
    inventoryNote: "1 access point reserved",
    travelMinutes: 19,
  },
];
