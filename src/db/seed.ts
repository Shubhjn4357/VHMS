import { eq, inArray, sql } from "drizzle-orm";

import { CHARGE_CATEGORIES } from "../constants/chargeCategories";
import {
  FEATURE_FLAG_DEFAULTS,
  type FeatureFlagKey,
} from "../constants/featureFlags";
import type { AppRole } from "../constants/roles";
import { STAFF_ACCESS_DEFAULTS } from "../constants/staffAccessDefaults";
import { getDb } from "./client";
import {
  admissions,
  announcementPosts,
  announcementTargets,
  appointments,
  auditLogs,
  beds,
  billItems,
  bills,
  blogCategories,
  blogPosts,
  chargeCategories,
  charges,
  communicationLogs,
  communicationTemplates,
  consentDocuments,
  consentSignatures,
  consentTemplates,
  departments,
  dischargeSummaries,
  dischargeSummaryVersions,
  doctors,
  featureFlags,
  hospitalProfile,
  messageQueue,
  notificationCenterItems,
  patients,
  rooms,
  staffAccess,
  users,
  wards,
} from "./schema";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function seed() {
  const db = getDb();

  await db.insert(hospitalProfile).values({
    legalName: "Vahi Hospital and Medical Services Pvt. Ltd.",
    displayName: "Vahi Hospital",
    registrationNumber: "VHMS-REG-2026",
    contactEmail: "ops@vahi-hospital.test",
    contactPhone: "+91-9876543210",
    address: "Sector 12, Jaipur, Rajasthan",
    logoUrl: "/icon.svg",
    letterheadFooter: "24x7 emergency care | NABH workflow ready",
  }).onConflictDoNothing();

  await db
    .insert(departments)
    .values([
      { name: "General Medicine" },
      { name: "Cardiology" },
      { name: "Orthopedics" },
      { name: "Neurology" },
    ])
    .onConflictDoNothing();

  const departmentRows = await db.select().from(departments);

  const departmentMap = new Map(
    departmentRows.map((department) => [department.name, department.id]),
  );

  for (
    const [role, config] of Object.entries(STAFF_ACCESS_DEFAULTS) as [
      AppRole,
      (typeof STAFF_ACCESS_DEFAULTS)[AppRole],
    ][]
  ) {
    await db
      .insert(staffAccess)
      .values({
        email: `${role.toLowerCase()}@vahi-hospital.test`,
        displayName: role.replaceAll("_", " "),
        role,
        status: config.status,
        defaultPermissions: JSON.stringify(config.defaultPermissions),
        approvedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: staffAccess.email,
        set: {
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          status: sql`excluded.status`,
          defaultPermissions: sql`excluded.default_permissions`,
          approvedAt: sql`excluded.approved_at`,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(users)
    .values([
      {
        id: "usr_admin_seed",
        email: "admin@vahi-hospital.test",
        name: "Admin Control",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        id: "usr_billing_seed",
        email: "billing_staff@vahi-hospital.test",
        name: "Billing Desk",
        role: "BILLING_STAFF",
        status: "ACTIVE",
      },
      {
        id: "usr_reception_seed",
        email: "reception_staff@vahi-hospital.test",
        name: "Reception Command",
        role: "RECEPTION_STAFF",
        status: "ACTIVE",
      },
      {
        id: "usr_auditor_seed",
        email: "auditor@vahi-hospital.test",
        name: "Audit Review",
        role: "AUDITOR",
        status: "ACTIVE",
      },
    ])
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: sql`excluded.name`,
        role: sql`excluded.role`,
        status: sql`excluded.status`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(doctors)
    .values([
      {
        id: "doc_verma",
        fullName: "Dr. Ananya Verma",
        designation: "Senior Consultant",
        specialty: "Internal Medicine",
        consultationFee: 700,
        departmentId: departmentMap.get("General Medicine"),
      },
      {
        id: "doc_gupta",
        fullName: "Dr. Prateek Gupta",
        designation: "Consultant Cardiologist",
        specialty: "Cardiology",
        consultationFee: 1200,
        departmentId: departmentMap.get("Cardiology"),
      },
      {
        id: "doc_rathi",
        fullName: "Dr. Nihar Rathi",
        designation: "Neurology Consultant",
        specialty: "Neurology",
        consultationFee: 1100,
        departmentId: departmentMap.get("Neurology"),
      },
      {
        id: "doc_iyer",
        fullName: "Dr. Radhika Iyer",
        designation: "Orthopedic Surgeon",
        specialty: "Orthopedics",
        consultationFee: 950,
        departmentId: departmentMap.get("Orthopedics"),
      },
    ])
    .onConflictDoUpdate({
      target: doctors.id,
      set: {
        fullName: sql`excluded.full_name`,
        designation: sql`excluded.designation`,
        specialty: sql`excluded.specialty`,
        consultationFee: sql`excluded.consultation_fee`,
        departmentId: sql`excluded.department_id`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(wards)
    .values([
      { name: "ICU", floor: "1" },
      { name: "Ward A", floor: "2" },
      { name: "Ward B", floor: "3" },
      { name: "Private", floor: "4" },
    ])
    .onConflictDoNothing();

  const wardRows = await db.select().from(wards);
  const wardMap = new Map(wardRows.map((ward) => [ward.name, ward.id]));

  const seededRooms = [
    {
      id: "room_icu_01",
      wardId: wardMap.get("ICU"),
      roomNumber: "ICU-01",
      roomType: "Critical Care",
      dailyCharge: 8000,
    },
    {
      id: "room_icu_02",
      wardId: wardMap.get("ICU"),
      roomNumber: "ICU-02",
      roomType: "Critical Care",
      dailyCharge: 7600,
    },
    {
      id: "room_ward_a_201",
      wardId: wardMap.get("Ward A"),
      roomNumber: "A-201",
      roomType: "Twin Sharing",
      dailyCharge: 2600,
    },
    {
      id: "room_ward_a_202",
      wardId: wardMap.get("Ward A"),
      roomNumber: "A-202",
      roomType: "Twin Sharing",
      dailyCharge: 2600,
    },
    {
      id: "room_ward_b_301",
      wardId: wardMap.get("Ward B"),
      roomNumber: "B-301",
      roomType: "General Ward",
      dailyCharge: 1800,
    },
    {
      id: "room_private_401",
      wardId: wardMap.get("Private"),
      roomNumber: "P-401",
      roomType: "Single Deluxe",
      dailyCharge: 5200,
    },
  ];

  const seededBeds = [
    {
      id: "bed_icu_01_a",
      wardId: wardMap.get("ICU"),
      roomId: "room_icu_01",
      bedNumber: "ICU-01-A",
      status: "OCCUPIED" as const,
    },
    {
      id: "bed_icu_01_b",
      wardId: wardMap.get("ICU"),
      roomId: "room_icu_01",
      bedNumber: "ICU-01-B",
      status: "RESERVED" as const,
    },
    {
      id: "bed_icu_02_a",
      wardId: wardMap.get("ICU"),
      roomId: "room_icu_02",
      bedNumber: "ICU-02-A",
      status: "FREE" as const,
    },
    {
      id: "bed_a_201_a",
      wardId: wardMap.get("Ward A"),
      roomId: "room_ward_a_201",
      bedNumber: "A-201-A",
      status: "OCCUPIED" as const,
    },
    {
      id: "bed_a_201_b",
      wardId: wardMap.get("Ward A"),
      roomId: "room_ward_a_201",
      bedNumber: "A-201-B",
      status: "CLEANING" as const,
    },
    {
      id: "bed_a_202_a",
      wardId: wardMap.get("Ward A"),
      roomId: "room_ward_a_202",
      bedNumber: "A-202-A",
      status: "FREE" as const,
    },
    {
      id: "bed_a_202_b",
      wardId: wardMap.get("Ward A"),
      roomId: "room_ward_a_202",
      bedNumber: "A-202-B",
      status: "BLOCKED" as const,
    },
    {
      id: "bed_b_301_a",
      wardId: wardMap.get("Ward B"),
      roomId: "room_ward_b_301",
      bedNumber: "B-301-A",
      status: "MAINTENANCE" as const,
    },
    {
      id: "bed_b_301_b",
      wardId: wardMap.get("Ward B"),
      roomId: "room_ward_b_301",
      bedNumber: "B-301-B",
      status: "FREE" as const,
    },
    {
      id: "bed_p_401_a",
      wardId: wardMap.get("Private"),
      roomId: "room_private_401",
      bedNumber: "P-401-A",
      status: "RESERVED" as const,
    },
  ];

  const seededRoomNumbers = seededRooms.map((room) => room.roomNumber);
  const seededRoomIds = new Set(seededRooms.map((room) => room.id));
  const seededBedNumbers = seededBeds.map((bed) => bed.bedNumber);
  const seededBedIds = new Set(seededBeds.map((bed) => bed.id));
  const seededRoomRows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(inArray(rooms.roomNumber, seededRoomNumbers));
  const seededBedRows = await db
    .select({ id: beds.id })
    .from(beds)
    .where(inArray(beds.bedNumber, seededBedNumbers));
  const duplicateSeededBedIds = seededBedRows
    .map((bed) => bed.id)
    .filter((id) => !seededBedIds.has(id));
  const duplicateSeededRoomIds = seededRoomRows
    .map((room) => room.id)
    .filter((id) => !seededRoomIds.has(id));

  if (duplicateSeededBedIds.length > 0) {
    await db
      .update(admissions)
      .set({ bedId: null })
      .where(inArray(admissions.bedId, duplicateSeededBedIds));

    await db
      .delete(beds)
      .where(inArray(beds.id, duplicateSeededBedIds));
  }

  if (duplicateSeededRoomIds.length > 0) {
    await db.delete(rooms).where(inArray(rooms.id, duplicateSeededRoomIds));
  }

  await db
    .insert(rooms)
    .values(seededRooms)
    .onConflictDoUpdate({
      target: rooms.id,
      set: {
        wardId: sql`excluded.ward_id`,
        roomNumber: sql`excluded.room_number`,
        roomType: sql`excluded.room_type`,
        dailyCharge: sql`excluded.daily_charge`,
      },
    });

  await db
    .insert(beds)
    .values(seededBeds)
    .onConflictDoUpdate({
      target: beds.id,
      set: {
        wardId: sql`excluded.ward_id`,
        roomId: sql`excluded.room_id`,
        bedNumber: sql`excluded.bed_number`,
        status: sql`excluded.status`,
      },
    });

  await db
    .insert(chargeCategories)
    .values(
      CHARGE_CATEGORIES.map((category) => ({
        key: category,
        label: category.replaceAll("_", " "),
      })),
    )
    .onConflictDoNothing();

  const categoryRows = await db.select().from(chargeCategories);
  const categoryMap = new Map(
    categoryRows.map((category) => [category.key, category.id]),
  );

  await db
    .insert(charges)
    .values([
      {
        categoryId: categoryMap.get("CONSULTATION"),
        name: "General Medicine Consultation",
        code: "CONS-GEN-001",
        unitPrice: 700,
        taxable: false,
      },
      {
        categoryId: categoryMap.get("CONSULTATION"),
        name: "Cardiology Consultation",
        code: "CONS-CARD-001",
        unitPrice: 1200,
        taxable: false,
      },
      {
        categoryId: categoryMap.get("LAB"),
        name: "ECG Investigation",
        code: "LAB-ECG-001",
        unitPrice: 450,
        taxable: false,
      },
      {
        categoryId: categoryMap.get("SERVICE"),
        name: "Registration and File Handling",
        code: "SERV-REG-001",
        unitPrice: 100,
        taxable: false,
      },
      {
        categoryId: categoryMap.get("PROCEDURE"),
        name: "Dressing Procedure",
        code: "PROC-DRESS-001",
        unitPrice: 350,
        taxable: false,
      },
      {
        categoryId: categoryMap.get("ROOM"),
        name: "Critical Care Room Charge",
        code: "ROOM-ICU-001",
        unitPrice: 8000,
        taxable: false,
      },
    ])
    .onConflictDoUpdate({
      target: charges.code,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        unitPrice: sql`excluded.unit_price`,
        taxable: sql`excluded.taxable`,
        active: sql`excluded.active`,
      },
    });

  await db
    .insert(featureFlags)
    .values(
      Object.entries(FEATURE_FLAG_DEFAULTS).map(([key, enabled]) => ({
        key: key as FeatureFlagKey,
        enabled,
        rolloutPercentage: 100,
        targetRoles: "[]",
        description: `${key} feature flag`,
      })),
    )
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: {
        enabled: sql`excluded.enabled`,
        rolloutPercentage: sql`excluded.rollout_percentage`,
        targetRoles: sql`excluded.target_roles`,
        description: sql`excluded.description`,
        updatedAt: new Date(),
      },
    });

  const seededPatients = [
    {
      id: "pat_ritika",
      hospitalNumber: "VHMS-20260310-1001",
      firstName: "Ritika",
      lastName: "Sharma",
      gender: "FEMALE" as const,
      dateOfBirth: "1992-08-16",
      phone: "+91-9876500011",
      email: "ritika.sharma@example.com",
      city: "Jaipur",
      state: "Rajasthan",
      bloodGroup: "B+" as const,
      emergencyContact: "Sonal Sharma - +91-9876500099",
      notes: "Returning OPD patient.",
    },
    {
      id: "pat_nasir",
      hospitalNumber: "VHMS-20260310-1002",
      firstName: "Nasir",
      lastName: "Khan",
      gender: "MALE" as const,
      dateOfBirth: "1986-01-12",
      phone: "+91-9876500012",
      city: "Jaipur",
      state: "Rajasthan",
      bloodGroup: "O+" as const,
      emergencyContact: "Amina Khan - +91-9876500098",
      notes: "Cardiology follow-up.",
    },
    {
      id: "pat_aviral",
      hospitalNumber: "VHMS-20260310-1003",
      firstName: "Aviral",
      lastName: "Soni",
      gender: "MALE" as const,
      dateOfBirth: "2001-03-05",
      phone: "+91-9876500013",
      city: "Jaipur",
      state: "Rajasthan",
      bloodGroup: "A+" as const,
      notes: "Walk-in neurology consult.",
    },
    {
      id: "pat_leena",
      hospitalNumber: "VHMS-20260310-1004",
      firstName: "Leena",
      lastName: "Patel",
      gender: "FEMALE" as const,
      dateOfBirth: "1978-11-22",
      phone: "+91-9876500014",
      city: "Jaipur",
      state: "Rajasthan",
      bloodGroup: "AB+" as const,
      emergencyContact: "Rakesh Patel - +91-9876500097",
      notes: "Orthopedic review after discharge.",
    },
  ];

  await db
    .insert(patients)
    .values(seededPatients)
    .onConflictDoUpdate({
      target: patients.id,
      set: {
        hospitalNumber: sql`excluded.hospital_number`,
        firstName: sql`excluded.first_name`,
        lastName: sql`excluded.last_name`,
        gender: sql`excluded.gender`,
        dateOfBirth: sql`excluded.date_of_birth`,
        phone: sql`excluded.phone`,
        email: sql`excluded.email`,
        city: sql`excluded.city`,
        state: sql`excluded.state`,
        emergencyContact: sql`excluded.emergency_contact`,
        bloodGroup: sql`excluded.blood_group`,
        notes: sql`excluded.notes`,
        updatedAt: new Date(),
      },
    });

  const seededAdmissions = [
    {
      id: "adm_nasir_icu",
      patientId: "pat_nasir",
      bedId: "bed_icu_01_a",
      attendingDoctorId: "doc_gupta",
      admittedAt: new Date("2026-03-10T04:10:00.000Z"),
      dischargedAt: null,
      status: "ADMITTED",
    },
    {
      id: "adm_leena_recovery",
      patientId: "pat_leena",
      bedId: "bed_a_201_a",
      attendingDoctorId: "doc_iyer",
      admittedAt: new Date("2026-03-09T12:45:00.000Z"),
      dischargedAt: null,
      status: "ADMITTED",
    },
    {
      id: "adm_ritika_discharged",
      patientId: "pat_ritika",
      bedId: null,
      attendingDoctorId: "doc_verma",
      admittedAt: new Date("2026-03-04T08:20:00.000Z"),
      dischargedAt: new Date("2026-03-06T10:30:00.000Z"),
      status: "DISCHARGED",
    },
  ];

  await db
    .insert(admissions)
    .values(seededAdmissions)
    .onConflictDoUpdate({
      target: admissions.id,
      set: {
        patientId: sql`excluded.patient_id`,
        bedId: sql`excluded.bed_id`,
        attendingDoctorId: sql`excluded.attending_doctor_id`,
        admittedAt: sql`excluded.admitted_at`,
        dischargedAt: sql`excluded.discharged_at`,
        status: sql`excluded.status`,
      },
    });

  const seededDischargeSummaries = [
    {
      id: "dcs_ritika_final",
      admissionId: "adm_ritika_discharged",
      status: "FINALIZED" as const,
      diagnosis: "Viral febrile illness with dehydration.",
      hospitalCourse:
        "The patient responded to IV fluids, symptomatic medication, and serial monitoring. Fever settled without escalation criteria.",
      procedures:
        "IV fluid resuscitation, vitals monitoring, laboratory review.",
      dischargeMedication:
        "Paracetamol 650 mg SOS, oral rehydration, and proton pump inhibitor for 3 days.",
      dischargeAdvice:
        "Maintain hydration, monitor temperature twice daily, and return if vomiting, breathlessness, or persistent fever recurs.",
      followUpInstructions:
        "General medicine review after 5 days with repeat CBC if symptoms continue.",
      versionCount: 2,
      preparedByUserId: null,
      finalizedByUserId: null,
      finalizedAt: new Date("2026-03-06T11:00:00.000Z"),
    },
    {
      id: "dcs_leena_draft",
      admissionId: "adm_leena_recovery",
      status: "DRAFT" as const,
      diagnosis: "Post-operative lower limb fracture recovery.",
      hospitalCourse:
        "Pain is controlled, wound dressing remains clean, and mobilization with support is improving.",
      procedures:
        "Internal fixation follow-up, dressing changes, physiotherapy review.",
      dischargeMedication:
        "Analgesic course, calcium supplementation, and thromboprophylaxis as advised.",
      dischargeAdvice:
        "Protected weight-bearing only, maintain dressing hygiene, and continue physiotherapy.",
      followUpInstructions:
        "Orthopedics review in 7 days with wound check and repeat x-ray scheduling.",
      versionCount: 1,
      preparedByUserId: null,
      finalizedByUserId: null,
      finalizedAt: null,
    },
  ];

  await db
    .insert(dischargeSummaries)
    .values(seededDischargeSummaries)
    .onConflictDoUpdate({
      target: dischargeSummaries.id,
      set: {
        admissionId: sql`excluded.admission_id`,
        status: sql`excluded.status`,
        diagnosis: sql`excluded.diagnosis`,
        hospitalCourse: sql`excluded.hospital_course`,
        procedures: sql`excluded.procedures`,
        dischargeMedication: sql`excluded.discharge_medication`,
        dischargeAdvice: sql`excluded.discharge_advice`,
        followUpInstructions: sql`excluded.follow_up_instructions`,
        versionCount: sql`excluded.version_count`,
        finalizedAt: sql`excluded.finalized_at`,
        updatedAt: new Date(),
      },
    });

  const seededDischargeVersions = [
    {
      id: "dcv_ritika_1",
      dischargeSummaryId: "dcs_ritika_final",
      versionNumber: 1,
      snapshot: JSON.stringify({
        diagnosis: "Viral febrile illness.",
        hospitalCourse:
          "The patient responded to supportive treatment and hydration.",
      }),
      createdByUserId: null,
    },
    {
      id: "dcv_ritika_2",
      dischargeSummaryId: "dcs_ritika_final",
      versionNumber: 2,
      snapshot: JSON.stringify({
        diagnosis: "Viral febrile illness with dehydration.",
        hospitalCourse:
          "The patient responded to IV fluids, symptomatic medication, and serial monitoring.",
      }),
      createdByUserId: null,
    },
    {
      id: "dcv_leena_1",
      dischargeSummaryId: "dcs_leena_draft",
      versionNumber: 1,
      snapshot: JSON.stringify({
        diagnosis: "Post-operative lower limb fracture recovery.",
        hospitalCourse:
          "Pain is controlled, wound dressing remains clean, and mobilization with support is improving.",
      }),
      createdByUserId: null,
    },
  ];

  await db
    .insert(dischargeSummaryVersions)
    .values(seededDischargeVersions)
    .onConflictDoUpdate({
      target: dischargeSummaryVersions.id,
      set: {
        dischargeSummaryId: sql`excluded.discharge_summary_id`,
        versionNumber: sql`excluded.version_number`,
        snapshot: sql`excluded.snapshot`,
      },
    });

  const seededConsentTemplates = [
    {
      id: "cst_general_admission",
      name: "General admission consent",
      slug: "general-admission-consent",
      category: "Admission",
      body:
        "I, {{patientName}} (UHID {{patientHospitalNumber}}), consent to admission, clinical evaluation, routine investigations, and treatment under {{doctorName}}. The nature of care and expected risks have been explained to me.",
      requiresWitness: true,
      requiresDoctor: true,
      active: true,
    },
    {
      id: "cst_procedure_consent",
      name: "Procedure consent",
      slug: "procedure-consent",
      category: "Procedure",
      body:
        "I, {{patientName}}, understand the indication, benefits, alternatives, and possible complications of {{procedureName}}. I authorize {{doctorName}} and the clinical team to proceed as explained.",
      requiresWitness: true,
      requiresDoctor: true,
      active: true,
    },
  ];

  await db
    .insert(consentTemplates)
    .values(seededConsentTemplates)
    .onConflictDoUpdate({
      target: consentTemplates.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        category: sql`excluded.category`,
        body: sql`excluded.body`,
        requiresWitness: sql`excluded.requires_witness`,
        requiresDoctor: sql`excluded.requires_doctor`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const seededConsentDocuments = [
    {
      id: "csd_nasir_pending",
      templateId: "cst_general_admission",
      patientId: "pat_nasir",
      admissionId: "adm_nasir_icu",
      procedureName: null,
      status: "pending_signature" as const,
      renderedBody:
        "I, Nasir Khan (UHID VHMS-20260310-1002), consent to admission, clinical evaluation, routine investigations, and treatment under Dr. Prateek Gupta. The nature of care and expected risks have been explained to me.",
      requiresWitness: true,
      requiresDoctor: true,
      finalizedAt: null,
      createdByUserId: null,
    },
    {
      id: "csd_leena_signed",
      templateId: "cst_procedure_consent",
      patientId: "pat_leena",
      admissionId: "adm_leena_recovery",
      procedureName: "orthopedic wound care and dressing review",
      status: "signed" as const,
      renderedBody:
        "I, Leena Patel, understand the indication, benefits, alternatives, and possible complications of orthopedic wound care and dressing review. I authorize Dr. Radhika Iyer and the clinical team to proceed as explained.",
      requiresWitness: true,
      requiresDoctor: true,
      finalizedAt: new Date("2026-03-10T09:45:00.000Z"),
      createdByUserId: null,
    },
  ];

  await db
    .insert(consentDocuments)
    .values(seededConsentDocuments)
    .onConflictDoUpdate({
      target: consentDocuments.id,
      set: {
        templateId: sql`excluded.template_id`,
        patientId: sql`excluded.patient_id`,
        admissionId: sql`excluded.admission_id`,
        procedureName: sql`excluded.procedure_name`,
        status: sql`excluded.status`,
        renderedBody: sql`excluded.rendered_body`,
        requiresWitness: sql`excluded.requires_witness`,
        requiresDoctor: sql`excluded.requires_doctor`,
        finalizedAt: sql`excluded.finalized_at`,
        updatedAt: new Date(),
      },
    });

  const seededConsentSignatures = [
    {
      id: "css_nasir_patient",
      consentDocumentId: "csd_nasir_pending",
      signerRole: "PATIENT" as const,
      signerName: "Nasir Khan",
      mode: "typed_confirmation" as const,
      notes: "Identity verified by reception counter.",
      signedAt: new Date("2026-03-10T07:20:00.000Z"),
    },
    {
      id: "css_leena_patient",
      consentDocumentId: "csd_leena_signed",
      signerRole: "PATIENT" as const,
      signerName: "Leena Patel",
      mode: "typed_confirmation" as const,
      notes: "Confirmed after counseling.",
      signedAt: new Date("2026-03-10T09:20:00.000Z"),
    },
    {
      id: "css_leena_witness",
      consentDocumentId: "csd_leena_signed",
      signerRole: "WITNESS" as const,
      signerName: "Ward Nurse Kavita",
      mode: "staff_assisted_capture" as const,
      notes: "Witnessed at bedside.",
      signedAt: new Date("2026-03-10T09:30:00.000Z"),
    },
    {
      id: "css_leena_doctor",
      consentDocumentId: "csd_leena_signed",
      signerRole: "DOCTOR" as const,
      signerName: "Dr. Radhika Iyer",
      mode: "typed_confirmation" as const,
      notes: "Procedure explained in detail.",
      signedAt: new Date("2026-03-10T09:40:00.000Z"),
    },
  ];

  await db
    .insert(consentSignatures)
    .values(seededConsentSignatures)
    .onConflictDoUpdate({
      target: consentSignatures.id,
      set: {
        consentDocumentId: sql`excluded.consent_document_id`,
        signerRole: sql`excluded.signer_role`,
        signerName: sql`excluded.signer_name`,
        mode: sql`excluded.mode`,
        notes: sql`excluded.notes`,
        signedAt: sql`excluded.signed_at`,
      },
    });

  const seededCommunicationTemplates = [
    {
      id: "cmt_appointment_sms",
      key: "appointment.reminder.sms",
      channel: "SMS" as const,
      title: "Appointment reminder for {{patientName}}",
      body:
        "Dear {{patientName}}, this is a reminder from Vahi Hospital for your scheduled visit. Please carry UHID {{patientHospitalNumber}} at check-in.",
      active: true,
    },
    {
      id: "cmt_billing_email",
      key: "billing.receipt.email",
      channel: "EMAIL" as const,
      title: "Receipt ready for {{patientName}}",
      body:
        "Hello {{patientName}}, your hospital receipt and billing confirmation are ready. Quote UHID {{patientHospitalNumber}} for any billing desk follow-up.",
      active: true,
    },
    {
      id: "cmt_discharge_whatsapp",
      key: "discharge.instructions.whatsapp",
      channel: "WHATSAPP" as const,
      title: "Discharge instructions for {{patientName}}",
      body:
        "Discharge instructions have been prepared for {{patientName}}. Keep UHID {{patientHospitalNumber}} ready for pharmacy and follow-up review.",
      active: true,
    },
    {
      id: "cmt_alert_inapp",
      key: "ops.alert.inapp",
      channel: "IN_APP_NOTIFICATION" as const,
      title: "Operational alert for {{patientName}}",
      body:
        "Review the latest workflow item connected to {{patientName}} ({{patientHospitalNumber}}) before final sign-off.",
      active: true,
    },
  ];

  await db
    .insert(communicationTemplates)
    .values(seededCommunicationTemplates)
    .onConflictDoUpdate({
      target: communicationTemplates.id,
      set: {
        key: sql`excluded.key`,
        channel: sql`excluded.channel`,
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        active: sql`excluded.active`,
        updatedAt: new Date(),
      },
    });

  const seededCommunicationLogs = [
    {
      id: "cml_ritika_receipt",
      patientId: "pat_ritika",
      billId: null,
      templateId: "cmt_billing_email",
      channel: "EMAIL" as const,
      status: "DELIVERED" as const,
      destination: "ritika.sharma@example.com",
      payload: JSON.stringify({
        title: "Receipt ready for Ritika Sharma",
        body:
          "Hello Ritika Sharma, your hospital receipt and billing confirmation are ready. Quote UHID VHMS-20260310-1001 for any billing desk follow-up.",
      }),
    },
    {
      id: "cml_nasir_admission",
      patientId: "pat_nasir",
      billId: null,
      templateId: "cmt_appointment_sms",
      channel: "SMS" as const,
      status: "FAILED" as const,
      destination: "+91-9876500012",
      payload: JSON.stringify({
        title: "Appointment reminder for Nasir Khan",
        body:
          "Dear Nasir Khan, this is a reminder from Vahi Hospital for your scheduled visit. Please carry UHID VHMS-20260310-1002 at check-in.",
      }),
    },
    {
      id: "cml_ritika_discharge",
      patientId: "pat_ritika",
      billId: null,
      templateId: "cmt_discharge_whatsapp",
      channel: "WHATSAPP" as const,
      status: "QUEUED" as const,
      destination: "+91-9876500011",
      payload: JSON.stringify({
        title: "Discharge instructions for Ritika Sharma",
        body:
          "Discharge instructions have been prepared for Ritika Sharma. Keep UHID VHMS-20260310-1001 ready for pharmacy and follow-up review.",
      }),
    },
    {
      id: "cml_leena_inapp",
      patientId: "pat_leena",
      billId: null,
      templateId: "cmt_alert_inapp",
      channel: "IN_APP_NOTIFICATION" as const,
      status: "SENT" as const,
      destination: "Clinical dashboard",
      payload: JSON.stringify({
        title: "Operational alert for Leena Patel",
        body:
          "Review the latest workflow item connected to Leena Patel (VHMS-20260310-1004) before final sign-off.",
      }),
    },
  ];

  await db
    .insert(communicationLogs)
    .values(seededCommunicationLogs)
    .onConflictDoUpdate({
      target: communicationLogs.id,
      set: {
        patientId: sql`excluded.patient_id`,
        billId: sql`excluded.bill_id`,
        templateId: sql`excluded.template_id`,
        channel: sql`excluded.channel`,
        status: sql`excluded.status`,
        destination: sql`excluded.destination`,
        payload: sql`excluded.payload`,
      },
    });

  const seededQueueItems = [
    {
      id: "msgq_ritika_receipt",
      communicationLogId: "cml_ritika_receipt",
      templateId: "cmt_billing_email",
      channel: "EMAIL" as const,
      destination: "ritika.sharma@example.com",
      status: "DELIVERED" as const,
      retryCount: 0,
      lastError: null,
      nextAttemptAt: null,
    },
    {
      id: "msgq_nasir_admission",
      communicationLogId: "cml_nasir_admission",
      templateId: "cmt_appointment_sms",
      channel: "SMS" as const,
      destination: "+91-9876500012",
      status: "FAILED" as const,
      retryCount: 2,
      lastError: "SMS provider rejected the destination.",
      nextAttemptAt: null,
    },
    {
      id: "msgq_ritika_discharge",
      communicationLogId: "cml_ritika_discharge",
      templateId: "cmt_discharge_whatsapp",
      channel: "WHATSAPP" as const,
      destination: "+91-9876500011",
      status: "QUEUED" as const,
      retryCount: 0,
      lastError: null,
      nextAttemptAt: new Date("2026-03-11T09:30:00.000Z"),
    },
    {
      id: "msgq_leena_inapp",
      communicationLogId: "cml_leena_inapp",
      templateId: "cmt_alert_inapp",
      channel: "IN_APP_NOTIFICATION" as const,
      destination: "Clinical dashboard",
      status: "SENT" as const,
      retryCount: 0,
      lastError: null,
      nextAttemptAt: null,
    },
  ];

  await db
    .insert(messageQueue)
    .values(seededQueueItems)
    .onConflictDoUpdate({
      target: messageQueue.id,
      set: {
        communicationLogId: sql`excluded.communication_log_id`,
        templateId: sql`excluded.template_id`,
        channel: sql`excluded.channel`,
        destination: sql`excluded.destination`,
        status: sql`excluded.status`,
        retryCount: sql`excluded.retry_count`,
        lastError: sql`excluded.last_error`,
        nextAttemptAt: sql`excluded.next_attempt_at`,
        updatedAt: new Date(),
      },
    });

  const seededAnnouncementPosts = [
    {
      id: "anp_fire_drill",
      title: "Evening fire drill at 6 PM",
      body:
        "All departments must complete patient movement checks and designate one point person before the scheduled fire drill.",
      status: "PUBLISHED" as const,
      priority: "URGENT" as const,
      pinned: true,
      acknowledgementRequired: true,
      expiresAt: new Date("2026-03-11T18:30:00.000Z"),
      publishedAt: new Date("2026-03-11T08:15:00.000Z"),
      createdByUserId: null,
    },
    {
      id: "anp_billing_sop",
      title: "Billing SOP refresh draft",
      body:
        "Draft reminder for billing leads to review the updated receipt dispatch and reconciliation SOP before Friday.",
      status: "DRAFT" as const,
      priority: "NORMAL" as const,
      pinned: false,
      acknowledgementRequired: false,
      expiresAt: null,
      publishedAt: null,
      createdByUserId: null,
    },
  ];

  await db
    .insert(announcementPosts)
    .values(seededAnnouncementPosts)
    .onConflictDoUpdate({
      target: announcementPosts.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        status: sql`excluded.status`,
        priority: sql`excluded.priority`,
        pinned: sql`excluded.pinned`,
        acknowledgementRequired: sql`excluded.acknowledgement_required`,
        expiresAt: sql`excluded.expires_at`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: new Date(),
      },
    });

  const seededAnnouncementTargets = [
    {
      id: "ant_fire_all",
      announcementPostId: "anp_fire_drill",
      targetType: "ALL" as const,
      targetValue: null,
    },
    {
      id: "ant_billing_role",
      announcementPostId: "anp_billing_sop",
      targetType: "ROLE" as const,
      targetValue: "BILLING_STAFF",
    },
  ];

  await db
    .insert(announcementTargets)
    .values(seededAnnouncementTargets)
    .onConflictDoUpdate({
      target: announcementTargets.id,
      set: {
        announcementPostId: sql`excluded.announcement_post_id`,
        targetType: sql`excluded.target_type`,
        targetValue: sql`excluded.target_value`,
      },
    });

  const seededNotifications = [
    {
      id: "nti_leena_inapp",
      title: "Operational alert for Leena Patel",
      body:
        "Review the latest workflow item connected to Leena Patel (VHMS-20260310-1004) before final sign-off.",
      priority: "HIGH" as const,
      href: "/dashboard/consents",
      read: false,
      acknowledgedAt: null,
      sourceType: "communication_log",
      sourceId: "cml_leena_inapp",
      targetRole: null,
    },
    {
      id: "nti_fire_drill",
      title: "Evening fire drill at 6 PM",
      body:
        "All departments must complete patient movement checks and designate one point person before the scheduled fire drill.",
      priority: "URGENT" as const,
      href: "/dashboard/communications",
      read: false,
      acknowledgedAt: null,
      sourceType: "announcement_post",
      sourceId: "anp_fire_drill",
      targetRole: null,
    },
    {
      id: "nti_queue_followup",
      title: "Failed SMS requires retry",
      body:
        "Nasir Khan's reminder SMS failed twice and needs destination verification before requeue.",
      priority: "HIGH" as const,
      href: "/dashboard/communications",
      read: true,
      acknowledgedAt: new Date("2026-03-11T09:10:00.000Z"),
      sourceType: "message_queue",
      sourceId: "msgq_nasir_admission",
      targetRole: "BILLING_STAFF",
    },
  ];

  await db
    .insert(notificationCenterItems)
    .values(seededNotifications)
    .onConflictDoUpdate({
      target: notificationCenterItems.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        priority: sql`excluded.priority`,
        href: sql`excluded.href`,
        read: sql`excluded.read`,
        acknowledgedAt: sql`excluded.acknowledged_at`,
        sourceType: sql`excluded.source_type`,
        sourceId: sql`excluded.source_id`,
        targetRole: sql`excluded.target_role`,
      },
    });

  const queueDate = new Date();
  queueDate.setHours(0, 0, 0, 0);

  const seededAppointments = [
    {
      id: "apt_ritika_morning",
      patientId: "pat_ritika",
      doctorId: "doc_verma",
      scheduledFor: new Date(
        queueDate.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000,
      ),
      visitType: "SCHEDULED" as const,
      queueNumber: 1,
      status: "CHECKED_IN" as const,
      checkedInAt: new Date(
        queueDate.getTime() + 9 * 60 * 60 * 1000 + 5 * 60 * 1000,
      ),
      notes: "Lab reports already attached.",
    },
    {
      id: "apt_nasir_morning",
      patientId: "pat_nasir",
      doctorId: "doc_gupta",
      scheduledFor: new Date(
        queueDate.getTime() + 9 * 60 * 60 * 1000 + 30 * 60 * 1000,
      ),
      visitType: "SCHEDULED" as const,
      queueNumber: 1,
      status: "CONFIRMED" as const,
      checkedInAt: null,
      notes: "Needs ECG before consult.",
    },
    {
      id: "apt_aviral_morning",
      patientId: "pat_aviral",
      doctorId: "doc_rathi",
      scheduledFor: new Date(
        queueDate.getTime() + 9 * 60 * 60 * 1000 + 50 * 60 * 1000,
      ),
      visitType: "WALK_IN" as const,
      queueNumber: 1,
      status: "SCHEDULED" as const,
      checkedInAt: null,
      notes: "Walk-in token issued at reception.",
    },
    {
      id: "apt_leena_morning",
      patientId: "pat_leena",
      doctorId: "doc_iyer",
      scheduledFor: new Date(
        queueDate.getTime() + 10 * 60 * 60 * 1000 + 10 * 60 * 1000,
      ),
      visitType: "SCHEDULED" as const,
      queueNumber: 1,
      status: "CONFIRMED" as const,
      checkedInAt: null,
      notes: "Follow-up after fracture review.",
    },
  ];

  await db
    .insert(appointments)
    .values(seededAppointments)
    .onConflictDoUpdate({
      target: appointments.id,
      set: {
        patientId: sql`excluded.patient_id`,
        doctorId: sql`excluded.doctor_id`,
        scheduledFor: sql`excluded.scheduled_for`,
        visitType: sql`excluded.visit_type`,
        queueNumber: sql`excluded.queue_number`,
        status: sql`excluded.status`,
        checkedInAt: sql`excluded.checked_in_at`,
        notes: sql`excluded.notes`,
        updatedAt: new Date(),
      },
    });

  const chargeRows = await db.select().from(charges);
  const chargeCodeMap = new Map(
    chargeRows.map((charge) => [charge.code, charge.id]),
  );

  const seededBills = [
    {
      id: "bil_ritika_opd",
      billNumber: "VHMS-BIL-20260310-1001",
      patientId: "pat_ritika",
      appointmentId: "apt_ritika_morning",
      billStatus: "PAID" as const,
      paymentStatus: "PAID" as const,
      subtotal: 800,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 800,
      amountPaid: 800,
    },
    {
      id: "bil_nasir_opd",
      billNumber: "VHMS-BIL-20260310-1002",
      patientId: "pat_nasir",
      appointmentId: "apt_nasir_morning",
      billStatus: "PARTIALLY_PAID" as const,
      paymentStatus: "PARTIALLY_PAID" as const,
      subtotal: 1650,
      taxAmount: 0,
      discountAmount: 50,
      totalAmount: 1600,
      amountPaid: 800,
    },
  ];

  await db
    .insert(bills)
    .values(seededBills)
    .onConflictDoUpdate({
      target: bills.id,
      set: {
        billNumber: sql`excluded.bill_number`,
        patientId: sql`excluded.patient_id`,
        appointmentId: sql`excluded.appointment_id`,
        billStatus: sql`excluded.bill_status`,
        paymentStatus: sql`excluded.payment_status`,
        subtotal: sql`excluded.subtotal`,
        taxAmount: sql`excluded.tax_amount`,
        discountAmount: sql`excluded.discount_amount`,
        totalAmount: sql`excluded.total_amount`,
        amountPaid: sql`excluded.amount_paid`,
        updatedAt: new Date(),
      },
    });

  await db
    .update(communicationLogs)
    .set({
      billId: "bil_ritika_opd",
    })
    .where(eq(communicationLogs.id, "cml_ritika_receipt"));

  const seededBillItems = [
    {
      id: "bit_ritika_consultation",
      billId: "bil_ritika_opd",
      chargeId: chargeCodeMap.get("CONS-GEN-001"),
      description: "Dr. Ananya Verma consultation",
      quantity: 1,
      unitPrice: 700,
      lineTotal: 700,
      displayOrder: 0,
    },
    {
      id: "bit_ritika_registration",
      billId: "bil_ritika_opd",
      chargeId: chargeCodeMap.get("SERV-REG-001"),
      description: "Registration and file handling",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      displayOrder: 1,
    },
    {
      id: "bit_nasir_consultation",
      billId: "bil_nasir_opd",
      chargeId: chargeCodeMap.get("CONS-CARD-001"),
      description: "Dr. Prateek Gupta consultation",
      quantity: 1,
      unitPrice: 1200,
      lineTotal: 1200,
      displayOrder: 0,
    },
    {
      id: "bit_nasir_ecg",
      billId: "bil_nasir_opd",
      chargeId: chargeCodeMap.get("LAB-ECG-001"),
      description: "ECG investigation",
      quantity: 1,
      unitPrice: 450,
      lineTotal: 450,
      displayOrder: 1,
    },
  ];

  await db
    .insert(billItems)
    .values(seededBillItems)
    .onConflictDoUpdate({
      target: billItems.id,
      set: {
        billId: sql`excluded.bill_id`,
        chargeId: sql`excluded.charge_id`,
        description: sql`excluded.description`,
        quantity: sql`excluded.quantity`,
        unitPrice: sql`excluded.unit_price`,
        lineTotal: sql`excluded.line_total`,
        displayOrder: sql`excluded.display_order`,
      },
    });

  const blogCategoryName = "Hospital Operations";
  await db
    .insert(blogCategories)
    .values({ name: blogCategoryName, slug: slugify(blogCategoryName) })
    .onConflictDoNothing();

  const [operationsCategory] = await db.select().from(blogCategories);
  if (operationsCategory) {
    const seededPosts = [
      {
        categoryId: operationsCategory.id,
        title: "Why invite-only staff access matters in hospital systems",
        slug: "why-invite-only-staff-access-matters",
        excerpt:
          "A starter draft about security boundaries, approvals, and auditability in hospital operations software.",
        coverImageUrl: null,
        seoTitle: "Why invite-only staff access matters in hospital systems",
        seoDescription:
          "Why explicit access approval matters in hospital software before Google sign-in ever reaches billing, occupancy, and patient workflows.",
        body:
          "Invite-only staff access is not a cosmetic restriction. In a hospital environment, it defines the operational boundary before a user is ever allowed to see appointments, billing, occupancy, or patient activity.\n\nVHMS treats Google sign-in as identity verification only. Real access still comes from an explicit admin-controlled allowlist with role and module permissions already defined.\n\nThat keeps onboarding deliberate, audit-friendly, and consistent with how hospitals actually separate billing, reception, clinical, and administrative responsibilities.",
        status: "PUBLISHED" as const,
        publishedAt: new Date("2026-03-08T09:00:00.000Z"),
      },
      {
        categoryId: operationsCategory.id,
        title: "Designing a queue board for real reception pressure",
        slug: "designing-a-queue-board-for-real-reception-pressure",
        excerpt:
          "How the front-desk command surface should reduce clicks while still keeping appointments, billing, and occupancy synchronized.",
        coverImageUrl: null,
        seoTitle: "Designing a queue board for real reception pressure",
        seoDescription:
          "A practical front-desk queue board should keep patient identity, appointment state, billing readiness, and admission context in one compact surface.",
        body:
          "Reception software fails when it optimizes for demos instead of volume. Staff need a queue board that keeps patient identity, appointment status, billing readiness, and admission context visible in one place.\n\nThe VHMS dashboard emphasizes short travel distance between actions, live queue signals, and fast context switching. That is why the queue board is tied to the same patient thread used by billing, admissions, communications, and print flows.\n\nThe result is less duplicated searching, fewer handoff mistakes, and a clearer operational picture during peak hours.",
        status: "PUBLISHED" as const,
        publishedAt: new Date("2026-03-09T10:30:00.000Z"),
      },
      {
        categoryId: operationsCategory.id,
        title: "Publishing checklist for the first public rollout",
        slug: "publishing-checklist-for-the-first-public-rollout",
        excerpt:
          "A draft editorial checklist for aligning public messaging with the real product surface.",
        coverImageUrl: null,
        seoTitle: "Publishing checklist for the first public rollout",
        seoDescription:
          "A draft checklist for aligning screenshots, access messaging, and real feature availability before public rollout.",
        body:
          "This draft exists to coordinate the public product story with the internal dashboard rollout.\n\nBefore publication, confirm screenshots, feature availability, access control messaging, and the current implementation status of the public blog and admin CMS.",
        status: "DRAFT" as const,
        publishedAt: null,
      },
    ];

    for (const post of seededPosts) {
      await db
        .insert(blogPosts)
        .values(post)
        .onConflictDoUpdate({
          target: blogPosts.slug,
          set: {
            categoryId: post.categoryId,
            title: post.title,
            excerpt: post.excerpt,
            coverImageUrl: post.coverImageUrl,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            body: post.body,
            status: post.status,
            publishedAt: post.publishedAt,
            updatedAt: new Date(),
          },
        });
    }
  }

  await db
    .insert(auditLogs)
    .values([
      {
        id: "adt_auth_admin",
        actorUserId: "usr_admin_seed",
        action: "auth.signIn",
        entityType: "user",
        entityId: "usr_admin_seed",
        metadata: JSON.stringify({
          email: "admin@vahi-hospital.test",
          source: "seed",
        }),
        createdAt: new Date("2026-03-11T08:10:00.000Z"),
      },
      {
        id: "adt_billing_finalized",
        actorUserId: "usr_billing_seed",
        action: "billing.finalized",
        entityType: "bill",
        entityId: "bil_ritika_opd",
        metadata: JSON.stringify({
          billNumber: "VHMS-BIL-20260310-1001",
          patientId: "pat_ritika",
          totalAmount: 800,
        }),
        createdAt: new Date("2026-03-11T08:25:00.000Z"),
      },
      {
        id: "adt_occupancy_assigned",
        actorUserId: "usr_reception_seed",
        action: "occupancy.bed.assigned",
        entityType: "admission",
        entityId: "adm_nasir_icu",
        metadata: JSON.stringify({
          bedId: "bed_icu_01_a",
          patientId: "pat_nasir",
        }),
        createdAt: new Date("2026-03-11T08:42:00.000Z"),
      },
      {
        id: "adt_discharge_finalized",
        actorUserId: "usr_admin_seed",
        action: "discharge.summary.finalized",
        entityType: "discharge_summary",
        entityId: "dcs_ritika_final",
        metadata: JSON.stringify({
          admissionId: "adm_ritika_discharged",
          patientId: "pat_ritika",
        }),
        createdAt: new Date("2026-03-11T09:05:00.000Z"),
      },
      {
        id: "adt_feature_flag_updated",
        actorUserId: "usr_admin_seed",
        action: "featureFlags.updated",
        entityType: "feature_flag",
        entityId: "dashboardCustomization",
        metadata: JSON.stringify({
          key: "dashboardCustomization",
          enabled: true,
        }),
        createdAt: new Date("2026-03-11T09:18:00.000Z"),
      },
      {
        id: "adt_blog_published",
        actorUserId: "usr_admin_seed",
        action: "blog.published",
        entityType: "blog_post",
        entityId: "why-invite-only-staff-access-matters",
        metadata: JSON.stringify({
          slug: "why-invite-only-staff-access-matters",
          status: "PUBLISHED",
        }),
        createdAt: new Date("2026-03-11T09:32:00.000Z"),
      },
      {
        id: "adt_signin_blocked",
        actorUserId: null,
        action: "auth.signIn.blocked",
        entityType: "auth_session",
        entityId: null,
        metadata: JSON.stringify({
          email: "unknown.user@external.test",
          reason: "not_allowlisted",
        }),
        createdAt: new Date("2026-03-11T09:48:00.000Z"),
      },
    ])
    .onConflictDoUpdate({
      target: auditLogs.id,
      set: {
        actorUserId: sql`excluded.actor_user_id`,
        action: sql`excluded.action`,
        entityType: sql`excluded.entity_type`,
        entityId: sql`excluded.entity_id`,
        metadata: sql`excluded.metadata`,
        createdAt: sql`excluded.created_at`,
      },
    });

  console.log("Seed completed.");
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
