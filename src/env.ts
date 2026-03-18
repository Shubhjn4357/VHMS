import { z } from "zod";

function parseBooleanEnv(value?: string) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_NAME: z.string().min(1),
  HOSPITAL_NAME: z.string().min(1),
  BOOTSTRAP_SUPER_ADMIN_EMAILS: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAILS: z.string().optional(),
  UPLOAD_STORAGE_DRIVER: z.enum(["auto", "local", "s3", "r2"]).default("auto"),
  UPLOAD_LOCAL_DIR: z.string().min(1).default("public/uploads"),
  UPLOAD_PUBLIC_BASE_URL: z.string().min(1).default("/uploads"),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.boolean().default(false),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  COMMUNICATION_EMAIL_PROVIDER: z.enum(["NONE", "RESEND"]).default("NONE"),
  COMMUNICATION_SMS_PROVIDER: z.enum(["NONE", "TWILIO"]).default("NONE"),
  COMMUNICATION_WHATSAPP_PROVIDER: z.enum(["NONE", "TWILIO"]).default("NONE"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  ENABLE_FIGMA_CAPTURE: z.boolean().default(false),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

const defaultEnv = {
  DATABASE_URL: "postgresql://user:password@host/database",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "dev-only-secret-change-before-production",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  APP_NAME: "HMS Enterprise",
  HOSPITAL_NAME: "XYZ Hospital",
} as const;

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ??
    defaultEnv.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? defaultEnv.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ??
    defaultEnv.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? defaultEnv.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ??
    defaultEnv.GOOGLE_CLIENT_SECRET,
  APP_NAME: process.env.APP_NAME ?? defaultEnv.APP_NAME,
  HOSPITAL_NAME: process.env.HOSPITAL_NAME ?? defaultEnv.HOSPITAL_NAME,
  BOOTSTRAP_SUPER_ADMIN_EMAILS: process.env.BOOTSTRAP_SUPER_ADMIN_EMAILS,
  BOOTSTRAP_ADMIN_EMAILS: process.env.BOOTSTRAP_ADMIN_EMAILS,
  UPLOAD_STORAGE_DRIVER: process.env.UPLOAD_STORAGE_DRIVER ?? "auto",
  UPLOAD_LOCAL_DIR: process.env.UPLOAD_LOCAL_DIR ?? "public/uploads",
  UPLOAD_PUBLIC_BASE_URL: process.env.UPLOAD_PUBLIC_BASE_URL ?? "/uploads",
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
  S3_FORCE_PATH_STYLE: parseBooleanEnv(process.env.S3_FORCE_PATH_STYLE),
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  COMMUNICATION_EMAIL_PROVIDER: process.env.COMMUNICATION_EMAIL_PROVIDER ??
    "NONE",
  COMMUNICATION_SMS_PROVIDER: process.env.COMMUNICATION_SMS_PROVIDER ?? "NONE",
  COMMUNICATION_WHATSAPP_PROVIDER:
    process.env.COMMUNICATION_WHATSAPP_PROVIDER ?? "NONE",
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
  SENTRY_DSN: process.env.SENTRY_DSN,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  ENABLE_FIGMA_CAPTURE: parseBooleanEnv(process.env.ENABLE_FIGMA_CAPTURE),
  NODE_ENV: process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development"
    ? process.env.NODE_ENV
    : "development",
});

function assertConfiguredProductionEnv() {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const invalidEntries = [
    env.DATABASE_URL === defaultEnv.DATABASE_URL ? "DATABASE_URL" : null,
    env.NEXTAUTH_SECRET === defaultEnv.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET" : null,
    env.GOOGLE_CLIENT_ID === defaultEnv.GOOGLE_CLIENT_ID
      ? "GOOGLE_CLIENT_ID"
      : null,
    env.GOOGLE_CLIENT_SECRET === defaultEnv.GOOGLE_CLIENT_SECRET
      ? "GOOGLE_CLIENT_SECRET"
      : null,
  ].filter(Boolean);

  if (invalidEntries.length > 0) {
    throw new Error(
      `Production configuration is incomplete. Provide real values for: ${invalidEntries.join(", ")}.`,
    );
  }

  if (
    env.COMMUNICATION_EMAIL_PROVIDER === "RESEND" &&
    (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL)
  ) {
    throw new Error(
      "COMMUNICATION_EMAIL_PROVIDER=RESEND requires RESEND_API_KEY and RESEND_FROM_EMAIL in production.",
    );
  }

  if (
    (env.COMMUNICATION_SMS_PROVIDER === "TWILIO" ||
      env.COMMUNICATION_WHATSAPP_PROVIDER === "TWILIO") &&
    (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN)
  ) {
    throw new Error(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when Twilio transport is enabled in production.",
    );
  }
}

assertConfiguredProductionEnv();
function parseEmailList(value?: string) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export const bootstrapAccess = {
  superAdminEmails: parseEmailList(env.BOOTSTRAP_SUPER_ADMIN_EMAILS),
  adminEmails: parseEmailList(env.BOOTSTRAP_ADMIN_EMAILS),
};
