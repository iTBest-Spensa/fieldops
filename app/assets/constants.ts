import type { AssetAssignmentForm, AssetForm, DocumentForm, MaintenanceForm } from "./types";

export const assetStatuses = [
  "available",
  "assigned",
  "in_use",
  "repair",
  "retired",
  "lost",
  "disposed",
] as const;

export const assetConditions = ["excellent", "good", "fair", "poor", "damaged"] as const;
export const assetOwnerships = ["company", "customer", "leased", "other"] as const;

export const emptyAssetForm: AssetForm = {
  assetTag: "",
  assetName: "",
  serialNumber: "",
  assetType: "",
  category: "",
  manufacturer: "",
  model: "",
  description: "",
  ownership: "company",
  status: "available",
  condition: "good",
  purchaseDate: "",
  purchaseCost: "",
  replacementCost: "",
  purchaseVendor: "",
  purchaseOrder: "",
  warrantyExpiresOn: "",
  inServiceDate: "",
  nextServiceDate: "",
  disposalMethod: "",
  notes: "",
};

export const emptyAssignmentForm: AssetAssignmentForm = {
  targetType: "available",
  technicianId: "",
  customerId: "",
  siteId: "",
  workOrderId: "",
  locationId: "",
  notes: "",
};

export const emptyMaintenanceForm: MaintenanceForm = {
  maintenanceType: "preventive",
  status: "planned",
  title: "",
  description: "",
  provider: "",
  scheduledDate: "",
  completedDate: "",
  cost: "",
  workOrderId: "",
  notes: "",
};

export const emptyDocumentForm: DocumentForm = {
  documentType: "manual",
  name: "",
  url: "",
  expiresOn: "",
  notes: "",
};
