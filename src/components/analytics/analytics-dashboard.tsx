"use client";

import { BarChart3, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
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
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Daily revenue trend
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-7">
            {dailyRevenue.map((entry) => (
              <div key={entry.date} className="space-y-3">
                <div className="management-subtle-card flex h-48 items-end rounded-xl p-3">
                  <div
                    className="w-full rounded-lg bg-primary"
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
                  <p className="text-sm font-medium text-foreground">
                    {entry.date.slice(5)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(entry.billed)}
                  </p>
                  <p className="text-xs text-primary">
                    Paid {formatCurrency(entry.paid)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Module usage
            </p>
            <div className="mt-6 space-y-3">
              {moduleUsage.map((entry) => (
                <div
                  key={entry.module}
                  className="management-subtle-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-foreground">{entry.module}</p>
                    <Badge variant="outline">
                      {entry.total}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Action activity
            </p>
            <div className="mt-6 space-y-3">
              {actionActivity.map((entry) => (
                <div
                  key={entry.action}
                  className="management-subtle-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-foreground">
                      {entry.action.replaceAll(".", " ")}
                    </p>
                    <Badge variant="outline">
                      {entry.total}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Channel performance
          </p>
          <div className="mt-5 space-y-3">
            {channelPerformance.map((entry) => (
              <div
                key={entry.channel}
                className="management-subtle-card p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-foreground">
                    {entry.channel.replaceAll("_", " ")}
                  </p>
                  <span className="text-sm text-primary">
                    {formatPercent(entry.deliveryRate)}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {entry.delivered} delivered / {entry.queued} queued /{" "}
                  {entry.failed} failed
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sign-in outcomes
          </p>
          <div className="mt-5 space-y-3">
            {signInActivity.map((entry) => (
              <div
                key={entry.label}
                className="management-subtle-card flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {entry.label}
                </span>
                <span className="text-sm text-muted-foreground">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Staff distribution
          </p>
          <div className="mt-5 space-y-3">
            {roleDistribution.map((entry) => (
              <div
                key={entry.role}
                className="management-subtle-card flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {ROLE_LABELS[entry.role]}
                </span>
                <span className="text-sm text-muted-foreground">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bed status mix
          </p>
          <div className="mt-5 space-y-3">
            {occupancyBreakdown.map((entry) => (
              <div
                key={entry.label}
                className="management-subtle-card flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {entry.label.replaceAll("_", " ")}
                </span>
                <span className="text-sm text-muted-foreground">{entry.total}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
