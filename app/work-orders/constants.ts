import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import type { NewWorkOrderForm } from "./types";

export const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, active: true, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export const workOrderStatuses = [
  "requested",
  "planned",
  "assigned",
  "travelling",
  "on_site",
  "working",
  "waiting",
  "finished",
  "billing_ready",
  "closed",
  "cancelled",
] as const;

export const priorities = ["low", "normal", "high", "urgent", "emergency"] as const;

export const emptyNewWorkOrderForm: NewWorkOrderForm = {
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

