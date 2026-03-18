import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
};

type RateLimitRecord = {
  resetAt: number;
  hits: number[];
  windowMs: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();
const idempotencyStore = new Map<string, number>();
const MAX_RATE_LIMIT_ENTRIES = 2_000;
const MAX_IDEMPOTENCY_ENTRIES = 2_000;
const IDEMPOTENCY_TTL_MS = 60_000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function pruneHits(record: RateLimitRecord, now: number) {
  record.hits = record.hits.filter((hit) => now - hit < record.windowMs);
  if (record.resetAt < now) {
    record.resetAt = now + record.windowMs;
  }
}

function pruneRateLimitStore(now: number) {
  for (const [key, record] of rateLimitStore.entries()) {
    pruneHits(record, now);

    if (record.hits.length === 0 && record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  while (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = rateLimitStore.keys().next().value;

    if (!oldestKey) {
      break;
    }

    rateLimitStore.delete(oldestKey);
  }
}

function pruneIdempotencyStore(now: number) {
  for (const [key, expiresAt] of idempotencyStore.entries()) {
    if (expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }

  while (idempotencyStore.size > MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = idempotencyStore.keys().next().value;

    if (!oldestKey) {
      break;
    }

    idempotencyStore.delete(oldestKey);
  }
}

export function getRequestIdentity(request: NextRequest, actorId?: string | null) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  return actorId ? `user:${actorId}` : `ip:${ip}`;
}

export function applyRateLimit({
  key,
  limit,
  windowMs,
  message = "Too many requests. Please slow down.",
}: RateLimitOptions) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const existing = rateLimitStore.get(key);

  if (!existing) {
    rateLimitStore.set(key, {
      resetAt: now + windowMs,
      hits: [now],
      windowMs,
    });
    return null;
  }

  pruneHits(existing, now);

  if (existing.hits.length >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );

    return NextResponse.json(
      { message },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(existing.resetAt / 1000)),
        },
      },
    );
  }

  existing.hits.push(now);

  return null;
}

export function guardReadRoute(
  request: NextRequest,
  scope: string,
  actorId?: string | null,
) {
  const identity = getRequestIdentity(request, actorId);
  return applyRateLimit({
    key: `${scope}:read:${identity}`,
    limit: 60,
    windowMs: 60_000,
    message: "Read rate limit reached. Please try again in a moment.",
  });
}

export function guardMutationRoute(
  request: NextRequest,
  scope: string,
  actorId?: string | null,
) {
  const identity = getRequestIdentity(request, actorId);
  return applyRateLimit({
    key: `${scope}:write:${identity}`,
    limit: 20,
    windowMs: 60_000,
    message: "Mutation rate limit reached. Please try again shortly.",
  });
}

export function guardDuplicateMutation(
  request: NextRequest,
  scope: string,
  actorId?: string | null,
) {
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (!idempotencyKey) {
    return null;
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return NextResponse.json(
      {
        message:
          "Invalid x-idempotency-key. Use 8-128 URL-safe characters.",
      },
      { status: 400 },
    );
  }

  const identity = getRequestIdentity(request, actorId);
  const storeKey = `${scope}:idempotency:${identity}:${idempotencyKey}`;
  const now = Date.now();
  pruneIdempotencyStore(now);
  const expiresAt = idempotencyStore.get(storeKey);

  if (expiresAt && expiresAt > now) {
    return NextResponse.json(
      { message: "Duplicate request detected. Please wait for the first request to finish." },
      { status: 409 },
    );
  }

  idempotencyStore.set(storeKey, now + IDEMPOTENCY_TTL_MS);
  return null;
}
