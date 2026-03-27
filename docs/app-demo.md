# Vahi Hospital OS Deployment Demo

## Product shape

Vahi Hospital OS is a split public-site and protected-operations deployment package:

- public marketing pages: `/`, `/features`, `/solutions`, `/about`, `/contact`
- public blog and article pages: `/blog`, `/blog/[slug]`
- protected operational workspace: `/dashboard/*`
- protected print routes for A4 and thermal documents

## Primary demo journeys

### 1. Front desk intake to OPD billing

Use this flow to demonstrate the outpatient side of the system:

1. Create or locate a patient in `/dashboard/patients`
2. Register a new appointment in `/dashboard/appointments/new`
3. Run the OPD command board in `/dashboard/opd`
4. Draft the OPD bill in `/dashboard/billing/create?appointmentId=...`
5. Finalize settlement in `/dashboard/billing/checkout`
6. Reopen the billing register in `/dashboard/billing`
7. Print A4 or thermal output from `/dashboard/print/bills/[id]/a4` and `/dashboard/print/bills/[id]/thermal`

### 2. OPD to IPD admission

Use this flow to demonstrate inpatient handoff:

1. Start from a checked-in or completed appointment on `/dashboard/opd`
2. Use the handoff action to open `/dashboard/occupancy?sourceAppointmentId=...`
3. Assign a ward, room, and bed on the occupancy board
4. Continue the inpatient journey from `/dashboard/ipd`
5. Manage discharge drafts in `/dashboard/discharge-summaries`
6. Manage consent packets in `/dashboard/consents`
7. Print finalized discharge and consent artifacts from the print routes

### 3. Administration and governance

Use this flow to demonstrate system governance:

1. Approve or revoke staff access in `/dashboard/staff-access`
2. Manage charges in `/dashboard/charge-master`
3. Manage wards, rooms, and beds in `/dashboard/wards` and `/dashboard/rooms`
4. Manage feature flags and rollout posture in `/dashboard/settings`
5. Review audit activity in `/dashboard/audit-logs`

## Live modules

### Operations

- Patients
- Appointments
- Doctors
- OPD workspace
- IPD workspace
- Billing register
- Charge master
- Wards
- Rooms
- Occupancy
- Consents
- Discharge summaries
- Communications

### Admin and insight

- Dashboard overview
- Analytics
- Reports and exports
- Audit logs
- Staff access
- Profile and hospital branding
- Print template management
- Feature flags and rollout controls

### Public-facing

- Marketing landing pages
- Public blog index and articles
- Hospital branding driven from settings and uploads

## Role-based behavior

The app hides and guards modules based on resolved permissions:

- unauthenticated users are redirected to `/login`
- unauthorized users are redirected to `/access-denied`
- dashboard navigation is filtered by permissions
- APIs enforce the same permission model server-side
- bootstrap super-admin and admin emails can be provisioned from env for first access

## Key platform features

- Google sign-in with invite-only access control
- Neon/Postgres persistence
- offline drafts and background sync queue
- batch sync API at `/api/sync`
- global search and barcode lookup
- CSV, JSON, XLSX, print HTML, and PDF reporting
- A4 and thermal print outputs
- provider-backed communications via Resend and Twilio
- upload storage with automatic local, S3, or R2 selection
- staged feature flags with percentage rollout and role targeting
- structured logs, instrumentation, and web-vitals ingestion

## Demo data notes

The seeded environment includes:

- seeded doctors
- seeded patients
- seeded appointments
- seeded OPD bills
- seeded wards, rooms, beds, and admissions
- seeded communications, discharge summaries, and consent records
- seeded blog content

This makes it possible to demonstrate the public site, analytics, reports, occupancy, print routes, and most operational dashboards without creating every record from scratch.
