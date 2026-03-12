# VHMS Enterprise

VHMS Enterprise is a production-oriented hospital operations platform built on Next.js, Auth.js, Drizzle ORM, TanStack Query, and a pnpm-only workflow. It includes invite-only Google sign-in, role-based module access, patient and appointment masters, OPD/IPD workflows, billing, occupancy, discharge and consent workflows, communications, analytics, print-safe documents, offline/PWA support, barcode lookup, rollout-capable feature flags, and pluggable upload storage.

## Stack

- Next.js 16 App Router
- Auth.js (`next-auth` beta) with Google provider
- Drizzle ORM
- Neon/Postgres runtime for application data
- TanStack Query + Axios
- DnD Kit
- `html5-qrcode` for camera barcode scanning
- Vitest for unit tests
- Playwright for smoke e2e checks
- pnpm for dependency management and task execution
- local uploads by default, with automatic AWS S3 or Cloudflare R2 activation when configured

## Local workflow

Install dependencies:

```bash
pnpm install
```

Run the app on port `3000`:

```bash
pnpm dev
```

Core verification commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Database tasks:

```bash
pnpm db:generate
pnpm db:push -- --force
pnpm db:seed
```

Playwright smoke tests:

```bash
node ./node_modules/@playwright/test/cli.js install chromium
pnpm test:e2e
```

## Environment

Copy [.env.example](d:/Code/hms/web/.env.example) to `web/.env` and set at minimum:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_NAME`
- `HOSPITAL_NAME`

For deployment-oriented setup, start from [.env.production.example](d:/Code/hms/web/.env.production.example).

Bootstrap emails in `BOOTSTRAP_SUPER_ADMIN_EMAILS` and `BOOTSTRAP_ADMIN_EMAILS` bypass the invite table and are intended for permanent owner/admin access.

## Storage

Uploads use local disk by default. The runtime now automatically switches to cloud storage when credentials are present:

- Cloudflare R2 is preferred when `R2_*` env vars are configured
- AWS S3 is used when `S3_*` env vars are configured
- local disk remains the fallback when neither cloud provider is configured

The upload runtime is implemented in [service.ts](d:/Code/hms/web/src/lib/uploads/service.ts).

## App demo

The full module walkthrough, feature map, seeded demo flows, and role-aware navigation summary are documented in [app-demo.md](d:/Code/hms/web/docs/app-demo.md).

## Production notes

The runtime uses network Postgres in [client.ts](d:/Code/hms/web/src/db/client.ts), so production data no longer lands in a local SQLite file.

That means:

- point `DATABASE_URL` at Neon or another Postgres instance
- run migrations before first production boot
- seed only when intentionally loading reference/demo data
- use persistent storage for uploads if you are not staying on local disk

See [deployment.md](d:/Code/hms/web/docs/deployment.md) for the rollout checklist and production notes.

## Current test coverage

Unit coverage currently targets:

- billing calculations and payment state
- permission checks
- feature flag resolution helpers
- staff access normalization and permission filtering
- invite-only bootstrap role helpers
- search normalization and exact-match rules
- blog slug generation
- report CSV export generation

Playwright smoke coverage currently checks:

- public offline fallback page
- unauthenticated dashboard guard redirect

## CI

GitHub Actions CI is defined in [web-ci.yml](d:/Code/hms/.github/workflows/web-ci.yml). It runs:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Playwright Chromium install
- `pnpm test:e2e`
