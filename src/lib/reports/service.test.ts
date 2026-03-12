import { describe, expect, it } from "vitest";

import { buildReportsCsv } from "@/lib/reports/service";
import type { ReportsWorkspaceResponse } from "@/types/analytics";

describe("reports export helpers", () => {
  it("builds sectioned CSV output for the reporting workspace", () => {
    const workspace: ReportsWorkspaceResponse = {
      summary: {
        totalRevenue: 2400,
        amountCollected: 1800,
        outstandingAmount: 600,
        activeAdmissions: 2,
        queuedMessages: 1,
        failedMessages: 1,
      },
      revenueByDoctor: [
        {
          doctorId: "doc_verma",
          doctorName: "Dr. Ananya Verma",
          bills: 2,
          totalBilled: 2400,
          amountCollected: 1800,
          outstandingAmount: 600,
        },
      ],
      appointmentStatus: [{ status: "CHECKED_IN", total: 4 }],
      communicationByChannel: [
        {
          channel: "SMS",
          total: 3,
          delivered: 1,
          queued: 1,
          failed: 1,
        },
      ],
      occupancyByWard: [
        {
          wardId: "ward_a",
          wardName: "Ward A",
          occupied: 6,
          total: 10,
          reserved: 1,
          cleaning: 1,
          blocked: 0,
          occupancyRate: 0.6,
        },
      ],
      staffAccessByRole: [
        {
          role: "ADMIN",
          approved: 1,
          pending: 0,
          revoked: 0,
        },
      ],
      outstandingBills: [
        {
          billId: "bil_001",
          billNumber: "VHMS-BIL-001",
          patientName: "Ritika Sharma",
          totalAmount: 1000,
          amountPaid: 400,
          balanceAmount: 600,
          paymentStatus: "PARTIALLY_PAID",
        },
      ],
    };

    const csv = buildReportsCsv(workspace);

    expect(csv).toContain("Summary");
    expect(csv).toContain("Revenue by doctor");
    expect(csv).toContain("Outstanding bills");
    expect(csv).toContain("Dr. Ananya Verma,2,2400,1800,600");
    expect(csv).toContain("Ward A,6,10,1,1,0,60%");
  });
});
