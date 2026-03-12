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
};

const rateLimitStore = new Map<string, RateLimitRecord>();
const idempotencyStore = new Map<string, number>();

function pruneHits(record: RateLimitRecord, now: number, windowMs: number) {
  record.hits = record.hits.filter((hit) => now - hit < windowMs);
  if (record.resetAt < now) {
    record.resetAt = now + windowMs;
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
  const existing = rateLimitStore.get(key);

  if (!existing) {
    rateLimitStore.set(key, {
      resetAt: now + windowMs,
      hits: [now],
    });
    return null;
  }

  pruneHits(existing, now, windowMs);

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

  const identity = getRequestIdentity(request, actorId);
  const storeKey = `${scope}:idempotency:${identity}:${idempotencyKey}`;
  const now = Date.now();
  const expiresAt = idempotencyStore.get(storeKey);

  if (expiresAt && expiresAt > now) {
    return NextResponse.json(
      { message: "Duplicate request detected. Please wait for the first request to finish." },
      { status: 409 },
    );
  }

  idempotencyStore.set(storeKey, now + 60_000);
  return null;
}
