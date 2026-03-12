import { asc, desc, eq, inArray } from "drizzle-orm";

import type { BillStatus } from "@/constants/billStatus";
import type { PaymentStatus } from "@/constants/paymentStatus";
import { getDb } from "@/db/client";
import {
  appointments,
  billItems,
  bills,
  departments,
  doctors,
  patients,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  BillCreateInput,
  BillFilters,
  BillLineItemInput,
  BillLineItemRecord,
  BillListResponse,
  BillRecord,
  BillSettlementInput,
} from "@/types/billing";

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toBillLineItemRecord(
  row: typeof billItems.$inferSelect,
): BillLineItemRecord {
  return {
    id: row.id,
    chargeId: row.chargeId ?? null,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    lineTotal: row.lineTotal,
    displayOrder: row.displayOrder,
  };
}

export function calculateBillTotals(
  items: BillLineItemInput[],
  discountAmount: number,
  taxAmount: number,
) {
  const normalizedItems = items.map((item, index) => {
    const quantity = roundCurrency(item.quantity);
    const unitPrice = roundCurrency(item.unitPrice);
    const lineTotal = roundCurrency(quantity * unitPrice);

    return {
      chargeId: item.chargeId ?? null,
      description: item.description.trim(),
      quantity,
      unitPrice,
      lineTotal,
      displayOrder: index,
    };
  });

  const subtotal = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const safeDiscount = roundCurrency(discountAmount);
  const safeTax = roundCurrency(taxAmount);
  const totalAmount = roundCurrency(subtotal + safeTax - safeDiscount);

  if (totalAmount < 0) {
    throw new ApiError(
      400,
      "Discount cannot reduce the bill total below zero.",
    );
  }

  return {
    items: normalizedItems,
    subtotal,
    discountAmount: safeDiscount,
    taxAmount: safeTax,
    totalAmount,
  };
}

export function resolveBillPaymentState(totalAmount: number, amountPaid: number): {
  billStatus: BillStatus;
  paymentStatus: PaymentStatus;
  amountPaid: number;
} {
  const safePaid = roundCurrency(
    Math.min(Math.max(amountPaid, 0), totalAmount),
  );

  if (safePaid <= 0) {
    return {
      billStatus: "PENDING",
      paymentStatus: "UNPAID",
      amountPaid: 0,
    };
  }

  if (safePaid < totalAmount) {
    return {
      billStatus: "PARTIALLY_PAID",
      paymentStatus: "PARTIALLY_PAID",
      amountPaid: safePaid,
    };
  }

  return {
    billStatus: "PAID",
    paymentStatus: "PAID",
    amountPaid: totalAmount,
  };
}

async function generateBillNumber() {
  const db = getDb();
  const prefix = `VHMS-BIL-${
    new Date().toISOString().slice(0, 10).replaceAll("-", "")
  }`;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const billNumber = `${prefix}-${suffix}`;
    const [existingRow] = await db
      .select({ id: bills.id })
      .from(bills)
      .where(eq(bills.billNumber, billNumber))
      .limit(1);

    if (!existingRow) {
      return billNumber;
    }
  }

  throw new ApiError(500, "Unable to allocate a unique bill number.");
}

async function getBillItemsMap(billIds: string[]) {
  const db = getDb();
  if (billIds.length === 0) {
    return new Map<string, BillLineItemRecord[]>();
  }

  const rows = await db
    .select()
    .from(billItems)
    .where(inArray(billItems.billId, billIds))
    .orderBy(asc(billItems.displayOrder), asc(billItems.createdAt));

  return rows.reduce((map, row) => {
    const items = map.get(row.billId) ?? [];
    items.push(toBillLineItemRecord(row));
    map.set(row.billId, items);
    return map;
  }, new Map<string, BillLineItemRecord[]>());
}

function toBillRecord(
  row: {
    bills: typeof bills.$inferSelect;
    patients: typeof patients.$inferSelect;
    appointments: typeof appointments.$inferSelect | null;
    doctors: typeof doctors.$inferSelect | null;
    departments: typeof departments.$inferSelect | null;
  },
  items: BillLineItemRecord[],
): BillRecord {
  return {
    id: row.bills.id,
    billNumber: row.bills.billNumber,
    patientId: row.patients.id,
    patientName: [row.patients.firstName, row.patients.lastName]
      .filter(Boolean)
      .join(" "),
    patientHospitalNumber: row.patients.hospitalNumber,
    appointmentId: row.appointments?.id ?? null,
    appointmentScheduledFor: row.appointments?.scheduledFor.toISOString() ??
      null,
    doctorName: row.doctors?.fullName ?? null,
    doctorDepartment: row.departments?.name ?? null,
    billStatus: row.bills.billStatus,
    paymentStatus: row.bills.paymentStatus,
    subtotal: row.bills.subtotal,
    taxAmount: row.bills.taxAmount,
    discountAmount: row.bills.discountAmount,
    totalAmount: row.bills.totalAmount,
    amountPaid: row.bills.amountPaid,
    balanceAmount: roundCurrency(row.bills.totalAmount - row.bills.amountPaid),
    createdAt: row.bills.createdAt.toISOString(),
    updatedAt: row.bills.updatedAt.toISOString(),
    items,
  };
}

function summarize(entries: BillRecord[]) {
  return {
    total: entries.length,
    draft: entries.filter((entry) => entry.billStatus === "DRAFT").length,
    partiallyPaid:
      entries.filter((entry) => entry.billStatus === "PARTIALLY_PAID")
        .length,
    paid: entries.filter((entry) => entry.billStatus === "PAID").length,
    totalAmount: roundCurrency(
      entries.reduce((sum, entry) => sum + entry.totalAmount, 0),
    ),
    amountCollected: roundCurrency(
      entries.reduce((sum, entry) => sum + entry.amountPaid, 0),
    ),
    outstandingAmount: roundCurrency(
      entries.reduce((sum, entry) => sum + entry.balanceAmount, 0),
    ),
  };
}

async function getBillRecordById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bills)
    .innerJoin(patients, eq(bills.patientId, patients.id))
    .leftJoin(appointments, eq(bills.appointmentId, appointments.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .where(eq(bills.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const itemsMap = await getBillItemsMap([id]);
  return toBillRecord(row, itemsMap.get(id) ?? []);
}

export async function getBillById(id: string) {
  return getBillRecordById(id);
}

async function assertAppointmentReady(appointmentId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected appointment does not exist.");
  }

  if (
    row.appointments.status === "CANCELLED" ||
    row.appointments.status === "NO_SHOW"
  ) {
    throw new ApiError(
      400,
      "Cancelled or no-show appointments cannot be billed.",
    );
  }

  return row;
}

export async function listBills(
  filters: BillFilters = {},
): Promise<BillListResponse> {
  const db = getDb();
  const rows = await db
    .select()
    .from(bills)
    .innerJoin(patients, eq(bills.patientId, patients.id))
    .leftJoin(appointments, eq(bills.appointmentId, appointments.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .orderBy(desc(bills.updatedAt), desc(bills.createdAt));

  const itemsMap = await getBillItemsMap(rows.map((row) => row.bills.id));
  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const entries = rows
    .map((row) => toBillRecord(row, itemsMap.get(row.bills.id) ?? []))
    .filter((entry) => {
      const matchesStatus = status === "ALL" || entry.billStatus === status;
      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        entry.billNumber,
        entry.patientName,
        entry.patientHospitalNumber,
        entry.doctorName ?? "",
        entry.billStatus,
        entry.paymentStatus,
      ].some((value) => value.toLowerCase().includes(query));
    });

  return {
    entries,
    summary: summarize(entries),
    filters: {
      q: query,
      status,
    },
  };
}

export async function createBill(
  input: BillCreateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const appointmentRow = await assertAppointmentReady(input.appointmentId);
  const totals = calculateBillTotals(
    input.items,
    input.discountAmount,
    input.taxAmount,
  );
  const billNumber = await generateBillNumber();

  const createdBill = await db.transaction(async (tx) => {
    const [insertedBill] = await tx
      .insert(bills)
      .values({
        billNumber,
        patientId: appointmentRow.patients.id,
        appointmentId: appointmentRow.appointments.id,
        billStatus: "DRAFT",
        paymentStatus: "UNPAID",
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        amountPaid: 0,
      })
      .returning({ id: bills.id });

    if (!insertedBill) {
      throw new ApiError(500, "Unable to create the bill.");
    }

    await tx.insert(billItems).values(
      totals.items.map((item) => ({
        billId: insertedBill.id,
        chargeId: item.chargeId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        displayOrder: item.displayOrder,
      })),
    );

    return insertedBill;
  });

  await recordAuditLog({
    actorUserId,
    action: "billing.created",
    entityType: "bill",
    entityId: createdBill.id,
    metadata: {
      billNumber,
      appointmentId: appointmentRow.appointments.id,
      patientId: appointmentRow.patients.id,
      totalAmount: totals.totalAmount,
      itemCount: totals.items.length,
    },
  });

  const createdRecord = await getBillRecordById(createdBill.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created bill.");
  }

  return createdRecord;
}

export async function settleBill(
  input: BillSettlementInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, input.id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Bill not found.");
  }

  if (input.action === "CANCEL") {
    if (existingRow.amountPaid > 0) {
      throw new ApiError(
        400,
        "Paid bills cannot be cancelled directly in this slice.",
      );
    }

    await db
      .update(bills)
      .set({
        billStatus: "CANCELLED",
        paymentStatus: "UNPAID",
        updatedAt: new Date(),
      })
      .where(eq(bills.id, input.id));

    await recordAuditLog({
      actorUserId,
      action: "billing.cancelled",
      entityType: "bill",
      entityId: input.id,
      metadata: {
        billNumber: existingRow.billNumber,
      },
    });
  } else {
    if (
      !["DRAFT", "PENDING", "PARTIALLY_PAID"].includes(existingRow.billStatus)
    ) {
      throw new ApiError(400, "This bill cannot be finalized again.");
    }

    const paymentReceived = roundCurrency(input.paymentReceived ?? 0);
    const nextState = resolveBillPaymentState(
      existingRow.totalAmount,
      existingRow.amountPaid + paymentReceived,
    );

    await db
      .update(bills)
      .set({
        billStatus: nextState.billStatus,
        paymentStatus: nextState.paymentStatus,
        amountPaid: nextState.amountPaid,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, input.id));

    await recordAuditLog({
      actorUserId,
      action: "billing.finalized",
      entityType: "bill",
      entityId: input.id,
      metadata: {
        billNumber: existingRow.billNumber,
        paymentReceived,
        totalAmount: existingRow.totalAmount,
        nextStatus: nextState.billStatus,
      },
    });
  }

  const updatedRecord = await getBillRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated bill.");
  }

  return updatedRecord;
}
