import { NextRequest, NextResponse } from "next/server";

import { requireApiPermissions } from "@/lib/auth/api-guard";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import {
  buildReportsCsv,
  buildReportsPdf,
  buildReportsExcelHtml,
  buildReportsXlsx,
  buildReportsPrintHtml,
  listReportsWorkspace,
} from "@/lib/reports/service";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");
  const guard = await requireApiPermissions(
    format ? ["reports.export"] : ["reports.view"],
  );

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = await listReportsWorkspace();

    if (format === "csv") {
      return new NextResponse(buildReportsCsv(payload), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vhms-reports-${
            new Date().toISOString().slice(0, 10)
          }.csv"`,
        },
      });
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="vhms-reports-${
            new Date().toISOString().slice(0, 10)
          }.json"`,
        },
      });
    }

    if (format === "xls") {
      return new NextResponse(buildReportsExcelHtml(payload), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="vhms-reports-${
            new Date().toISOString().slice(0, 10)
          }.xls"`,
        },
      });
    }

    if (format === "xlsx") {
      return new NextResponse(buildReportsXlsx(payload), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="vhms-reports-${
            new Date().toISOString().slice(0, 10)
          }.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      return new NextResponse(await buildReportsPdf(payload), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="vhms-reports-${
            new Date().toISOString().slice(0, 10)
          }.pdf"`,
        },
      });
    }

    if (format === "print") {
      return new NextResponse(buildReportsPrintHtml(payload), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
