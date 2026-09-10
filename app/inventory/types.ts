export type InventorySection =
  | "stock"
  | "purchase_orders"
  | "receiving"
  | "returns"
  | "reconciliation"
  | "suppliers"
  | "movements";

export type InventorySummaryView = "all" | "low" | "out" | "value";
export type InventoryItemTab = "overview" | "movements" | "work_orders" | "locations" | "suppliers" | "notes";

export type DbInventoryItem = {
  id: string;
  sku: string | null;
  part_number: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  manufacturer: string | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  reorder_level: number;
  reorder_quantity: number;
  taxable: boolean;
  track_stock: boolean;
  preferred_supplier_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbInventoryLocation = {
  id: string;
  name: string;
  code: string | null;
  location_type: string;
  site_id: string | null;
  technician_id: string | null;
  vehicle_identifier: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbInventoryTransaction = {
  id: string;
  inventory_item_id: string;
  location_id: string | null;
  work_order_id: string | null;
  technician_id: string | null;
  supplier_id: string | null;
  purchase_order_id: string | null;
  receipt_id: string | null;
  return_id: string | null;
  reconciliation_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  transfer_group_id: string | null;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbSupplier = {
  id: string;
  supplier_number: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string | null;
  payment_terms_days: number;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbPurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: "draft" | "approved" | "ordered" | "partially_received" | "received" | "closed" | "cancelled";
  ordered_at: string | null;
  expected_date: string | null;
  shipping_amount: number;
  tax_amount: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  description: string;
  supplier_sku: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
};

export type DbReceipt = {
  id: string;
  receipt_number: string;
  purchase_order_id: string;
  location_id: string;
  received_at: string;
  packing_slip: string | null;
  status: "posted" | "void";
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbReceiptItem = {
  id: string;
  receipt_id: string;
  purchase_order_item_id: string;
  inventory_item_id: string;
  quantity_received: number;
  quantity_damaged: number;
  unit_cost: number;
  created_at: string;
};

export type DbInventoryReturn = {
  id: string;
  return_number: string;
  return_type: "supplier" | "work_order" | "technician" | "customer" | "other";
  supplier_id: string | null;
  purchase_order_id: string | null;
  work_order_id: string | null;
  technician_id: string | null;
  customer_id: string | null;
  location_id: string;
  status: "posted" | "cancelled";
  returned_at: string;
  reason: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbInventoryReturnItem = {
  id: string;
  return_id: string;
  inventory_item_id: string;
  quantity: number;
  condition: "restockable" | "damaged" | "scrap";
  unit_cost: number | null;
  created_at: string;
};

export type DbReconciliation = {
  id: string;
  reconciliation_number: string;
  location_id: string;
  status: "counting" | "posted" | "cancelled";
  started_at: string;
  posted_at: string | null;
  notes: string | null;
  created_by: string | null;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbReconciliationLine = {
  id: string;
  reconciliation_id: string;
  inventory_item_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  unit_cost: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DbInventoryItemNote = {
  id: string;
  inventory_item_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type DbInventoryItemSupplier = {
  id: string;
  inventory_item_id: string;
  supplier_id: string;
  supplier_sku: string | null;
  last_unit_cost: number | null;
  lead_time_days: number | null;
  preferred: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbWorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  customer_id: string;
  site_id: string | null;
};

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
};

export type DbRole = { user_id: string; role: string };
export type DbCustomer = { id: string; name: string; status?: string | null };
export type DbSite = { id: string; customer_id: string; name: string; city: string | null; province_state: string | null; active?: boolean | null };

export type StockBalance = {
  itemId: string;
  total: number;
  byLocation: Map<string, number>;
};

export type InventoryItemSnapshot = {
  item: DbInventoryItem;
  onHand: number;
  stockStatus: "ok" | "low" | "out";
  value: number;
  locationCount: number;
  lastMovementAt: string | null;
};

export type InventoryItemForm = {
  sku: string;
  partNumber: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  unit: string;
  unitCost: string;
  unitPrice: string;
  reorderLevel: string;
  reorderQuantity: string;
  taxable: boolean;
  trackStock: boolean;
  preferredSupplierId: string;
  notes: string;
  active: boolean;
};

export type SupplierForm = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address1: string;
  address2: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  paymentTermsDays: string;
  notes: string;
  active: boolean;
};

export type LocationForm = {
  name: string;
  code: string;
  locationType: string;
  siteId: string;
  technicianId: string;
  vehicleIdentifier: string;
  notes: string;
  active: boolean;
};

export type MovementForm = {
  movementType: "receive" | "issue" | "consume" | "adjustment" | "transfer";
  itemId: string;
  locationId: string;
  toLocationId: string;
  workOrderId: string;
  technicianId: string;
  quantity: string;
  unitCost: string;
  reference: string;
  notes: string;
};

export type POLineForm = { itemId: string; quantity: string; unitCost: string; supplierSku: string };
export type PurchaseOrderForm = { supplierId: string; expectedDate: string; shippingAmount: string; taxAmount: string; notes: string; lines: POLineForm[] };
export type ReceivingLineForm = { purchaseOrderItemId: string; inventoryItemId: string; quantityReceived: string; quantityDamaged: string; unitCost: string };
export type ReceivingForm = { purchaseOrderId: string; locationId: string; receivedAt: string; packingSlip: string; notes: string; lines: ReceivingLineForm[] };
export type ReturnLineForm = { itemId: string; quantity: string; condition: "restockable" | "damaged" | "scrap"; unitCost: string };
export type ReturnForm = { returnType: DbInventoryReturn["return_type"]; supplierId: string; purchaseOrderId: string; workOrderId: string; technicianId: string; customerId: string; locationId: string; reason: string; notes: string; lines: ReturnLineForm[] };
