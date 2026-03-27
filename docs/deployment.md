# Deployment and Operations Runbook

## Current production model

The current application runtime is a Next.js server backed by network Postgres. In this repo the expected production target is Neon or any equivalent managed Postgres deployment.

This is the current deployable model:

- one or more app instances
- `DATABASE_URL` pointing to a managed Postgres database
- environment variables supplied at runtime
- migrations and seed actions run explicitly

This is aligned with the managed SQL direction from `plan.json`. The remaining deployment work is mostly operational hardening, not a storage-engine migration.

## Required environment variables

Set these in production:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_NAME`
- `HOSPITAL_NAME`
- `BOOTSTRAP_SUPER_ADMIN_EMAILS`
- `BOOTSTRAP_ADMIN_EMAILS`

Set `APP_NAME` and `HOSPITAL_NAME` to the buyer hospital before go-live so browser metadata, manifests, exports, and runtime copy do not ship with demo defaults.

Recommended:

- `NODE_ENV=production`
- feature flag overrides such as `FEATURE_FLAG_OFFLINE_DRAFTS=true` only when intentionally locking behavior by environment

## Release checklist

1. Pull the latest code and install dependencies with `pnpm install --frozen-lockfile`.
2. Verify config with the target `.env`.
3. Run `pnpm lint`.
4. Run `pnpm typecheck`.
5. Run `pnpm test`.
6. Run `pnpm db:push -- --force` against the target Postgres database.
7. Seed only on first environment boot or when intentionally refreshing non-critical reference data.
8. Run `pnpm build`.
9. Start the app with `pnpm start`.

## Process supervision

Run the app behind a process manager or service wrapper. Minimum expectations:

- automatic restart on crash
- stdout/stderr log capture
- startup health check
- graceful shutdown support

## Reverse proxy

Place the app behind a TLS-terminating reverse proxy and forward traffic to port `3000`. Preserve:

- `Host`
- `X-Forwarded-Proto`
- `X-Forwarded-For`

## Backups

Because the runtime database is Postgres, backups should come from the managed provider and be verified regularly.

Minimum policy:

- point-in-time recovery enabled where available
- retention for multiple restore points
- restore drill in a non-production environment

Before every production migration:

- create a fresh database backup
- keep the previous application build artifact available for rollback

## Monitoring expectations

The current codebase now includes structured logs, startup instrumentation, and web-vitals ingestion. If `SENTRY_DSN` or `OTEL_EXPORTER_OTLP_ENDPOINT` are configured, route that telemetry to your production sinks. Production should still capture:

- application stdout/stderr
- reverse proxy access logs
- process restarts
- database connection health and query error rates

## Current CI

CI is defined in [web-ci.yml](d:/Code/hms/.github/workflows/web-ci.yml) and runs pnpm-based lint, typecheck, Vitest, build, database bootstrapping, and Playwright smoke tests on every push and pull request.

## Recommended next hardening step

The next hardening step is:

1. connect the structured telemetry layer to production Sentry and/or OTEL collectors
2. tighten Neon SSL settings to `sslmode=verify-full`
3. add a dedicated staging database plus release promotion workflow
