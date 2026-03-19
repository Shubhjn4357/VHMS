import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeImage } from "@/components/ui/native-image";
import { SurfaceCard } from "@/components/ui/surface-card";
import { APP_TEXT } from "@/constants/appText";
import { moduleCards, workflowSteps } from "@/lib/module-config";
import { getPublicLandingSnapshot } from "@/lib/public-site/service";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function SectionHeading(props: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
        {props.eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {props.title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
        {props.detail}
      </p>
    </div>
  );
}

export async function PublicHome() {
  noStore();

  const snapshot = await getPublicLandingSnapshot();
  const occupancyRate = snapshot.metrics.totalBeds > 0
    ? (snapshot.metrics.occupiedBeds / snapshot.metrics.totalBeds) * 100
    : 0;
  const deliveryRate = snapshot.operations.communicationQueue.reduce(
    (sum, entry) => sum + entry.delivered,
    0,
  ) /
    Math.max(
      snapshot.operations.communicationQueue.reduce(
        (sum, entry) => sum + entry.total,
        0,
      ),
      1,
    );

  const heroMetrics = [
    {
      label: "Collections today",
      value: formatCurrency(snapshot.operations.summary.collectionsToday),
      detail: `${snapshot.operations.summary.appointmentsToday} appointments running today.`,
    },
    {
      label: "Bed occupancy",
      value: formatPercent(occupancyRate),
      detail: `${snapshot.metrics.occupiedBeds} occupied and ${snapshot.metrics.availableBeds} available.`,
    },
    {
      label: "Message queue",
      value: `${snapshot.metrics.queuedMessages}`,
      detail: `${formatPercent(deliveryRate * 100)} delivery completion across channels.`,
    },
    {
      label: "Live footprint",
      value: `${snapshot.metrics.activeDoctors} doctors`,
      detail: `${snapshot.metrics.activeStaff} staff, ${snapshot.metrics.totalWards} wards, ${snapshot.metrics.totalRooms} rooms.`,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PublicNavbar 
          hospital={snapshot.hospital} 
          extraLinks={[
            { label: "Workflow", href: "#workflow" },
            { label: "Modules", href: "#modules" },
            { label: "Updates", href: "#updates" }
          ]}
        />

        <main className="mt-8 space-y-12">
          <section
            className="overflow-hidden rounded-[var(--radius-panel)] border bg-card px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8 sm:py-9 lg:px-10 lg:py-10"
            id="product"
          >
            <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-xl">
                <Badge className="rounded-md px-3 py-1 text-[11px]" variant="secondary">
                  {APP_TEXT.PUBLIC.HERO_BADGE}
                </Badge>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Transform healthcare operations with one connected command
                  surface.
                </h1>
                <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">
                  {snapshot.hospital.displayName} runs a connected web platform for reception throughput,
                  doctor and ward coordination, billing, discharge, consent, and audit-safe administration.
                  These numbers are coming from the live seeded runtime, not a placeholder hero.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild className="min-w-[10.5rem]" size="lg">
                    <Link href="/dashboard">
                      {APP_TEXT.SHELL.OPEN_BOARD}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild className="min-w-[10.5rem]" size="lg" variant="outline">
                    <Link href="/blog">
                      <Play className="h-4 w-4" />
                      Product journal
                    </Link>
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {[
                    `${snapshot.metrics.totalPatients} registered patients`,
                    `${snapshot.metrics.activeDoctors} doctors on live schedule`,
                    `${snapshot.operations.summary.unreadNotifications} unread operational alerts`,
                  ].map((item) => (
                    <span className="management-selection-pill px-4 py-2" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {heroMetrics.map((metric) => (
                    <SurfaceCard
                    className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-[var(--shadow-soft)]"
                      key={metric.label}
                    >
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {metric.detail}
                      </p>
                    </SurfaceCard>
                  ))}
                </div>

                <div className="rounded-[var(--radius-panel)] border bg-primary/[0.06] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                        Hospital identity
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                        {snapshot.hospital.legalName}
                      </h2>
                    </div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-6 grid gap-3 text-sm text-foreground sm:grid-cols-2">
                    <div className="management-subtle-card px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Contact</p>
                      <p className="mt-1 font-medium text-foreground">
                        {snapshot.hospital.contactPhone ?? "Configured in admin"}
                      </p>
                    </div>
                    <div className="management-subtle-card px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Address</p>
                      <p className="mt-1 font-medium text-foreground">
                        {snapshot.hospital.address ?? "Hospital address ready for branding setup"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-[var(--radius-panel)] border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-5">
              <div className="rounded-[var(--radius-panel)] border bg-background p-4">
                <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="signal-dot signal-dot-danger h-3 w-3 rounded-full" />
                      <span className="signal-dot signal-dot-warning h-3 w-3 rounded-full" />
                      <span className="signal-dot signal-dot-success h-3 w-3 rounded-full" />
                    </div>
                    <div className="management-selection-pill px-4 py-2 text-xs font-medium text-muted-foreground">
                      https://ops.{snapshot.hospital.displayName.toLowerCase().replaceAll(" ", "")}.in
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {["Dashboard", "Patient", "Doctors and Staff", "Room", "Occupancy", "Analytics"].map((tab, index) => (
                      <span
                        className={index === 0
                          ? "management-selection-pill bg-secondary px-4 py-2 font-medium text-secondary-foreground"
                          : "rounded-full px-3 py-2 text-muted-foreground"}
                        key={tab}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
                  <div className="space-y-5">
                    <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">Statistical summary</p>
                          <p className="text-sm text-muted-foreground">
                            Live hospital counts from patients, appointments, and occupancy.
                          </p>
                        </div>
                        <span className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Live sync
                        </span>
                      </div>
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {[
                          ["Number of patients", `${snapshot.metrics.totalPatients}`, "Registered", `${snapshot.metrics.activeDoctors}`, "Doctors"],
                          ["Daily visit", `${snapshot.operations.summary.appointmentsToday}`, "Scheduled", `${snapshot.operations.summary.appointmentsCheckedIn}`, "Checked in"],
                          ["Room capacity", `${snapshot.metrics.availableBeds}`, "Beds available", `${snapshot.metrics.occupiedBeds}`, "Occupied"],
                        ].map(([label, top, topLabel, bottom, bottomLabel]) => (
                          <div className="management-metric p-4" key={label}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">{label}</p>
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/16 text-primary">
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="management-subtle-card mt-4 space-y-3 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground">{topLabel}</span>
                                <span className="text-2xl font-semibold text-foreground">{top}</span>
                              </div>
                              <div className="h-px bg-border/70" />
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground">{bottomLabel}</span>
                                <span className="text-2xl font-semibold text-foreground">{bottom}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">Ward capacity</p>
                            <p className="text-sm text-muted-foreground">
                              Occupancy lanes and discharge-ready movement.
                            </p>
                          </div>
                          <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
                            {snapshot.metrics.totalBeds} beds
                          </span>
                        </div>
                        <div className="mt-5 space-y-3">
                          {snapshot.operations.wardStatus.slice(0, 4).map((ward) => {
                            const width = `${Math.round((ward.occupied / Math.max(ward.total, 1)) * 100)}%`;

                            return (
                              <div
                                className="management-subtle-card p-4"
                                key={ward.wardId}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{ward.wardName}</p>
                                    <p className="text-sm text-muted-foreground">{ward.status}</p>
                                  </div>
                                  <span className="text-sm font-semibold text-foreground">
                                    {ward.occupied}/{ward.total}
                                  </span>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-border/45">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">Doctor roster</p>
                            <p className="text-sm text-muted-foreground">
                              Real appointment load grouped from today&apos;s schedule.
                            </p>
                          </div>
                          <span className="management-selection-pill px-3 py-2 text-xs text-muted-foreground">
                            Today
                          </span>
                        </div>
                        <div className="mt-5 space-y-3">
                          {snapshot.doctorLoad.map((entry) => (
                            <div
                              className="management-subtle-card p-4"
                              key={entry.doctorName}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-foreground">{entry.doctorName}</p>
                                  <p className="text-sm text-muted-foreground">{entry.specialty}</p>
                                </div>
                                <span className="text-sm font-semibold text-foreground">
                                  {entry.appointmentsToday} visits
                                </span>
                              </div>
                              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">
                                  Checked in {entry.checkedIn}
                                </span>
                                <span className="status-pill-danger rounded-full px-3 py-1 font-medium">
                                  {entry.nextSlot ?? "No upcoming slot"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  <aside className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-[var(--shadow-soft)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">Care coordination</p>
                        <p className="text-sm text-muted-foreground">
                          Communication and approval pressure from the live queue.
                        </p>
                      </div>
                      <span className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                        {snapshot.operations.summary.pendingApprovals} waiting
                      </span>
                    </div>

                    <div className="alert-surface-danger mt-5 rounded-[var(--radius-panel)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">Operational alerts</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {snapshot.operations.summary.unreadNotifications} notifications and{" "}
                            {snapshot.operations.summary.pendingApprovals} sensitive approvals still need review.
                          </p>
                        </div>
                        <Button size="sm" type="button" variant="outline">
                          Review
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {snapshot.operations.communicationQueue.map((entry) => (
                        <div
                          className="management-subtle-card p-4"
                          key={entry.channel}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {entry.channel.replaceAll("_", " ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {entry.delivered} delivered, {entry.queued} queued, {entry.failed} failed
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{entry.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3">
                      {[
                        `${snapshot.metrics.publishedPosts} published public updates available for SEO-facing communication.`,
                        `${snapshot.metrics.totalWards} wards and ${snapshot.metrics.totalRooms} rooms are mapped into the occupancy engine.`,
                        `${snapshot.metrics.activeStaff} approved operational staff users are represented in the live master data.`,
                      ].map((detail) => (
                        <div
                          className="management-subtle-card flex gap-3 px-4 py-3 text-sm text-muted-foreground"
                          key={detail}
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="workflow">
            <SurfaceCard className="p-6 sm:p-7">
              <SectionHeading
                detail="Invite-only access, patient-first workflows, occupancy control, discharge, communications, and audit visibility are built as one operating model."
                eyebrow="Workflow foundation"
                title="The product follows real hospital handoffs instead of isolated admin screens."
              />
              <div className="mt-6 space-y-4">
                {workflowSteps.map((step) => (
                  <div
                    className="management-subtle-card p-5"
                    key={step.step}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                      Step {step.step}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-6 sm:p-7" id="modules">
              <SectionHeading
                detail="The public site can describe the stack, but the real proof is that billing, staff access, communication, print, occupancy, and analytics are already connected in the running app."
                eyebrow="Live modules"
                title="Every major hospital workflow stays wired to one data model."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {moduleCards.map((module) => (
                  <article
                    className="management-subtle-card p-5"
                    key={module.name}
                  >
                    <p
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${module.accent}`}
                    >
                      {module.status}
                    </p>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                      {module.name}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {module.summary}
                    </p>
                  </article>
                ))}
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" id="updates">
            <SurfaceCard className="p-6 sm:p-7">
              <SectionHeading
                detail="The marketing site is not a dead layer. Public posts, titles, publish dates, and excerpts are pulled from the live blog tables."
                eyebrow="Public updates"
                title="Published product notes come from the same CMS the admin team uses."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {snapshot.recentPosts.map((post) => (
                  <article
                    className="management-subtle-card p-5"
                    key={post.id}
                  >
                    {post.coverImageUrl
                      ? (
                        <div className="mb-4 overflow-hidden rounded-[var(--radius-control)] border border-border/70">
                          <NativeImage
                            alt={post.title}
                            className="h-40 w-full object-cover"
                            src={post.coverImageUrl}
                          />
                        </div>
                      )
                      : null}
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {post.category?.name ?? "Hospital operations"}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {post.excerpt ?? post.body.slice(0, 120)}
                    </p>
                    <Link
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                      href={`/blog/${post.slug}`}
                    >
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                ))}
              </div>
            </SurfaceCard>

            <div className="rounded-[var(--radius-panel)] border bg-primary/[0.06] px-6 py-7 shadow-[var(--shadow-soft)] sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                Public to private continuity
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Marketing, product journal, and the invite-only dashboard all sit on the same hospital system.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                That keeps the public landing page grounded in real throughput numbers, while the private app
                continues into staff access, scheduling, billing, occupancy, discharge, and analytics without
                switching design language or data source.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/blog">Read public updates</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}
