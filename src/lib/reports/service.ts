import { asc, eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb as pdfRgb } from "pdf-lib";
import * as XLSX from "xlsx";

import { APP_REPORT_COLORS } from "@/constants/appBrand";
import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  beds,
  bills,
  communicationLogs,
  doctors,
  messageQueue,
  patients,
  staffAccess,
  wards,
} from "@/db/schema";
import type {
  AppointmentStatusRow,
  CommunicationChannelRow,
  OccupancyByWardRow,
  OutstandingBillRow,
  ReportsWorkspaceResponse,
  RevenueByDoctorRow,
  StaffAccessByRoleRow,
} from "@/types/analytics";

export async function listReportsWorkspace(): Promise<
  ReportsWorkspaceResponse
> {
  const db = getDb();
  const [
    billRows,
    appointmentRows,
    communicationRows,
    bedRows,
    staffRows,
    admissionRows,
    queueRows,
  ] = await Promise.all([
    db
      .select({
        billId: bills.id,
        billNumber: bills.billNumber,
        totalAmount: bills.totalAmount,
        amountPaid: bills.amountPaid,
        paymentStatus: bills.paymentStatus,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        doctorId: doctors.id,
        doctorName: doctors.fullName,
      })
      .from(bills)
      .leftJoin(patients, eq(bills.patientId, patients.id))
      .leftJoin(appointments, eq(bills.appointmentId, appointments.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .orderBy(asc(bills.billNumber)),
    db
      .select({
        status: appointments.status,
      })
      .from(appointments),
    db
      .select({
        channel: communicationLogs.channel,
        status: communicationLogs.status,
      })
      .from(communicationLogs),
    db
      .select({
        wardId: wards.id,
        wardName: wards.name,
        bedStatus: beds.status,
      })
      .from(beds)
      .leftJoin(wards, eq(beds.wardId, wards.id)),
    db
      .select({
        role: staffAccess.role,
        status: staffAccess.status,
      })
      .from(staffAccess),
    db
      .select({
        status: admissions.status,
      })
      .from(admissions),
    db
      .select({
        status: messageQueue.status,
      })
      .from(messageQueue),
  ]);

  const doctorRevenueMap = new Map<string, RevenueByDoctorRow>();

  for (const row of billRows) {
    const doctorId = row.doctorId ?? "unassigned";
    const doctorName = row.doctorName ?? "Unassigned doctor";
    const current = doctorRevenueMap.get(doctorId) ?? {
      doctorId: row.doctorId ?? null,
      doctorName,
      bills: 0,
      totalBilled: 0,
      amountCollected: 0,
      outstandingAmount: 0,
    };

    current.bills += 1;
    current.totalBilled += row.totalAmount;
    current.amountCollected += row.amountPaid;
    current.outstandingAmount += row.totalAmount - row.amountPaid;

    doctorRevenueMap.set(doctorId, current);
  }

  const appointmentStatusMap = new Map<string, AppointmentStatusRow>();

  for (const row of appointmentRows) {
    const current = appointmentStatusMap.get(row.status) ?? {
      status: row.status,
      total: 0,
    };
    current.total += 1;
    appointmentStatusMap.set(row.status, current);
  }

  const communicationMap = new Map<string, CommunicationChannelRow>();

  for (const row of communicationRows) {
    const current = communicationMap.get(row.channel) ?? {
      channel: row.channel,
      total: 0,
      delivered: 0,
      queued: 0,
      failed: 0,
    };

    current.total += 1;

    if (row.status === "QUEUED") {
      current.queued += 1;
    }

    if (row.status === "FAILED") {
      current.failed += 1;
    }

    if (row.status === "DELIVERED" || row.status === "SENT") {
      current.delivered += 1;
    }

    communicationMap.set(row.channel, current);
  }

  const wardMap = new Map<string, OccupancyByWardRow>();

  for (const row of bedRows) {
    const wardId = row.wardId ?? "unmapped";
    const wardName = row.wardName ?? "Unmapped ward";
    const current = wardMap.get(wardId) ?? {
      wardId,
      wardName,
      occupied: 0,
      total: 0,
      reserved: 0,
      cleaning: 0,
      blocked: 0,
      occupancyRate: 0,
    };

    current.total += 1;

    if (row.bedStatus === "OCCUPIED") {
      current.occupied += 1;
    } else if (row.bedStatus === "RESERVED") {
      current.reserved += 1;
    } else if (row.bedStatus === "CLEANING") {
      current.cleaning += 1;
    } else if (row.bedStatus !== "FREE") {
      current.blocked += 1;
    }

    wardMap.set(wardId, current);
  }

  const occupancyByWard = Array.from(wardMap.values()).map((row) => ({
    ...row,
    occupancyRate: row.occupied / Math.max(row.total, 1),
  })).sort((left, right) => right.occupancyRate - left.occupancyRate);

  const staffAccessMap = new Map<string, StaffAccessByRoleRow>();

  for (const row of staffRows) {
    const current = staffAccessMap.get(row.role) ?? {
      role: row.role,
      approved: 0,
      pending: 0,
      revoked: 0,
    };

    if (row.status === "APPROVED") {
      current.approved += 1;
    } else if (row.status === "PENDING") {
      current.pending += 1;
    } else {
      current.revoked += 1;
    }

    staffAccessMap.set(row.role, current);
  }

  return {
    summary: {
      totalRevenue: billRows.reduce((sum, row) => sum + row.totalAmount, 0),
      amountCollected: billRows.reduce((sum, row) => sum + row.amountPaid, 0),
      outstandingAmount: billRows.reduce(
        (sum, row) => sum + (row.totalAmount - row.amountPaid),
        0,
      ),
      activeAdmissions: admissionRows.filter((row) => row.status === "ADMITTED")
        .length,
      queuedMessages: queueRows.filter((row) => row.status === "QUEUED").length,
      failedMessages: queueRows.filter((row) => row.status === "FAILED").length,
    },
    revenueByDoctor: Array.from(doctorRevenueMap.values()).sort((left, right) =>
      right.totalBilled - left.totalBilled
    ),
    appointmentStatus: Array.from(appointmentStatusMap.values()).sort(
      (left, right) => right.total - left.total,
    ),
    communicationByChannel: Array.from(communicationMap.values()).sort(
      (left, right) => right.total - left.total,
    ),
    occupancyByWard,
    staffAccessByRole: Array.from(staffAccessMap.values()).sort((left, right) =>
      left.role.localeCompare(right.role)
    ),
    outstandingBills: billRows
      .map(
        (row): OutstandingBillRow => ({
          billId: row.billId,
          billNumber: row.billNumber,
          patientName: [row.patientFirstName, row.patientLastName]
            .filter(Boolean)
            .join(" ") || "Unknown patient",
          totalAmount: row.totalAmount,
          amountPaid: row.amountPaid,
          balanceAmount: row.totalAmount - row.amountPaid,
          paymentStatus: row.paymentStatus,
        }),
      )
      .filter((row) => row.balanceAmount > 0)
      .sort((left, right) => right.balanceAmount - left.balanceAmount),
  };
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function appendSection(
  lines: string[],
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  lines.push(title);
  lines.push(headers.map(csvEscape).join(","));

  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }

  lines.push("");
}

export function buildReportsCsv(workspace: ReportsWorkspaceResponse) {
  const lines: string[] = [];

  appendSection(lines, "Summary", ["Metric", "Value"], [
    ["Total revenue", workspace.summary.totalRevenue],
    ["Amount collected", workspace.summary.amountCollected],
    ["Outstanding amount", workspace.summary.outstandingAmount],
    ["Active admissions", workspace.summary.activeAdmissions],
    ["Queued messages", workspace.summary.queuedMessages],
    ["Failed messages", workspace.summary.failedMessages],
  ]);

  appendSection(
    lines,
    "Revenue by doctor",
    ["Doctor", "Bills", "Total billed", "Amount collected", "Outstanding"],
    workspace.revenueByDoctor.map((row) => [
      row.doctorName,
      row.bills,
      row.totalBilled,
      row.amountCollected,
      row.outstandingAmount,
    ]),
  );

  appendSection(
    lines,
    "Appointment status",
    ["Status", "Total"],
    workspace.appointmentStatus.map((row) => [row.status, row.total]),
  );

  appendSection(
    lines,
    "Communication by channel",
    ["Channel", "Total", "Delivered", "Queued", "Failed"],
    workspace.communicationByChannel.map((row) => [
      row.channel,
      row.total,
      row.delivered,
      row.queued,
      row.failed,
    ]),
  );

  appendSection(
    lines,
    "Occupancy by ward",
    ["Ward", "Occupied", "Total", "Reserved", "Cleaning", "Blocked", "Rate"],
    workspace.occupancyByWard.map((row) => [
      row.wardName,
      row.occupied,
      row.total,
      row.reserved,
      row.cleaning,
      row.blocked,
      `${Math.round(row.occupancyRate * 100)}%`,
    ]),
  );

  appendSection(
    lines,
    "Outstanding bills",
    ["Bill number", "Patient", "Total", "Paid", "Balance", "Payment status"],
    workspace.outstandingBills.map((row) => [
      row.billNumber,
      row.patientName,
      row.totalAmount,
      row.amountPaid,
      row.balanceAmount,
      row.paymentStatus,
    ]),
  );

  return lines.join("\n");
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toPdfColor(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((value) => `${value}${value}`).join("")
    : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const green = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(expanded.slice(4, 6), 16) / 255;

  return pdfRgb(red, green, blue);
}

function buildTableHtml(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const headerCells = headers.map((header) =>
    `<th>${escapeHtml(header)}</th>`
  ).join("");
  const bodyRows = rows.map((row) =>
    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
  ).join("");

  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </section>
  `;
}

function buildReportsHtmlBody(workspace: ReportsWorkspaceResponse) {
  return [
    buildTableHtml("Summary", ["Metric", "Value"], [
      ["Total revenue", workspace.summary.totalRevenue],
      ["Amount collected", workspace.summary.amountCollected],
      ["Outstanding amount", workspace.summary.outstandingAmount],
      ["Active admissions", workspace.summary.activeAdmissions],
      ["Queued messages", workspace.summary.queuedMessages],
      ["Failed messages", workspace.summary.failedMessages],
    ]),
    buildTableHtml(
      "Revenue by doctor",
      ["Doctor", "Bills", "Total billed", "Amount collected", "Outstanding"],
      workspace.revenueByDoctor.map((row) => [
        row.doctorName,
        row.bills,
        row.totalBilled,
        row.amountCollected,
        row.outstandingAmount,
      ]),
    ),
    buildTableHtml(
      "Appointment status",
      ["Status", "Total"],
      workspace.appointmentStatus.map((row) => [row.status, row.total]),
    ),
    buildTableHtml(
      "Communication by channel",
      ["Channel", "Total", "Delivered", "Queued", "Failed"],
      workspace.communicationByChannel.map((row) => [
        row.channel,
        row.total,
        row.delivered,
        row.queued,
        row.failed,
      ]),
    ),
    buildTableHtml(
      "Occupancy by ward",
      ["Ward", "Occupied", "Total", "Reserved", "Cleaning", "Blocked", "Rate"],
      workspace.occupancyByWard.map((row) => [
        row.wardName,
        row.occupied,
        row.total,
        row.reserved,
        row.cleaning,
        row.blocked,
        `${Math.round(row.occupancyRate * 100)}%`,
      ]),
    ),
    buildTableHtml(
      "Outstanding bills",
      ["Bill number", "Patient", "Total", "Paid", "Balance", "Payment status"],
      workspace.outstandingBills.map((row) => [
        row.billNumber,
        row.patientName,
        row.totalAmount,
        row.amountPaid,
        row.balanceAmount,
        row.paymentStatus,
      ]),
    ),
  ].join("");
}

export function buildReportsPrintHtml(workspace: ReportsWorkspaceResponse) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VHMS Reports</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: ${APP_REPORT_COLORS.body}; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p.meta { margin: 0 0 24px; color: ${APP_REPORT_COLORS.meta}; }
      section { margin-bottom: 28px; }
      h2 { margin: 0 0 12px; font-size: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid ${APP_REPORT_COLORS.border}; padding: 8px; text-align: left; }
      th { background: ${APP_REPORT_COLORS.surface}; }
      @media print {
        body { margin: 12mm; }
      }
    </style>
  </head>
  <body>
    <h1>VHMS Operational Reports</h1>
    <p class="meta">Generated ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
    ${buildReportsHtmlBody(workspace)}
  </body>
</html>`;
}

export function buildReportsExcelHtml(workspace: ReportsWorkspaceResponse) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VHMS Reports Export</title>
  </head>
  <body>
    ${buildReportsHtmlBody(workspace)}
  </body>
</html>`;
}

function buildWorkbookSheet(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  return XLSX.utils.aoa_to_sheet([
    [title],
    [],
    headers,
    ...rows,
  ]);
}

export function buildReportsXlsx(workspace: ReportsWorkspaceResponse) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet("Summary", ["Metric", "Value"], [
      ["Total revenue", workspace.summary.totalRevenue],
      ["Amount collected", workspace.summary.amountCollected],
      ["Outstanding amount", workspace.summary.outstandingAmount],
      ["Active admissions", workspace.summary.activeAdmissions],
      ["Queued messages", workspace.summary.queuedMessages],
      ["Failed messages", workspace.summary.failedMessages],
    ]),
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet(
      "Revenue by doctor",
      ["Doctor", "Bills", "Total billed", "Amount collected", "Outstanding"],
      workspace.revenueByDoctor.map((row) => [
        row.doctorName,
        row.bills,
        row.totalBilled,
        row.amountCollected,
        row.outstandingAmount,
      ]),
    ),
    "Revenue",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet(
      "Appointment status",
      ["Status", "Total"],
      workspace.appointmentStatus.map((row) => [row.status, row.total]),
    ),
    "Appointments",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet(
      "Communication by channel",
      ["Channel", "Total", "Delivered", "Queued", "Failed"],
      workspace.communicationByChannel.map((row) => [
        row.channel,
        row.total,
        row.delivered,
        row.queued,
        row.failed,
      ]),
    ),
    "Communications",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet(
      "Occupancy by ward",
      ["Ward", "Occupied", "Total", "Reserved", "Cleaning", "Blocked", "Rate"],
      workspace.occupancyByWard.map((row) => [
        row.wardName,
        row.occupied,
        row.total,
        row.reserved,
        row.cleaning,
        row.blocked,
        `${Math.round(row.occupancyRate * 100)}%`,
      ]),
    ),
    "Occupancy",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorkbookSheet(
      "Outstanding bills",
      ["Bill number", "Patient", "Total", "Paid", "Balance", "Payment status"],
      workspace.outstandingBills.map((row) => [
        row.billNumber,
        row.patientName,
        row.totalAmount,
        row.amountPaid,
        row.balanceAmount,
        row.paymentStatus,
      ]),
    ),
    "Outstanding",
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pdfRows(workspace: ReportsWorkspaceResponse) {
  return [
    {
      title: "Summary",
      rows: [
        `Total revenue: ${formatCurrency(workspace.summary.totalRevenue)}`,
        `Amount collected: ${formatCurrency(workspace.summary.amountCollected)}`,
        `Outstanding amount: ${formatCurrency(workspace.summary.outstandingAmount)}`,
        `Active admissions: ${workspace.summary.activeAdmissions}`,
        `Queued messages: ${workspace.summary.queuedMessages}`,
        `Failed messages: ${workspace.summary.failedMessages}`,
      ],
    },
    {
      title: "Revenue by doctor",
      rows: workspace.revenueByDoctor.map((row) =>
        `${row.doctorName} | bills ${row.bills} | billed ${formatCurrency(row.totalBilled)} | collected ${formatCurrency(row.amountCollected)} | outstanding ${formatCurrency(row.outstandingAmount)}`
      ),
    },
    {
      title: "Appointment status",
      rows: workspace.appointmentStatus.map((row) => `${row.status}: ${row.total}`),
    },
    {
      title: "Communication by channel",
      rows: workspace.communicationByChannel.map((row) =>
        `${row.channel} | total ${row.total} | delivered ${row.delivered} | queued ${row.queued} | failed ${row.failed}`
      ),
    },
    {
      title: "Occupancy by ward",
      rows: workspace.occupancyByWard.map((row) =>
        `${row.wardName} | occupied ${row.occupied}/${row.total} | reserved ${row.reserved} | cleaning ${row.cleaning} | blocked ${row.blocked} | rate ${Math.round(row.occupancyRate * 100)}%`
      ),
    },
    {
      title: "Outstanding bills",
      rows: workspace.outstandingBills.map((row) =>
        `${row.billNumber} | ${row.patientName} | balance ${formatCurrency(row.balanceAmount)} | status ${row.paymentStatus}`
      ),
    },
  ];
}

export async function buildReportsPdf(workspace: ReportsWorkspaceResponse) {
  const document = await PDFDocument.create();
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([841.89, 595.28]);
  let y = 560;
  const margin = 36;
  const lineHeight = 16;

  function addPage() {
    page = document.addPage([841.89, 595.28]);
    y = 560;
  }

  function drawText(value: string, options: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof pdfRgb>;
    indent?: number;
  } = {}) {
    if (y < 44) {
      addPage();
    }

    page.drawText(value, {
      x: margin + (options.indent ?? 0),
      y,
      size: options.size ?? 10,
      font: options.bold ? boldFont : regularFont,
      color: options.color ?? toPdfColor(APP_REPORT_COLORS.title),
    });
    y -= lineHeight;
  }

  drawText("VHMS Operational Reports", {
    size: 18,
    bold: true,
    color: toPdfColor(APP_REPORT_COLORS.accent),
  });
  drawText(`Generated ${new Date().toLocaleString("en-IN")}`, {
    size: 10,
    color: toPdfColor(APP_REPORT_COLORS.meta),
  });
  y -= 8;

  for (const section of pdfRows(workspace)) {
    drawText(section.title, {
      size: 13,
      bold: true,
      color: toPdfColor(APP_REPORT_COLORS.title),
    });

    for (const row of section.rows) {
      const wrappedLines = row.match(/.{1,110}(\s|$)/g) ?? [row];
      for (const line of wrappedLines) {
        drawText(line.trim(), {
          indent: 10,
          size: 10,
          color: toPdfColor(APP_REPORT_COLORS.body),
        });
      }
    }

    y -= 6;
  }

  return Buffer.from(await document.save());
}
