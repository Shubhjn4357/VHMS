import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

import { env } from "@/env";
import { UPLOAD_TARGET_RULES } from "@/constants/uploadTargets";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { recordAuditLog } from "@/lib/audit/log";
import type {
  UploadAssetRecord,
  UploadAssetTarget,
  UploadTargetRule,
} from "@/types/upload";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type ResolvedUploadDriver = "local" | "s3" | "r2";

const PROJECT_PUBLIC_DIRECTORY = path.join(process.cwd(), "public");

function normalizeUrlPrefix(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveLocalUploadBaseSegments() {
  const normalizedPrefix = normalizeUrlPrefix(env.UPLOAD_PUBLIC_BASE_URL).trim();

  if (!normalizedPrefix.startsWith("/")) {
    throw new ApiError(
      500,
      "UPLOAD_PUBLIC_BASE_URL must start with '/' when local upload storage is enabled.",
    );
  }

  const segments = normalizedPrefix
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new ApiError(
      500,
      "UPLOAD_PUBLIC_BASE_URL must include at least one path segment for local uploads.",
    );
  }

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new ApiError(
      500,
      "UPLOAD_PUBLIC_BASE_URL cannot contain '.' or '..' path segments.",
    );
  }

  return segments;
}

function normalizeStorageKeySegments(storageKey: string) {
  return storageKey
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hasS3Config() {
  return Boolean(
    env.S3_BUCKET &&
      env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

function hasR2Config() {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_BUCKET &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY,
  );
}

function resolveUploadStorageDriver(): ResolvedUploadDriver {
  if (env.UPLOAD_STORAGE_DRIVER === "local") {
    return "local";
  }

  if (env.UPLOAD_STORAGE_DRIVER === "s3") {
    if (!hasS3Config()) {
      throw new ApiError(500, "S3 storage is selected but not fully configured.");
    }

    return "s3";
  }

  if (env.UPLOAD_STORAGE_DRIVER === "r2") {
    if (!hasR2Config()) {
      throw new ApiError(500, "R2 storage is selected but not fully configured.");
    }

    return "r2";
  }

  if (hasR2Config()) {
    return "r2";
  }

  if (hasS3Config()) {
    return "s3";
  }

  return "local";
}

function resolveR2Endpoint() {
  if (!env.R2_ACCOUNT_ID) {
    throw new ApiError(500, "Cloudflare R2 account ID is missing.");
  }

  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

function resolvePublicUrl(storageKey: string, driver: ResolvedUploadDriver) {
  const prefix = driver === "local"
    ? normalizeUrlPrefix(env.UPLOAD_PUBLIC_BASE_URL)
    : driver === "s3"
    ? normalizeUrlPrefix(
      env.S3_PUBLIC_BASE_URL ??
        `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`,
    )
    : normalizeUrlPrefix(
      env.R2_PUBLIC_BASE_URL ??
        `${resolveR2Endpoint()}/${env.R2_BUCKET}`,
    );

  return `${prefix}/${storageKey.replaceAll("\\", "/")}`;
}

function resolveLocalUploadPath(storageKey: string) {
  return path.join(
    PROJECT_PUBLIC_DIRECTORY,
    ...resolveLocalUploadBaseSegments(),
    ...normalizeStorageKeySegments(storageKey),
  );
}

function getFileExtension(file: File) {
  const mappedExtension = MIME_EXTENSION_MAP[file.type];

  if (mappedExtension) {
    return mappedExtension;
  }

  const originalExtension = file.name.split(".").pop()?.trim().toLowerCase();
  if (originalExtension) {
    return originalExtension.replace(/[^a-z0-9]/g, "");
  }

  return "bin";
}

function toUploadAssetRecord(row: typeof uploads.$inferSelect): UploadAssetRecord {
  return {
    id: row.id,
    target: row.target as UploadAssetTarget,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    publicUrl: row.publicUrl,
    createdByUserId: row.createdByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function createS3CompatibleClient(driver: Exclude<ResolvedUploadDriver, "local">) {
  if (driver === "s3") {
    if (!env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new ApiError(500, "S3 credentials are incomplete.");
    }

    return new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new ApiError(500, "R2 credentials are incomplete.");
  }

  return new S3Client({
    region: "auto",
    endpoint: resolveR2Endpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function persistToCloudStorage(input: {
  driver: Exclude<ResolvedUploadDriver, "local">;
  file: File;
  storageKey: string;
}) {
  const client = createS3CompatibleClient(input.driver);
  const bucket = input.driver === "s3" ? env.S3_BUCKET : env.R2_BUCKET;

  if (!bucket) {
    throw new ApiError(500, "Cloud storage bucket is not configured.");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.storageKey,
      Body: new Uint8Array(await input.file.arrayBuffer()),
      ContentType: input.file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export function getUploadRule(target: UploadAssetTarget): UploadTargetRule {
  return UPLOAD_TARGET_RULES[target];
}

export function validateUploadFile(file: File, rule: UploadTargetRule) {
  if (file.size <= 0) {
    throw new ApiError(400, "Select a file to upload.");
  }

  if (file.size > rule.maxBytes) {
    throw new ApiError(
      400,
      `File is too large. Maximum allowed size is ${Math.floor(rule.maxBytes / (1024 * 1024))} MB.`,
    );
  }

  if (!rule.allowedMimeTypes.includes(file.type)) {
    throw new ApiError(400, "Unsupported file type for this upload target.");
  }
}

export async function storeUploadedFile(input: {
  file: File;
  target: UploadAssetTarget;
  actorUserId?: string | null;
}) {
  const driver = resolveUploadStorageDriver();
  const rule = getUploadRule(input.target);
  validateUploadFile(input.file, rule);

  const now = new Date();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const extension = getFileExtension(input.file);
  const storageKey = path.posix.join(
    rule.directory,
    `${now.getUTCFullYear()}`,
    month,
    `${nanoid(18)}.${extension}`,
  );

  if (driver === "local") {
    const outputPath = resolveLocalUploadPath(storageKey);
    const outputDirectory = path.dirname(outputPath);

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputPath, Buffer.from(await input.file.arrayBuffer()));
  } else {
    await persistToCloudStorage({
      driver,
      file: input.file,
      storageKey,
    });
  }

  const db = getDb();
  const publicUrl = resolvePublicUrl(storageKey, driver);
  const [createdRow] = await db
    .insert(uploads)
    .values({
      target: input.target,
      originalName: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      storageKey,
      publicUrl,
      createdByUserId: input.actorUserId ?? null,
    })
    .returning();

  if (!createdRow) {
    throw new ApiError(500, "Unable to store upload metadata.");
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    action: "uploads.created",
    entityType: "upload",
    entityId: createdRow.id,
    metadata: {
      driver,
      target: input.target,
      originalName: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      publicUrl,
    },
  });

  return toUploadAssetRecord(createdRow);
}
