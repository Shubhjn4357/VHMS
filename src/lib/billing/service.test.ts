import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import {
  calculateBillTotals,
  resolveBillPaymentState,
} from "@/lib/billing/service";

describe("billing service helpers", () => {
  it("rounds line items and totals consistently", () => {
    const result = calculateBillTotals(
      [
        {
          chargeId: "chg_consult",
          description: "  Consultation  ",
          quantity: 1.257,
          unitPrice: 199.999,
        },
        {
          description: "ECG",
          quantity: 2,
          unitPrice: 49.994,
        },
      ],
      10.005,
      2.119,
    );

    expect(result.items).toEqual([
      {
        chargeId: "chg_consult",
        description: "Consultation",
        quantity: 1.26,
        unitPrice: 200,
        lineTotal: 252,
        displayOrder: 0,
      },
      {
        chargeId: null,
        description: "ECG",
        quantity: 2,
        unitPrice: 49.99,
        lineTotal: 99.98,
        displayOrder: 1,
      },
    ]);
    expect(result.subtotal).toBe(351.98);
    expect(result.discountAmount).toBe(10.01);
    expect(result.taxAmount).toBe(2.12);
    expect(result.totalAmount).toBe(344.09);
  });

  it("rejects totals that go below zero after discount", () => {
    expect(() =>
      calculateBillTotals(
        [
          {
            description: "Registration",
            quantity: 1,
            unitPrice: 100,
          },
        ],
        101,
        0,
      )
    ).toThrow(ApiError);
  });

  it("resolves unpaid, partially paid, and paid bill states", () => {
    expect(resolveBillPaymentState(500, 0)).toEqual({
      billStatus: "PENDING",
      paymentStatus: "UNPAID",
      amountPaid: 0,
    });

    expect(resolveBillPaymentState(500, 200.111)).toEqual({
      billStatus: "PARTIALLY_PAID",
      paymentStatus: "PARTIALLY_PAID",
      amountPaid: 200.11,
    });

    expect(resolveBillPaymentState(500, 900)).toEqual({
      billStatus: "PAID",
      paymentStatus: "PAID",
      amountPaid: 500,
    });
  });
});
