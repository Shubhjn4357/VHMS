import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import type { PermissionKey } from "@/constants/permissions";
import { getDb } from "@/db/client";
import {
  admissions,
  appointments,
  beds,
  bills,
  departments,
  doctors,
  patients,
  rooms,
  staffAccess,
  wards,
} from "@/db/schema";
import type {
  BarcodeLookupResponse,
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchSection,
  SearchResultKind,
} from "@/types/search";

const SECTION_LABELS: Record<SearchResultKind, string> = {
  patient: "Patients",
  doctor: "Doctors",
  appointment: "Appointments",
  bill: "Bills",
  ward: "Wards",
  room: "Rooms",
  bed: "Beds",
  staffAccess: "Staff Access",
};

export function normalizeSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

export function includesSearchQuery(
  values: Array<string | null | undefined>,
  query: string,
) {
  return values.some((value) => (value ?? "").toLowerCase().includes(query));
}

export function hasExactSearchMatch(
  values: Array<string | null | undefined>,
  query: string,
) {
  return values.some((value) => (value ?? "").trim().toLowerCase() === query);
}

function formatDateTime(value: Date | null) {
  return value
    ? value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "No schedule";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function searchPatients(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select()
    .from(patients)
    .where(
      or(
        ilike(patients.firstName, likeQuery),
        ilike(patients.lastName, likeQuery),
        ilike(patients.hospitalNumber, likeQuery),
        ilike(patients.phone, likeQuery),
        ilike(patients.email, likeQuery),
        ilike(patients.city, likeQuery),
        ilike(patients.state, likeQuery),
      ),
    )
    .orderBy(desc(patients.updatedAt), asc(patients.firstName))
    .limit(5);

  return rows
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "patient",
        title: [row.firstName, row.lastName].filter(Boolean).join(" "),
        subtitle: `${row.hospitalNumber} | ${
          row.phone ?? row.city ?? "Patient record"
        }`,
        badge: "Patient",
        href: `/dashboard/patients?q=${encodeURIComponent(row.hospitalNumber)}`,
        exactMatch: hasExactSearchMatch(
          [row.hospitalNumber, row.phone, row.email, row.id],
          query,
        ),
      }),
    );
}

async function searchAppointments(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: appointments.id,
      scheduledFor: appointments.scheduledFor,
      status: appointments.status,
      queueNumber: appointments.queueNumber,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientHospitalNumber: patients.hospitalNumber,
      doctorName: doctors.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(
      or(
        ilike(patients.firstName, likeQuery),
        ilike(patients.lastName, likeQuery),
        ilike(patients.hospitalNumber, likeQuery),
        ilike(doctors.fullName, likeQuery),
        ilike(appointments.status, likeQuery),
        sql<boolean>`cast(${appointments.queueNumber} as text) ilike ${likeQuery}`,
        ilike(appointments.id, likeQuery),
      ),
    )
    .orderBy(desc(appointments.scheduledFor))
    .limit(5);

  return rows
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "appointment",
        title: [row.patientFirstName, row.patientLastName].filter(Boolean).join(
          " ",
        ),
        subtitle: `${row.doctorName ?? "Doctor pending"} | ${
          formatDateTime(row.scheduledFor)
        }`,
        badge: row.status.replaceAll("_", " "),
        href: `/dashboard/appointments?q=${
          encodeURIComponent(row.patientHospitalNumber)
        }`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.patientHospitalNumber, row.queueNumber?.toString()],
          query,
        ),
      }),
    );
}

async function searchDoctors(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: doctors.id,
      fullName: doctors.fullName,
      specialty: doctors.specialty,
      designation: doctors.designation,
      email: doctors.email,
      phone: doctors.phone,
      departmentName: departments.name,
    })
    .from(doctors)
    .leftJoin(departments, eq(doctors.departmentId, departments.id))
    .where(
      or(
        ilike(doctors.id, likeQuery),
        ilike(doctors.fullName, likeQuery),
        ilike(doctors.specialty, likeQuery),
        ilike(doctors.designation, likeQuery),
        ilike(doctors.email, likeQuery),
        ilike(doctors.phone, likeQuery),
        ilike(departments.name, likeQuery),
      ),
    )
    .orderBy(asc(doctors.fullName));

  return rows
    .slice(0, 5)
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "doctor",
        title: row.fullName,
        subtitle: [row.designation, row.specialty, row.departmentName]
          .filter(Boolean)
          .join(" | ") || "Doctor master",
        badge: "Doctor",
        href: `/dashboard/doctors?q=${encodeURIComponent(
          row.email ?? row.fullName,
        )}`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.email, row.phone, row.fullName],
          query,
        ),
      }),
    );
}

async function searchBills(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: bills.id,
      billNumber: bills.billNumber,
      totalAmount: bills.totalAmount,
      paymentStatus: bills.paymentStatus,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientHospitalNumber: patients.hospitalNumber,
    })
    .from(bills)
    .innerJoin(patients, eq(bills.patientId, patients.id))
    .where(
      or(
        ilike(bills.id, likeQuery),
        ilike(bills.billNumber, likeQuery),
        ilike(patients.firstName, likeQuery),
        ilike(patients.lastName, likeQuery),
        ilike(patients.hospitalNumber, likeQuery),
        ilike(bills.paymentStatus, likeQuery),
      ),
    )
    .orderBy(desc(bills.createdAt))
    .limit(5);

  return rows
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "bill",
        title: row.billNumber,
        subtitle: `${
          [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ")
        } | ${formatCurrency(row.totalAmount)}`,
        badge: row.paymentStatus.replaceAll("_", " "),
        href: `/dashboard/billing?q=${encodeURIComponent(row.billNumber)}`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.billNumber, row.patientHospitalNumber],
          query,
        ),
      }),
    );
}

async function searchBeds(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: beds.id,
      bedNumber: beds.bedNumber,
      status: beds.status,
      roomNumber: rooms.roomNumber,
      wardName: wards.name,
      patientFirstName: patients.firstName,
      patientLastName: patients.lastName,
      patientHospitalNumber: patients.hospitalNumber,
    })
    .from(beds)
    .leftJoin(rooms, eq(beds.roomId, rooms.id))
    .leftJoin(wards, eq(beds.wardId, wards.id))
    .leftJoin(
      admissions,
      and(
        eq(admissions.bedId, beds.id),
        eq(admissions.status, "ADMITTED"),
        isNull(admissions.dischargedAt),
      ),
    )
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .where(
      or(
        ilike(beds.id, likeQuery),
        ilike(beds.bedNumber, likeQuery),
        ilike(beds.status, likeQuery),
        ilike(rooms.roomNumber, likeQuery),
        ilike(wards.name, likeQuery),
        ilike(patients.firstName, likeQuery),
        ilike(patients.lastName, likeQuery),
        ilike(patients.hospitalNumber, likeQuery),
      ),
    )
    .orderBy(asc(wards.name), asc(rooms.roomNumber), asc(beds.bedNumber));

  return rows
    .slice(0, 5)
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "bed",
        title: [row.wardName, row.roomNumber, row.bedNumber].filter(Boolean)
          .join(" / "),
        subtitle: row.patientFirstName
          ? `${
            [row.patientFirstName, row.patientLastName].filter(Boolean).join(
              " ",
            )
          } | ${row.status}`
          : `Status ${row.status.replaceAll("_", " ")}`,
        badge: "Bed",
        href: `/dashboard/occupancy?q=${encodeURIComponent(row.bedNumber)}`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.bedNumber, row.roomNumber, row.patientHospitalNumber],
          query,
        ),
      }),
    );
}

async function searchWards(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: wards.id,
      name: wards.name,
      floor: wards.floor,
    })
    .from(wards)
    .where(
      or(
        ilike(wards.id, likeQuery),
        ilike(wards.name, likeQuery),
        ilike(wards.floor, likeQuery),
      ),
    )
    .orderBy(asc(wards.name));

  return rows
    .slice(0, 5)
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "ward",
        title: row.name,
        subtitle: row.floor ? `Floor ${row.floor}` : "Ward master",
        badge: "Ward",
        href: `/dashboard/wards?q=${encodeURIComponent(row.name)}`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.name, row.floor],
          query,
        ),
      }),
    );
}

async function searchRooms(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
      roomType: rooms.roomType,
      wardName: wards.name,
    })
    .from(rooms)
    .leftJoin(wards, eq(rooms.wardId, wards.id))
    .where(
      or(
        ilike(rooms.id, likeQuery),
        ilike(rooms.roomNumber, likeQuery),
        ilike(rooms.roomType, likeQuery),
        ilike(wards.name, likeQuery),
      ),
    )
    .orderBy(asc(wards.name), asc(rooms.roomNumber));

  return rows
    .slice(0, 5)
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "room",
        title: [row.wardName, row.roomNumber].filter(Boolean).join(" / "),
        subtitle: row.roomType || "Room master",
        badge: "Room",
        href: `/dashboard/wards?q=${encodeURIComponent(row.roomNumber)}`,
        exactMatch: hasExactSearchMatch(
          [row.id, row.roomNumber, row.wardName],
          query,
        ),
      }),
    );
}

async function searchStaffAccess(query: string) {
  const db = getDb();
  const likeQuery = `%${query}%`;
  const rows = await db
    .select()
    .from(staffAccess)
    .where(
      or(
        ilike(staffAccess.id, likeQuery),
        ilike(staffAccess.email, likeQuery),
        ilike(staffAccess.displayName, likeQuery),
        ilike(staffAccess.role, likeQuery),
        ilike(staffAccess.status, likeQuery),
      ),
    )
    .orderBy(asc(staffAccess.displayName));

  return rows
    .slice(0, 5)
    .map(
      (row): GlobalSearchResult => ({
        id: row.id,
        kind: "staffAccess",
        title: row.displayName,
        subtitle: `${row.email} | ${row.role.replaceAll("_", " ")}`,
        badge: row.status,
        href: `/dashboard/staff-access?q=${encodeURIComponent(row.email)}`,
        exactMatch: hasExactSearchMatch([row.id, row.email], query),
      }),
    );
}

export async function listGlobalSearchResults({
  query,
  permissions,
}: {
  query: string;
  permissions: PermissionKey[];
}): Promise<GlobalSearchResponse> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return {
      query: "",
      total: 0,
      exactMatches: [],
      sections: [],
    };
  }

  const tasks: Array<Promise<GlobalSearchSection>> = [];

  if (permissions.includes("patients.view")) {
    tasks.push(
      searchPatients(normalizedQuery).then((results) => ({
        kind: "patient",
        label: SECTION_LABELS.patient,
        results,
      })),
    );
  }

  if (permissions.includes("doctors.view")) {
    tasks.push(
      searchDoctors(normalizedQuery).then((results) => ({
        kind: "doctor",
        label: SECTION_LABELS.doctor,
        results,
      })),
    );
  }

  if (permissions.includes("appointments.view")) {
    tasks.push(
      searchAppointments(normalizedQuery).then((results) => ({
        kind: "appointment",
        label: SECTION_LABELS.appointment,
        results,
      })),
    );
  }

  if (permissions.includes("billing.view")) {
    tasks.push(
      searchBills(normalizedQuery).then((results) => ({
        kind: "bill",
        label: SECTION_LABELS.bill,
        results,
      })),
    );
  }

  if (permissions.includes("wards.view")) {
    tasks.push(
      searchWards(normalizedQuery).then((results) => ({
        kind: "ward",
        label: SECTION_LABELS.ward,
        results,
      })),
    );
    tasks.push(
      searchRooms(normalizedQuery).then((results) => ({
        kind: "room",
        label: SECTION_LABELS.room,
        results,
      })),
    );
  }

  if (permissions.includes("occupancy.view")) {
    tasks.push(
      searchBeds(normalizedQuery).then((results) => ({
        kind: "bed",
        label: SECTION_LABELS.bed,
        results,
      })),
    );
  }

  if (permissions.includes("staffAccess.view")) {
    tasks.push(
      searchStaffAccess(normalizedQuery).then((results) => ({
        kind: "staffAccess",
        label: SECTION_LABELS.staffAccess,
        results,
      })),
    );
  }

  const sections = (await Promise.all(tasks)).filter((section) =>
    section.results.length > 0
  );
  const results = sections.flatMap((section) => section.results);

  return {
    query: normalizedQuery,
    total: results.length,
    exactMatches: results.filter((result) => result.exactMatch),
    sections,
  };
}

export async function lookupBarcode({
  code,
  permissions,
}: {
  code: string;
  permissions: PermissionKey[];
}): Promise<BarcodeLookupResponse> {
  const search = await listGlobalSearchResults({
    query: code,
    permissions,
  });
  const exactMatches = search.exactMatches;

  return {
    code: search.query,
    total: exactMatches.length,
    redirectHref: exactMatches.length === 1 ? exactMatches[0].href : null,
    matches: exactMatches,
  };
}
