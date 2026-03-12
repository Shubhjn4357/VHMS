import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { FeatureFlagKey } from "@/constants/featureFlags";
import type { AppRole } from "@/constants/roles";
import type { StaffAccessStatus } from "@/constants/staffAccessDefaults";
import { makeId } from "@/db/schema/shared";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("usr")),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    role: text("role").$type<AppRole>().notNull().default("RECEPTION_STAFF"),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const staffAccess = pgTable(
  "staff_access",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("saf")),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").$type<AppRole>().notNull(),
    status: text("status").$type<StaffAccessStatus>().notNull(),
    defaultPermissions: text("default_permissions").notNull().default("[]"),
    invitedByUserId: text("invited_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", {
      mode: "date",
      withTimezone: true,
    }),
    lastLoginAt: timestamp("last_login_at", {
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
  },
  (table) => [uniqueIndex("staff_access_email_idx").on(table.email)],
);

export const userPermissionOverrides = pgTable("user_permission_overrides", {
  id: text("id").primaryKey().$defaultFn(() => makeId("upo")),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  permissionKey: text("permission_key").notNull(),
  allowed: boolean("allowed").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => makeId("adt")),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const featureFlags = pgTable("feature_flags", {
  id: text("id").primaryKey().$defaultFn(() => makeId("flt")),
  key: text("key").$type<FeatureFlagKey>().notNull(),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercentage: integer("rollout_percentage").notNull().default(100),
  targetRoles: text("target_roles").notNull().default("[]"),
  description: text("description").notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
}, (table) => [uniqueIndex("feature_flags_key_idx").on(table.key)]);

export const hospitalProfile = pgTable("hospital_profile", {
  id: text("id").primaryKey().$defaultFn(() => makeId("hsp")),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  registrationNumber: text("registration_number"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  letterheadFooter: text("letterhead_footer"),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const uploads = pgTable(
  "uploads",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("upl")),
    target: text("target").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uploads_storage_key_idx").on(table.storageKey)],
);

export const printTemplateSections = pgTable(
  "print_template_sections",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("pts")),
    templateKey: text("template_key").notNull(),
    sectionKey: text("section_key").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    updatedByUserId: text("updated_by_user_id").references(() => users.id),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("print_template_sections_template_section_idx").on(
      table.templateKey,
      table.sectionKey,
    ),
  ],
);

export const dashboardLayoutWidgets = pgTable(
  "dashboard_layout_widgets",
  {
    id: text("id").primaryKey().$defaultFn(() => makeId("dlw")),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    layoutKey: text("layout_key").notNull(),
    widgetKey: text("widget_key").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dashboard_layout_widgets_user_layout_widget_idx").on(
      table.userId,
      table.layoutKey,
      table.widgetKey,
    ),
  ],
);
