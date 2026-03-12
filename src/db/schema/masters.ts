import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { BedStatus } from "@/constants/bedStatus";
import { makeId } from "@/db/schema/shared";

export const departments = pgTable("departments", {
  id: text("id").primaryKey().$defaultFn(() => makeId("dep")),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const doctors = pgTable("doctors", {
  id: text("id").primaryKey().$defaultFn(() => makeId("doc")),
  departmentId: text("department_id").references(() => departments.id),
  fullName: text("full_name").notNull(),
  designation: text("designation"),
  consultationFee: doublePrecision("consultation_fee").notNull().default(0),
  specialty: text("specialty"),
  email: text("email"),
  phone: text("phone"),
  signatureUrl: text("signature_url"),
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

export const staffMembers = pgTable("staff_members", {
  id: text("id").primaryKey().$defaultFn(() => makeId("stf")),
  fullName: text("full_name").notNull(),
  designation: text("designation").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const wards = pgTable("wards", {
  id: text("id").primaryKey().$defaultFn(() => makeId("wrd")),
  name: text("name").notNull().unique(),
  floor: text("floor"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey().$defaultFn(() => makeId("rom")),
  wardId: text("ward_id").references(() => wards.id),
  roomNumber: text("room_number").notNull(),
  roomType: text("room_type").notNull(),
  dailyCharge: doublePrecision("daily_charge").notNull().default(0),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const beds = pgTable("beds", {
  id: text("id").primaryKey().$defaultFn(() => makeId("bed")),
  wardId: text("ward_id").references(() => wards.id),
  roomId: text("room_id").references(() => rooms.id),
  bedNumber: text("bed_number").notNull(),
  status: text("status").$type<BedStatus>().notNull().default("FREE"),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const chargeCategories = pgTable("charge_categories", {
  id: text("id").primaryKey().$defaultFn(() => makeId("chgcat")),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});

export const charges = pgTable("charges", {
  id: text("id").primaryKey().$defaultFn(() => makeId("chg")),
  categoryId: text("category_id").references(() => chargeCategories.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  unitPrice: doublePrecision("unit_price").notNull().default(0),
  taxable: boolean("taxable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  }).notNull().defaultNow(),
});
