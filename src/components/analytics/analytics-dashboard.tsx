"use client";

import { BarChart3, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROLE_LABELS } from "@/constants/roles";
import { useAnalyticsSnapshot } from "@/hooks/useAnalyticsApi";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

type AnalyticsDashboardProps = {
  hideHeader?: boolean;
};

export function AnalyticsDashboard({ hideHeader = false }: AnalyticsDashboardProps) {
  const analyticsQuery = useAnalyticsSnapshot();

  if (analyticsQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={Loader2}
        title="Loading analytics snapshot"
        description="Business, usage, and delivery metrics are being aggregated."
      />
    );
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <EmptyState
        className="min-h-[36rem]"
        icon={BarChart3}
        title="Analytics snapshot is unavailable"
        description={analyticsQuery.error instanceof Error
          ? analyticsQuery.error.message
          : "The analytics request failed."}
      />
    );
  }

  const {
    summary,
    dailyRevenue,
    actionActivity,
    moduleUsage,
    signInActivity,
    channelPerformance,
    roleDistribution,
    occupancyBreakdown,
  } = analyticsQuery.data;
  const maxDailyRevenue = Math.max(
    ...dailyRevenue.map((entry) => entry.billed),
    1,
  );

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 7 analytics"
            title="Business and usage analytics"
            description="Collections, occupancy, communication reliability, staffing mix, and audit activity are tracked from the same database-backed dashboard."
          />
        )}

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Total revenue", formatCurrency(summary.totalRevenue)],
          ["Collected", formatCurrency(summary.amountCollected)],
          ["Delivery rate", formatPercent(summary.deliveryRate)],
          ["Occupancy", formatPercent(summary.occupancyRate)],
          ["Active admissions", summary.activeAdmissions],
          ["Audit events", summary.auditEvents],
          ["Unread alerts", summary.unreadNotifications],
          ["Outstanding", formatCurrency(summary.outstandingAmount)],
          ["Successful sign-ins", summary.successfulSignIns],
          ["Blocked sign-ins", summary.blockedSignIns],
        ].map(([label, value]) => (
          <SurfaceCard key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Daily revenue trend
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-7">
            {dailyRevenue.map((entry) => (
              <div key={entry.date} className="space-y-3">
                <div className="glass-panel-muted flex h-48 items-end rounded-[24px] p-3">
                  <div
                    className="w-full rounded-[18px] bg-[linear-gradient(180deg,#2dd4bf_0%,#155eef_100%)]"
                    style={{
                      height: `${
                        Math.max(
                          (entry.billed / maxDailyRevenue) * 100,
                          8,
                        )
                      }%`,
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {entry.date.slice(5)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatCurrency(entry.billed)}
                  </p>
                  <p className="text-xs text-brand">
                    Paid {formatCurrency(entry.paid)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Module usage
            </p>
            <div className="mt-6 space-y-3">
              {moduleUsage.map((entry) => (
                <div
                  key={entry.module}
                  className="glass-panel-muted rounded-[22px] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-ink">{entry.module}</p>
                    <span className="glass-chip rounded-full px-3 py-2 text-sm text-ink">
                      {entry.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Action activity
            </p>
            <div className="mt-6 space-y-3">
              {actionActivity.map((entry) => (
                <div
                  key={entry.action}
                  className="glass-panel-muted rounded-[22px] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-ink">
                      {entry.action.replaceAll(".", " ")}
                    </p>
                    <span className="glass-chip rounded-full px-3 py-2 text-sm text-ink">
                      {entry.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Channel performance
          </p>
          <div className="mt-5 space-y-3">
            {channelPerformance.map((entry) => (
              <div
                key={entry.channel}
                className="glass-panel-muted rounded-[22px] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-ink">
                    {entry.channel.replaceAll("_", " ")}
                  </p>
                  <span className="text-sm text-brand">
                    {formatPercent(entry.deliveryRate)}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-soft">
                  {entry.delivered} delivered / {entry.queued} queued /{" "}
                  {entry.failed} failed
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Sign-in outcomes
          </p>
          <div className="mt-5 space-y-3">
            {signInActivity.map((entry) => (
              <div
                key={entry.label}
                className="glass-panel-muted flex items-center justify-between rounded-[22px] px-4 py-3"
              >
                <span className="text-sm font-medium text-ink">
                  {entry.label}
                </span>
                <span className="text-sm text-ink-soft">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Staff distribution
          </p>
          <div className="mt-5 space-y-3">
            {roleDistribution.map((entry) => (
              <div
                key={entry.role}
                className="glass-panel-muted flex items-center justify-between rounded-[22px] px-4 py-3"
              >
                <span className="text-sm font-medium text-ink">
                  {ROLE_LABELS[entry.role]}
                </span>
                <span className="text-sm text-ink-soft">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Bed status mix
          </p>
          <div className="mt-5 space-y-3">
            {occupancyBreakdown.map((entry) => (
              <div
                key={entry.label}
                className="glass-panel-muted flex items-center justify-between rounded-[22px] px-4 py-3"
              >
                <span className="text-sm font-medium text-ink">
                  {entry.label.replaceAll("_", " ")}
                </span>
                <span className="text-sm text-ink-soft">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
