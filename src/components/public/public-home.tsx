import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeImage } from "@/components/ui/native-image";
import { SurfaceCard } from "@/components/ui/surface-card";
import { APP_TEXT } from "@/constants/appText";
import { moduleCards, workflowSteps } from "@/lib/module-config";
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
      detail: `${snapshot.operations.summary.appointmentsToday} appointments tracked today.`,
    },
    {
      label: "Bed occupancy",
      value: formatPercent(occupancyRate),
      detail: `${snapshot.metrics.occupiedBeds} occupied and ${snapshot.metrics.availableBeds} open.`,
    },
    {
      label: "Message delivery",
      value: formatPercent(deliveryRate * 100),
      detail: `${snapshot.metrics.queuedMessages} queued communication items in the live system.`,
    },
    {
      label: "Operational footprint",
      value: `${snapshot.metrics.activeDoctors} doctors`,
      detail: `${snapshot.metrics.activeStaff} approved staff, ${snapshot.metrics.totalWards} wards, ${snapshot.metrics.totalRooms} rooms.`,
    },
  ];

  return (
    <PublicSiteChrome
      extraLinks={[
        { label: "Workflow", href: "#workflow" },
        { label: "Modules", href: "#modules" },
        { label: "Updates", href: "#updates" },
      ]}
    >
      <div className="space-y-6">
        <section className="public-grid-shell rounded-[calc(var(--radius-panel)+0.3rem)] px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-xl">
              <Badge className="rounded-full px-3 py-1.5" variant="secondary">
                {APP_TEXT.PUBLIC.HERO_BADGE}
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                The hospital no longer runs on disconnected admin screens.
              </h1>
              <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">
                {snapshot.hospital.displayName} now presents as one deployable operating
                system for reception, doctor scheduling, billing, inpatient control,
                document output, communication, and governance. The public site stays
                aligned to the live runtime instead of pretending to be a generic SaaS
                funnel.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="min-w-[11rem]" size="lg">
                  <Link href="/dashboard">
                    {APP_TEXT.SHELL.OPEN_BOARD}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="min-w-[11rem]" size="lg" variant="outline">
                  <Link href="/blog">
                    <Play className="h-4 w-4" />
                    Read journal
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {[
                  `${snapshot.metrics.totalPatients} registered patient records`,
                  `${snapshot.operations.summary.unreadNotifications} unread operational alerts`,
                  "Direct single-hospital deployment posture",
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
                  <SurfaceCard key={metric.label} className="min-h-[11.5rem]">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                      {metric.value}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {metric.detail}
                    </p>
                  </SurfaceCard>
                ))}
              </div>

              <div className="management-record-shell p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/72">
                      Hospital identity
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                      {snapshot.hospital.legalName}
                    </h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>

                <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="management-subtle-card px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                      Contact
                    </p>
                    <p className="mt-2 font-medium text-foreground">
                      {snapshot.hospital.contactPhone ?? "Configured during deployment"}
                    </p>
                  </div>
                  <div className="management-subtle-card px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                      Address
                    </p>
                    <p className="mt-2 font-medium text-foreground">
                      {snapshot.hospital.address ?? "Configured during deployment"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="management-record-shell p-4 sm:p-5">
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
                  {["Runtime", "Patients", "Doctors", "Billing", "Occupancy", "Analytics"].map((tab, index) => (
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

              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                {[
                  [
                    "Patient thread",
                    `${snapshot.metrics.totalPatients}`,
                    "Registered records",
                    `${snapshot.metrics.activeDoctors}`,
                    "Doctors on schedule",
                  ],
                  [
                    "Daily flow",
                    `${snapshot.operations.summary.appointmentsToday}`,
                    "Appointments today",
                    `${snapshot.operations.summary.appointmentsCheckedIn}`,
                    "Checked in",
                  ],
                  [
                    "Bed capacity",
                    `${snapshot.metrics.availableBeds}`,
                    "Beds available",
                    `${snapshot.metrics.occupiedBeds}`,
                    "Occupied",
                  ],
                ].map(([label, top, topLabel, bottom, bottomLabel]) => (
                  <div className="management-metric p-4" key={label}>
                    <p className="text-sm font-medium text-foreground">{label}</p>
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
            </div>

            <div className="space-y-5">
              <SurfaceCard>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Care coordination</p>
                    <p className="text-sm text-muted-foreground">
                      Communication pressure, operational alerts, and approval load.
                    </p>
                  </div>
                  <span className="management-selection-pill px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                    {snapshot.operations.summary.pendingApprovals} waiting
                  </span>
                </div>

                <div className="alert-surface-danger mt-5 rounded-[var(--radius-panel)] p-4">
                  <p className="font-medium text-foreground">Operational alerts</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {snapshot.operations.summary.unreadNotifications} notifications and{" "}
                    {snapshot.operations.summary.pendingApprovals} sensitive approvals still
                    need review.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {snapshot.operations.communicationQueue.map((entry) => (
                    <div className="management-subtle-card p-4" key={entry.channel}>
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
              </SurfaceCard>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]" id="workflow">
          <SurfaceCard className="space-y-6">
            <SectionHeading
              eyebrow="Workflow foundation"
              title="The product follows real hospital handoffs instead of isolated admin screens."
              detail="Invite-only access, patient-first workflows, occupancy control, discharge, communications, and audit visibility are built as one operating model."
            />
            <div className="space-y-4">
              {workflowSteps.map((step) => (
                <div className="management-subtle-card p-5" key={step.step}>
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

          <SurfaceCard className="space-y-6" id="modules">
            <SectionHeading
              eyebrow="Live modules"
              title="Every major hospital workflow stays wired to one data model."
              detail="The public site can explain the stack, but the stronger proof is that billing, staff access, communication, print, occupancy, and analytics are already connected in the running app."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {moduleCards.map((module) => (
                <article className="management-subtle-card p-5" key={module.name}>
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

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]" id="updates">
          <SurfaceCard className="space-y-6">
            <SectionHeading
              eyebrow="Public updates"
              title="Published rollout notes come from the same CMS the admin team uses."
              detail="The public journal is not a dead brochure layer. Articles, excerpts, publish dates, and cover media are pulled from the live blog tables."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {snapshot.recentPosts.map((post) => (
                <article className="management-subtle-card p-5" key={post.id}>
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

          <div className="public-grid-shell rounded-[calc(var(--radius-panel)+0.2rem)] px-6 py-7 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              Public to private continuity
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              The public site, the journal, and the invite-only runtime all belong to one hospital system.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              That keeps the sales-facing surface grounded in real throughput data,
              while the private app continues into staff access, scheduling, billing,
              occupancy, discharge, and analytics without switching design language or
              inventing a fake product story.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                `${snapshot.metrics.publishedPosts} public updates are published from the same CMS used inside the runtime.`,
                `${snapshot.metrics.totalWards} wards and ${snapshot.metrics.totalRooms} rooms are already mapped into the occupancy engine.`,
                `${snapshot.metrics.activeStaff} approved operational staff users are represented in the current seed data.`,
              ].map((detail) => (
                <div className="management-subtle-card flex gap-3 px-4 py-3 text-sm text-muted-foreground" key={detail}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">Open runtime</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Plan deployment</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicSiteChrome>
  );
}
