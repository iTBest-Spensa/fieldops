import type { InventoryItemForm, LocationForm, MovementForm, PurchaseOrderForm, ReceivingForm, ReturnForm, SupplierForm } from "./types";

export const inventorySections = [
  ["stock", "Stock"],
  ["purchase_orders", "Purchase Orders"],
  ["receiving", "Receiving"],
  ["returns", "Returns"],
  ["reconciliation", "Reconciliation"],
  ["suppliers", "Suppliers"],
  ["movements", "Movements"],
] as const;

export const emptyInventoryItemForm: InventoryItemForm = {
  sku: "", partNumber: "", barcode: "", name: "", description: "", category: "", manufacturer: "", unit: "each",
  unitCost: "0", unitPrice: "0", reorderLevel: "0", reorderQuantity: "0", taxable: true, trackStock: true, preferredSupplierId: "", notes: "", active: true,
};

export const emptySupplierForm: SupplierForm = {
  name: "", contactName: "", email: "", phone: "", website: "", address1: "", address2: "", city: "", provinceState: "", postalCode: "", country: "Canada", paymentTermsDays: "30", notes: "", active: true,
};

export const emptyLocationForm: LocationForm = {
  name: "", code: "", locationType: "warehouse", siteId: "", technicianId: "", vehicleIdentifier: "", notes: "", active: true,
};

export const emptyMovementForm: MovementForm = {
  movementType: "issue", itemId: "", locationId: "", toLocationId: "", workOrderId: "", technicianId: "", quantity: "1", unitCost: "", reference: "", notes: "",
};

export const emptyPurchaseOrderForm: PurchaseOrderForm = {
  supplierId: "", expectedDate: "", shippingAmount: "0", taxAmount: "0", notes: "", lines: [{ itemId: "", quantity: "1", unitCost: "", supplierSku: "" }],
};

export const emptyReceivingForm: ReceivingForm = {
  purchaseOrderId: "", locationId: "", receivedAt: "", packingSlip: "", notes: "", lines: [],
};

export const emptyReturnForm: ReturnForm = {
  returnType: "supplier", supplierId: "", purchaseOrderId: "", workOrderId: "", technicianId: "", customerId: "", locationId: "", reason: "", notes: "", lines: [{ itemId: "", quantity: "1", condition: "restockable", unitCost: "" }],
};
