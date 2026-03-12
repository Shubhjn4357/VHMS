import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { hospitalProfile } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import type {
  HospitalProfileRecord,
  HospitalProfileUpdateInput,
} from "@/types/hospital";
import type { HospitalBrandingRecord } from "@/types/print";

function toHospitalProfileRecord(
  row?: typeof hospitalProfile.$inferSelect | null,
): HospitalProfileRecord {
  return {
    id: row?.id ?? null,
    legalName: row?.legalName ?? "Vahi Hospital and Medical Services Pvt. Ltd.",
    displayName: row?.displayName ?? "Vahi Hospital",
    registrationNumber: row?.registrationNumber ?? null,
    contactEmail: row?.contactEmail ?? null,
    contactPhone: row?.contactPhone ?? null,
    address: row?.address ?? null,
    logoUrl: row?.logoUrl ?? null,
    letterheadFooter: row?.letterheadFooter ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
}

export async function getHospitalProfile(): Promise<HospitalProfileRecord> {
  const db = getDb();
  const [row] = await db.select().from(hospitalProfile).limit(1);

  return toHospitalProfileRecord(row);
}

export async function getHospitalBranding(): Promise<HospitalBrandingRecord> {
  return getHospitalProfile();
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateHospitalProfile(
  input: HospitalProfileUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db.select().from(hospitalProfile).limit(1);
  const now = new Date();

  if (existingRow) {
    await db
      .update(hospitalProfile)
      .set({
        legalName: input.legalName.trim(),
        displayName: input.displayName.trim(),
        registrationNumber: normalizeOptional(input.registrationNumber),
        contactEmail: normalizeOptional(input.contactEmail)?.toLowerCase() ?? null,
        contactPhone: normalizeOptional(input.contactPhone),
        address: normalizeOptional(input.address),
        logoUrl: normalizeOptional(input.logoUrl),
        letterheadFooter: normalizeOptional(input.letterheadFooter),
        updatedAt: now,
      })
      .where(eq(hospitalProfile.id, existingRow.id));
  } else {
    await db.insert(hospitalProfile).values({
      legalName: input.legalName.trim(),
      displayName: input.displayName.trim(),
      registrationNumber: normalizeOptional(input.registrationNumber),
      contactEmail: normalizeOptional(input.contactEmail)?.toLowerCase() ?? null,
      contactPhone: normalizeOptional(input.contactPhone),
      address: normalizeOptional(input.address),
      logoUrl: normalizeOptional(input.logoUrl),
      letterheadFooter: normalizeOptional(input.letterheadFooter),
      updatedAt: now,
    });
  }

  await recordAuditLog({
    actorUserId,
    action: "hospitalProfile.updated",
    entityType: "hospital_profile",
    entityId: existingRow?.id ?? "hospital_profile",
    metadata: {
      displayName: input.displayName.trim(),
      legalName: input.legalName.trim(),
      logoUrl: normalizeOptional(input.logoUrl),
    },
  });

  return getHospitalProfile();
}
