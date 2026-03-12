import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { admissions, beds, doctors, patients, rooms, wards } from "@/db/schema";
import type { ClinicalAdmissionLookup } from "@/types/clinical";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toAdmissionLookup(row: {
  admissions: typeof admissions.$inferSelect;
  patients: typeof patients.$inferSelect;
  doctors: typeof doctors.$inferSelect | null;
  beds: typeof beds.$inferSelect | null;
  rooms: typeof rooms.$inferSelect | null;
  wards: typeof wards.$inferSelect | null;
}): ClinicalAdmissionLookup {
  return {
    id: row.admissions.id,
    patientId: row.patients.id,
    patientName: [row.patients.firstName, row.patients.lastName].filter(Boolean)
      .join(" "),
    patientHospitalNumber: row.patients.hospitalNumber,
    doctorId: row.doctors?.id ?? null,
    doctorName: row.doctors?.fullName ?? null,
    bedId: row.beds?.id ?? null,
    bedNumber: row.beds?.bedNumber ?? null,
    roomNumber: row.rooms?.roomNumber ?? null,
    wardName: row.wards?.name ?? null,
    admittedAt: row.admissions.admittedAt.toISOString(),
    dischargedAt: toIsoString(row.admissions.dischargedAt ?? null),
    status: row.admissions.status,
  };
}

export async function listAdmissionLookups(): Promise<
  ClinicalAdmissionLookup[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(admissions)
    .innerJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
    .leftJoin(beds, eq(admissions.bedId, beds.id))
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(beds.wardId, wards.id))
    .orderBy(desc(admissions.admittedAt));

  return rows.map(toAdmissionLookup);
}
