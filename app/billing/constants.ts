import type { AdjustmentForm, InvoiceTermsForm, ManualChargeForm, PaymentForm } from "./types";

export const emptyPaymentForm: PaymentForm = {
  amount: "",
  method: "tap",
  receivedAt: "",
  reference: "",
  notes: "",
};

export const emptyTermsForm: InvoiceTermsForm = {
  issuedDate: "",
  dueDate: "",
  taxRatePercent: "",
  discountAmount: "0",
  billingEmail: "",
  notes: "",
};

export const emptyManualChargeForm: ManualChargeForm = {
  lineType: "service",
  description: "",
  quantity: "1",
  unitPrice: "",
  taxable: true,
};

export const emptyAdjustmentForm: AdjustmentForm = {
  adjustmentType: "credit",
  amount: "",
  reason: "",
  notes: "",
};

export const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  ready: "Approved",
  sent: "Sent",
  partial: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};
