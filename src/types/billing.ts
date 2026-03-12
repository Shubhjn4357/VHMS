import type { BillStatus } from "@/constants/billStatus";
import type { PaymentStatus } from "@/constants/paymentStatus";

export type BillLineItemRecord = {
  id: string;
  chargeId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  displayOrder: number;
};

export type BillRecord = {
  id: string;
  billNumber: string;
  patientId: string;
  patientName: string;
  patientHospitalNumber: string;
  appointmentId: string | null;
  appointmentScheduledFor: string | null;
  doctorName: string | null;
  doctorDepartment: string | null;
  billStatus: BillStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  createdAt: string;
  updatedAt: string;
  items: BillLineItemRecord[];
};

export type BillFilters = {
  q?: string;
  status?: BillStatus | "ALL";
};

export type BillSummary = {
  total: number;
  draft: number;
  partiallyPaid: number;
  paid: number;
  totalAmount: number;
  amountCollected: number;
  outstandingAmount: number;
};

export type BillListResponse = {
  entries: BillRecord[];
  summary: BillSummary;
  filters: {
    q: string;
    status: BillStatus | "ALL";
  };
};

export type BillLineItemInput = {
  chargeId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type BillCreateInput = {
  appointmentId: string;
  discountAmount: number;
  taxAmount: number;
  items: BillLineItemInput[];
};

export type BillSettlementInput = {
  id: string;
  action: "FINALIZE" | "CANCEL";
  paymentReceived?: number;
};
