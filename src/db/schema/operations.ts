import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { AnnouncementStatus } from "@/constants/announcementStatus";
import type { AnnouncementTargetType } from "@/constants/announcementTargetType";
import type { AppointmentStatus } from "@/constants/appointmentStatus";
import type { AppointmentVisitType } from "@/constants/appointmentVisitType";
import type { BillStatus } from "@/constants/billStatus";
import type { BlogStatus } from "@/constants/blogStatus";
import type { BloodGroup } from "@/constants/bloodGroups";
import type { CommunicationChannel } from "@/constants/communicationChannel";
import type { CommunicationStatus } from "@/constants/communicationStatus";
import type { ConsentSignatureMode } from "@/constants/consentSignatureMode";
import type { ConsentSignerRole } from "@/constants/consentSignerRole";
import type { ConsentStatus } from "@/constants/consentStatus";
import type { DischargeSummaryStatus } from "@/constants/dischargeSummaryStatus";
import type { NotificationPriority } from "@/constants/notificationPriority";
import type { PatientGender } from "@/constants/patientGender";
import type { PaymentStatus } from "@/constants/paymentStatus";
import { beds, charges, doctors, staffMembers } from "@/db/schema/masters";
import { makeId } from "@/db/schema/shared";

export const patients = pgTable("patients", {
  id: text("id").primaryKey().$defaultFn(() => makeId("pat")),
  hospitalNumber: text("hospital_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  gender: text("gender").$type<PatientGender>().notNull().default("UNKNOWN"),
  dateOfBirth: text("date_of_birth"),
  phone: text("phone"),
  alternatePhone: text("alternate_phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  emergencyContact: text("emergency_contact"),
  bloodGroup: text("blood_group").$type<BloodGroup>(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => makeId("apt")),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => doctors.id),
  scheduledFor: timestamp("scheduled_for", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  visitType: text("visit_type")
    .$type<AppointmentVisitType>()
    .notNull()
    .default("SCHEDULED"),
  queueNumber: integer("queue_number"),
  status: text("status")
    .$type<AppointmentStatus>()
    .notNull()
    .default("SCHEDULED"),
  notes: text("notes"),
  checkedInAt: timestamp("checked_in_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdByUserId: text("created_by_user_id").references(() => staffMembers.id),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const admissions = pgTable("admissions", {
  id: text("id").primaryKey().$defaultFn(() => makeId("adm")),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  bedId: text("bed_id").references(() => beds.id),
  attendingDoctorId: text("attending_doctor_id").references(() => doctors.id),
  admittedAt: timestamp("admitted_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  dischargedAt: timestamp("discharged_at", {
    mode: "date",
    withTimezone: true,
  }),
  status: text("status").notNull().default("ADMITTED"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const dischargeSummaries = pgTable("discharge_summaries", {
  id: text("id").primaryKey().$defaultFn(() => makeId("dcs")),
  admissionId: text("admission_id")
    .notNull()
    .references(() => admissions.id)
    .unique(),
  status: text("status")
    .$type<DischargeSummaryStatus>()
    .notNull()
    .default("DRAFT"),
  diagnosis: text("diagnosis").notNull(),
  hospitalCourse: text("hospital_course").notNull(),
  procedures: text("procedures"),
  dischargeMedication: text("discharge_medication"),
  dischargeAdvice: text("discharge_advice").notNull(),
  followUpInstructions: text("follow_up_instructions").notNull(),
  versionCount: integer("version_count").notNull().default(1),
  preparedByUserId: text("prepared_by_user_id"),
  finalizedByUserId: text("finalized_by_user_id"),
  finalizedAt: timestamp("finalized_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const dischargeSummaryVersions = pgTable(
  "discharge_summary_versions",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("dcv")),
    dischargeSummaryId: text("discharge_summary_id")
      .notNull()
      .references(() => dischargeSummaries.id),
    versionNumber: integer("version_number").notNull(),
    snapshot: text("snapshot").notNull(),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
  },
);

export const consentTemplates = pgTable("consent_templates", {
  id: text("id").primaryKey().$defaultFn(() => makeId("cst")),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  body: text("body").notNull(),
  requiresWitness: boolean("requires_witness").notNull().default(false),
  requiresDoctor: boolean("requires_doctor").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const consentDocuments = pgTable("consent_documents", {
  id: text("id").primaryKey().$defaultFn(() => makeId("csd")),
  templateId: text("template_id")
    .notNull()
    .references(() => consentTemplates.id),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  admissionId: text("admission_id").references(() => admissions.id),
  procedureName: text("procedure_name"),
  status: text("status").$type<ConsentStatus>().notNull().default("draft"),
  renderedBody: text("rendered_body").notNull(),
  requiresWitness: boolean("requires_witness").notNull().default(false),
  requiresDoctor: boolean("requires_doctor").notNull().default(false),
  finalizedAt: timestamp("finalized_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const consentSignatures = pgTable("consent_signatures", {
  id: text("id").primaryKey().$defaultFn(() => makeId("css")),
  consentDocumentId: text("consent_document_id")
    .notNull()
    .references(() => consentDocuments.id),
  signerRole: text("signer_role").$type<ConsentSignerRole>().notNull(),
  signerName: text("signer_name").notNull(),
  mode: text("mode").$type<ConsentSignatureMode>().notNull(),
  notes: text("notes"),
  signedAt: timestamp("signed_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const bills = pgTable("bills", {
  id: text("id").primaryKey().$defaultFn(() => makeId("bil")),
  billNumber: text("bill_number").notNull().unique(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: text("appointment_id").references(() => appointments.id),
  admissionId: text("admission_id").references(() => admissions.id),
  billStatus: text("bill_status").$type<BillStatus>().notNull().default(
    "DRAFT",
  ),
  paymentStatus: text("payment_status")
    .$type<PaymentStatus>()
    .notNull()
    .default("UNPAID"),
  subtotal: doublePrecision("subtotal").notNull().default(0),
  taxAmount: doublePrecision("tax_amount").notNull().default(0),
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  amountPaid: doublePrecision("amount_paid").notNull().default(0),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const billItems = pgTable("bill_items", {
  id: text("id").primaryKey().$defaultFn(() => makeId("bit")),
  billId: text("bill_id")
    .notNull()
    .references(() => bills.id),
  chargeId: text("charge_id").references(() => charges.id),
  description: text("description").notNull(),
  quantity: doublePrecision("quantity").notNull().default(1),
  unitPrice: doublePrecision("unit_price").notNull().default(0),
  lineTotal: doublePrecision("line_total").notNull().default(0),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const communicationTemplates = pgTable("communication_templates", {
  id: text("id").primaryKey().$defaultFn(() => makeId("cmt")),
  key: text("key").notNull().unique(),
  channel: text("channel").$type<CommunicationChannel>().notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const communicationLogs = pgTable("communication_logs", {
  id: text("id").primaryKey().$defaultFn(() => makeId("cml")),
  patientId: text("patient_id").references(() => patients.id),
  billId: text("bill_id").references(() => bills.id),
  templateId: text("template_id").references(() => communicationTemplates.id),
  channel: text("channel").$type<CommunicationChannel>().notNull(),
  status: text("status")
    .$type<CommunicationStatus>()
    .notNull()
    .default("QUEUED"),
  destination: text("destination").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const messageQueue = pgTable("message_queue", {
  id: text("id").primaryKey().$defaultFn(() => makeId("msgq")),
  communicationLogId: text("communication_log_id")
    .notNull()
    .references(() => communicationLogs.id),
  templateId: text("template_id").references(() => communicationTemplates.id),
  channel: text("channel").$type<CommunicationChannel>().notNull(),
  destination: text("destination").notNull(),
  status: text("status")
    .$type<CommunicationStatus>()
    .notNull()
    .default("QUEUED"),
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const notificationCenterItems = pgTable("notification_center_items", {
  id: text("id").primaryKey().$defaultFn(() => makeId("nti")),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority")
    .$type<NotificationPriority>()
    .notNull()
    .default("NORMAL"),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  acknowledgedAt: timestamp("acknowledged_at", {
    mode: "date",
    withTimezone: true,
  }),
  sourceType: text("source_type"),
  sourceId: text("source_id"),
  targetRole: text("target_role"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const announcementPosts = pgTable("announcement_posts", {
  id: text("id").primaryKey().$defaultFn(() => makeId("anp")),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status")
    .$type<AnnouncementStatus>()
    .notNull()
    .default("DRAFT"),
  priority: text("priority")
    .$type<NotificationPriority>()
    .notNull()
    .default("NORMAL"),
  pinned: boolean("pinned").notNull().default(false),
  acknowledgementRequired: boolean("acknowledgement_required")
    .notNull()
    .default(false),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }),
  publishedAt: timestamp("published_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const announcementTargets = pgTable("announcement_targets", {
  id: text("id").primaryKey().$defaultFn(() => makeId("ant")),
  announcementPostId: text("announcement_post_id")
    .notNull()
    .references(() => announcementPosts.id),
  targetType: text("target_type").$type<AnnouncementTargetType>().notNull(),
  targetValue: text("target_value"),
});

export const blogCategories = pgTable("blog_categories", {
  id: text("id").primaryKey().$defaultFn(() => makeId("blc")),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey().$defaultFn(() => makeId("blp")),
  categoryId: text("category_id").references(() => blogCategories.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").$type<BlogStatus>().notNull().default("DRAFT"),
  excerpt: text("excerpt"),
  coverImageUrl: text("cover_image_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  body: text("body").notNull(),
  publishedAt: timestamp("published_at", {
    mode: "date",
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});
