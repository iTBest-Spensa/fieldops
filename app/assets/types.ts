export type AssetStatus =
  | "available"
  | "assigned"
  | "in_use"
  | "repair"
  | "retired"
  | "lost"
  | "disposed";

export type AssetCondition = "excellent" | "good" | "fair" | "poor" | "damaged";
export type AssetOwnership = "company" | "customer" | "leased" | "other";
export type AssetSummaryView = "all" | "assigned" | "maintenance" | "unavailable";
export type AssetDetailTab =
  | "overview"
  | "history"
  | "work_orders"
  | "maintenance"
  | "documents"
  | "notes";

export type DbAsset = {
  id: string;
  asset_tag: string | null;
  asset_name: string | null;
  serial_number: string | null;
  asset_type: string;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  ownership: AssetOwnership;
  customer_id: string | null;
  site_id: string | null;
  assigned_to: string | null;
  current_work_order_id: string | null;
  inventory_location_id: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  purchase_date: string | null;
  purchase_cost: number | null;
  replacement_cost: number | null;
  purchase_vendor: string | null;
  purchase_order: string | null;
  warranty_expires_on: string | null;
  in_service_date: string | null;
  next_service_date: string | null;
  retired_at: string | null;
  disposed_at: string | null;
  disposal_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DbAssetHistory = {
  id: string;
  asset_id: string;
  work_order_id: string | null;
  event_type: string;
  from_user_id: string | null;
  to_user_id: string | null;
  from_site_id: string | null;
  to_site_id: string | null;
  from_customer_id: string | null;
  to_customer_id: string | null;
  from_work_order_id: string | null;
  to_work_order_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  from_status: string | null;
  to_status: string | null;
  details: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbAssetMaintenance = {
  id: string;
  asset_id: string;
  work_order_id: string | null;
  maintenance_type: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  title: string;
  description: string | null;
  provider: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbAssetDocument = {
  id: string;
  asset_id: string;
  document_type: string;
  name: string;
  url: string;
  expires_on: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbAssetNote = {
  id: string;
  asset_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
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
  status?: string | null;
};

export type DbSite = {
  id: string;
  customer_id: string;
  name: string;
  address1: string | null;
  city: string | null;
  province_state: string | null;
  active?: boolean | null;
};

export type DbInventoryLocation = {
  id: string;
  name: string;
  location_type: string;
  site_id: string | null;
  active: boolean;
};

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  title: string;
  status: string;
  priority: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  requested_at: string;
  completed_at: string | null;
  closed_at: string | null;
};

export type AssetForm = {
  assetTag: string;
  assetName: string;
  serialNumber: string;
  assetType: string;
  category: string;
  manufacturer: string;
  model: string;
  description: string;
  ownership: AssetOwnership;
  status: AssetStatus;
  condition: AssetCondition;
  purchaseDate: string;
  purchaseCost: string;
  replacementCost: string;
  purchaseVendor: string;
  purchaseOrder: string;
  warrantyExpiresOn: string;
  inServiceDate: string;
  nextServiceDate: string;
  disposalMethod: string;
  notes: string;
};

export type AssetAssignmentForm = {
  targetType: "available" | "technician" | "customer" | "site" | "work_order" | "storage";
  technicianId: string;
  customerId: string;
  siteId: string;
  workOrderId: string;
  locationId: string;
  notes: string;
};

export type MaintenanceForm = {
  maintenanceType: string;
  status: DbAssetMaintenance["status"];
  title: string;
  description: string;
  provider: string;
  scheduledDate: string;
  completedDate: string;
  cost: string;
  workOrderId: string;
  notes: string;
};

export type DocumentForm = {
  documentType: string;
  name: string;
  url: string;
  expiresOn: string;
  notes: string;
};

export type AssetSnapshot = {
  asset: DbAsset;
  displayName: string;
  assignmentLabel: string;
  assignmentSubtext: string;
  maintenanceDue: boolean;
  maintenanceLabel: string;
  unavailable: boolean;
  relatedWorkOrderIds: string[];
};
