import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { createAppointment } from "@/lib/appointments/service";
import { createBill } from "@/lib/billing/service";
import { createPatient } from "@/lib/patients/service";
import { hasPermission } from "@/lib/permissions/ability";
import { createAppointmentSchema } from "@/lib/validators/appointments";
import { createBillSchema } from "@/lib/validators/billing";
import { createPatientSchema } from "@/lib/validators/patients";
import { toRouteErrorResponse } from "@/lib/api/route-errors";
import { ApiError } from "@/lib/api/errors";
import { requireApiAnyPermission } from "@/lib/auth/api-guard";
import { logInfo } from "@/lib/observability/logger";
import type { OfflineSyncResponse } from "@/types/offline";

const syncRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["patients.create", "appointments.create", "bills.createDraft"]),
    payload: z.unknown(),
  })).min(1).max(50),
});

const offlineActionPermissions = {
  "patients.create": "patients.create",
  "appointments.create": "appointments.create",
  "bills.createDraft": "billing.create",
} as const;

export async function POST(request: NextRequest) {
  const guard = await requireApiAnyPermission([
    "patients.create",
    "appointments.create",
    "billing.create",
  ]);

  if (guard.response) {
    return guard.response;
  }

  try {
    const payload = syncRequestSchema.parse(await request.json());
    const permissions = guard.session?.user.permissions ?? [];
    const results: OfflineSyncResponse["results"] = [];

    for (const item of payload.items) {
      const requiredPermission = offlineActionPermissions[item.type];

      if (!hasPermission(permissions, requiredPermission)) {
        results.push({
          id: item.id,
          status: "FAILED",
          retryable: false,
          message: `Missing ${requiredPermission} permission.`,
        });
        continue;
      }

      try {
        if (item.type === "patients.create") {
          const parsed = createPatientSchema.parse(item.payload);
          await createPatient(parsed, guard.session?.user.id);
        }

        if (item.type === "appointments.create") {
          const parsed = createAppointmentSchema.parse(item.payload);
          await createAppointment(parsed, guard.session?.user.id);
        }

        if (item.type === "bills.createDraft") {
          const parsed = createBillSchema.parse(item.payload);
          await createBill(parsed, guard.session?.user.id);
        }

        results.push({
          id: item.id,
          status: "COMPLETED",
          retryable: false,
          message: null,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          results.push({
            id: item.id,
            status: "FAILED",
            retryable: false,
            message: "Offline payload is invalid.",
          });
          continue;
        }

        if (error instanceof ApiError) {
          results.push({
            id: item.id,
            status: "FAILED",
            retryable: error.status >= 500,
            message: error.message,
          });
          continue;
        }

        results.push({
          id: item.id,
          status: "FAILED",
          retryable: true,
          message: error instanceof Error ? error.message : "Offline sync failed.",
        });
      }
    }

    logInfo("offline_sync.processed", {
      actorUserId: guard.session?.user.id,
      batchSize: payload.items.length,
      completed: results.filter((item) => item.status === "COMPLETED").length,
      failed: results.filter((item) => item.status === "FAILED").length,
    });

    return NextResponse.json({
      results,
      syncedAt: new Date().toISOString(),
    } satisfies OfflineSyncResponse);
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}
