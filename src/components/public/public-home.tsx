import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { moduleCards, workflowSteps } from "@/lib/module-config";
import { publicSiteNavigation } from "@/lib/public-site/navigation";
import { getPublicLandingSnapshot } from "@/lib/public-site/service";

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
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-panel-strong rounded-[36px] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              {snapshot.hospital.logoUrl
                ? (
                  <div className="glass-chip flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={snapshot.hospital.displayName}
                      className="h-full w-full object-cover"
                      src={snapshot.hospital.logoUrl}
                    />
                  </div>
                )
                : (
                  <div className="glass-chip flex h-12 w-12 items-center justify-center rounded-[18px] text-base font-semibold text-primary">
                    VH
                  </div>
                )}
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  {snapshot.hospital.displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Hospital operations platform for scheduling, billing, occupancy, discharge, and analytics.
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
              {[...publicSiteNavigation, {
                label: "Workflow",
                href: "#workflow",
              }, {
                label: "Modules",
                href: "#modules",
              }, {
                label: "Updates",
                href: "#updates",
              }].map((item) =>
                item.href.startsWith("/")
                  ? (
                    <Link
                      className="rounded-full px-3 py-2 transition hover:bg-white/60 hover:text-foreground dark:hover:bg-white/6"
                      href={item.href}
                      key={item.label}
                    >
                      {item.label}
                    </Link>
                  )
                  : (
                    <a
                      className="rounded-full px-3 py-2 transition hover:bg-white/60 hover:text-foreground dark:hover:bg-white/6"
                      href={item.href}
                      key={item.label}
                    >
                      {item.label}
                    </a>
                  )
              )}
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Staff access</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Open live board</Link>
              </Button>
            </nav>
          </div>
        </header>

        <main className="mt-6 space-y-8">
          <section
            className="glass-panel-strong overflow-hidden rounded-[40px] px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10"
            id="product"
          >
            <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-xl">
                <Badge className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
                  Live hospital system
                </Badge>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Transform{" "}
                  <span className="bg-[linear-gradient(120deg,var(--primary)_0%,var(--accent)_100%)] bg-clip-text text-transparent">
                    healthcare operations
                  </span>{" "}
                  with one connected command surface.
                </h1>
                <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">
                  {snapshot.hospital.displayName} runs a connected web platform for reception throughput,
                  doctor and ward coordination, billing, discharge, consent, and audit-safe administration.
                  These numbers are coming from the live seeded runtime, not a placeholder hero.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild className="min-w-[10.5rem]" size="lg">
                    <Link href="/dashboard">
                      Get started
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
                    <span className="glass-chip rounded-full px-4 py-2" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {heroMetrics.map((metric) => (
                    <SurfaceCard
                      className="rounded-[28px] border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(242,247,252,0.92)_100%)] p-5"
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

                <div className="glass-hero rounded-[30px] p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/64">
                        Hospital identity
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                        {snapshot.hospital.legalName}
                      </h2>
                    </div>
                    <Sparkles className="h-5 w-5 text-white/72" />
                  </div>
                  <div className="mt-6 grid gap-3 text-sm text-white/76 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-md">
                      <p className="text-white/58">Contact</p>
                      <p className="mt-1 font-medium text-white">
                        {snapshot.hospital.contactPhone ?? "Configured in admin"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-md">
                      <p className="text-white/58">Address</p>
                      <p className="mt-1 font-medium text-white">
                        {snapshot.hospital.address ?? "Hospital address ready for branding setup"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-[34px] border border-white/60 bg-[linear-gradient(180deg,rgba(226,236,243,0.82)_0%,rgba(210,223,233,0.66)_100%)] p-3 shadow-[var(--shadow-card)] backdrop-blur-md sm:p-5">
              <div className="rounded-[30px] border border-white/70 bg-[rgba(248,251,254,0.9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/8 dark:bg-[rgba(16,26,40,0.84)]">
                <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#f97373]" />
                      <span className="h-3 w-3 rounded-full bg-[#fbbf24]" />
                      <span className="h-3 w-3 rounded-full bg-[#34d399]" />
                    </div>
                    <div className="glass-chip rounded-full px-4 py-2 text-xs font-medium text-muted-foreground">
                      https://ops.{snapshot.hospital.displayName.toLowerCase().replaceAll(" ", "")}.in
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {["Dashboard", "Patient", "Doctors and Staff", "Room", "Occupancy", "Analytics"].map((tab, index) => (
                      <span
                        className={index === 0
                          ? "rounded-full bg-surface-strong px-4 py-2 font-medium text-white"
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
                    <section className="rounded-[28px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">Statistical summary</p>
                          <p className="text-sm text-muted-foreground">
                            Live hospital counts from patients, appointments, and occupancy.
                          </p>
                        </div>
                        <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Live sync
                        </span>
                      </div>
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {[
                          ["Number of patients", `${snapshot.metrics.totalPatients}`, "Registered", `${snapshot.metrics.activeDoctors}`, "Doctors"],
                          ["Daily visit", `${snapshot.operations.summary.appointmentsToday}`, "Scheduled", `${snapshot.operations.summary.appointmentsCheckedIn}`, "Checked in"],
                          ["Room capacity", `${snapshot.metrics.availableBeds}`, "Beds available", `${snapshot.metrics.occupiedBeds}`, "Occupied"],
                        ].map(([label, top, topLabel, bottom, bottomLabel]) => (
                          <div className="metric-tile rounded-[24px] p-4" key={label}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">{label}</p>
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(120,196,224,0.34)] text-primary">
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="mt-4 space-y-3 rounded-[20px] border border-border/60 bg-background/70 p-3 dark:bg-white/3">
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
                      <section className="rounded-[28px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">Ward capacity</p>
                            <p className="text-sm text-muted-foreground">
                              Occupancy lanes and discharge-ready movement.
                            </p>
                          </div>
                          <span className="glass-chip rounded-full px-3 py-2 text-xs text-muted-foreground">
                            {snapshot.metrics.totalBeds} beds
                          </span>
                        </div>
                        <div className="mt-5 space-y-3">
                          {snapshot.operations.wardStatus.slice(0, 4).map((ward) => {
                            const width = `${Math.round((ward.occupied / Math.max(ward.total, 1)) * 100)}%`;

                            return (
                              <div
                                className="rounded-[20px] border border-border/60 bg-background/70 p-4 dark:bg-white/3"
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
                                    className="h-2 rounded-full bg-[linear-gradient(90deg,#7dd3fc_0%,#2563eb_100%)]"
                                    style={{ width }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section className="rounded-[28px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">Doctor roster</p>
                            <p className="text-sm text-muted-foreground">
                              Real appointment load grouped from today&apos;s schedule.
                            </p>
                          </div>
                          <span className="glass-chip rounded-full px-3 py-2 text-xs text-muted-foreground">
                            Today
                          </span>
                        </div>
                        <div className="mt-5 space-y-3">
                          {snapshot.doctorLoad.map((entry) => (
                            <div
                              className="rounded-[20px] border border-border/60 bg-background/70 p-4 dark:bg-white/3"
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
                                <span className="rounded-full bg-[rgba(251,113,133,0.12)] px-3 py-1 font-medium text-[#e11d48] dark:text-[#fda4af]">
                                  {entry.nextSlot ?? "No upcoming slot"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  <aside className="rounded-[30px] bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">Care coordination</p>
                        <p className="text-sm text-muted-foreground">
                          Communication and approval pressure from the live queue.
                        </p>
                      </div>
                      <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                        {snapshot.operations.summary.pendingApprovals} waiting
                      </span>
                    </div>

                    <div className="mt-5 rounded-[22px] border border-[rgba(248,113,113,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,246,246,0.92)_100%)] p-4 dark:border-[rgba(248,113,113,0.22)] dark:bg-[rgba(127,29,29,0.12)]">
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
                          className="rounded-[20px] border border-border/60 bg-background/70 p-4 dark:bg-white/3"
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
                          className="flex gap-3 rounded-[18px] border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground dark:bg-white/3"
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
            <SurfaceCard className="rounded-[34px] p-6 sm:p-7">
              <SectionHeading
                detail="Invite-only access, patient-first workflows, occupancy control, discharge, communications, and audit visibility are built as one operating model."
                eyebrow="Workflow foundation"
                title="The product follows real hospital handoffs instead of isolated admin screens."
              />
              <div className="mt-6 space-y-4">
                {workflowSteps.map((step) => (
                  <div
                    className="rounded-[24px] border border-border/60 bg-background/70 p-5 dark:bg-white/3"
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

            <SurfaceCard className="rounded-[34px] p-6 sm:p-7" id="modules">
              <SectionHeading
                detail="The public site can describe the stack, but the real proof is that billing, staff access, communication, print, occupancy, and analytics are already connected in the running app."
                eyebrow="Live modules"
                title="Every major hospital workflow stays wired to one data model."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {moduleCards.map((module) => (
                  <article
                    className="rounded-[24px] border border-border/60 bg-background/70 p-5 dark:bg-white/3"
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
            <SurfaceCard className="rounded-[34px] p-6 sm:p-7">
              <SectionHeading
                detail="The marketing site is not a dead layer. Public posts, titles, publish dates, and excerpts are pulled from the live blog tables."
                eyebrow="Public updates"
                title="Published product notes come from the same CMS the admin team uses."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {snapshot.recentPosts.map((post) => (
                  <article
                    className="rounded-[24px] border border-border/60 bg-background/70 p-5 dark:bg-white/3"
                    key={post.id}
                  >
                    {post.coverImageUrl
                      ? (
                        <div className="mb-4 overflow-hidden rounded-[18px] border border-border/70">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
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

            <div className="glass-hero rounded-[34px] px-6 py-7 text-white shadow-[var(--shadow-card)] sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/64">
                Public to private continuity
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Marketing, product journal, and the invite-only dashboard all sit on the same hospital system.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/76">
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
      </div>
    </div>
  );
}
