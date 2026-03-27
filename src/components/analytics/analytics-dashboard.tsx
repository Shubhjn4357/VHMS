"use client";

import { useState } from "react";
import { BarChart3, Loader2, Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function matchesSearch(searchValue: string, ...parts: Array<string | number>) {
  const normalized = searchValue.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return parts.some((part) => String(part).toLowerCase().includes(normalized));
}

type AnalyticsFocus =
  | "all"
  | "finance"
  | "operations"
  | "delivery"
  | "capacity"
  | "security";

type AnalyticsDashboardProps = {
  hideHeader?: boolean;
};

export function AnalyticsDashboard({ hideHeader = false }: AnalyticsDashboardProps) {
  const analyticsQuery = useAnalyticsSnapshot();
  const [searchValue, setSearchValue] = useState("");
  const [activeFocus, setActiveFocus] = useState<AnalyticsFocus>("all");

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
    communicationWorkflows,
    roleDistribution,
    occupancyBreakdown,
  } = analyticsQuery.data;
  const filteredModuleUsage = moduleUsage.filter((entry) =>
    matchesSearch(searchValue, entry.module)
  );
  const filteredActionActivity = actionActivity.filter((entry) =>
    matchesSearch(searchValue, entry.action)
  );
  const filteredChannelPerformance = channelPerformance.filter((entry) =>
    matchesSearch(searchValue, entry.channel)
  );
  const filteredCommunicationWorkflows = communicationWorkflows.filter((entry) =>
    matchesSearch(searchValue, entry.label, entry.workflow)
  );
  const filteredSignInActivity = signInActivity.filter((entry) =>
    matchesSearch(searchValue, entry.label)
  );
  const filteredRoleDistribution = roleDistribution.filter((entry) =>
    matchesSearch(searchValue, ROLE_LABELS[entry.role], entry.role)
  );
  const filteredOccupancyBreakdown = occupancyBreakdown.filter((entry) =>
    matchesSearch(searchValue, entry.label)
  );
  const maxDailyRevenue = Math.max(
    ...dailyRevenue.map((entry) => entry.billed),
    1,
  );
  const focusCounts: Record<AnalyticsFocus, number> = {
    all: dailyRevenue.length +
      filteredModuleUsage.length +
      filteredActionActivity.length +
      filteredChannelPerformance.length +
      filteredCommunicationWorkflows.length +
      filteredSignInActivity.length +
      filteredRoleDistribution.length +
      filteredOccupancyBreakdown.length,
    finance: dailyRevenue.length,
    operations: filteredModuleUsage.length +
      filteredActionActivity.length +
      filteredRoleDistribution.length,
    delivery: filteredChannelPerformance.length +
      filteredCommunicationWorkflows.length,
    capacity: filteredOccupancyBreakdown.length,
    security: filteredSignInActivity.length,
  };
  const focusOptions: Array<{
    description: string;
    label: string;
    value: AnalyticsFocus;
  }> = [
    {
      value: "all",
      label: "All signals",
      description: "Full analytics board",
    },
    {
      value: "finance",
      label: "Finance",
      description: "Revenue and collections",
    },
    {
      value: "operations",
      label: "Operations",
      description: "Usage and activity mix",
    },
    {
      value: "delivery",
      label: "Delivery",
      description: "Channel reliability",
    },
    {
      value: "capacity",
      label: "Capacity",
      description: "Occupancy status mix",
    },
    {
      value: "security",
      label: "Security",
      description: "Sign-in outcomes",
    },
  ];
  const peakDailyRevenue = [...dailyRevenue].sort((left, right) =>
    right.billed - left.billed
  )[0] ?? null;
  const busiestModule = [...moduleUsage].sort((left, right) =>
    right.total - left.total
  )[0] ?? null;
  const weakestChannel = [...channelPerformance].sort((left, right) =>
    left.deliveryRate - right.deliveryRate
  )[0] ?? null;
  const priorityWorkflow = [...communicationWorkflows].sort((left, right) =>
    (right.messageCount + right.notificationCount) -
      (left.messageCount + left.notificationCount)
  )[0] ?? null;
  const showFinance = activeFocus === "all" || activeFocus === "finance";
  const showOperations = activeFocus === "all" || activeFocus === "operations";
  const showDelivery = activeFocus === "all" || activeFocus === "delivery";
  const showCapacity = activeFocus === "all" || activeFocus === "capacity";
  const showSecurity = activeFocus === "all" || activeFocus === "security";

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Operational analytics"
            title="Business and usage analytics"
            description="Collections, occupancy, communication reliability, staffing mix, and audit activity are tracked from the same database-backed dashboard."
          />
        )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.6fr))]">
        <SurfaceCard className="xl:col-span-2">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Workspace controls
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                Move from finance to delivery, capacity, or security without losing context
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Search usage labels and switch analytic focus areas so leadership can review
                the exact operating signal they need instead of scanning the full board on
                every visit.
              </p>
            </div>

            <div className="w-full max-w-md">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Search analytics rows
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Module, action, channel, role, or bed status"
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {focusOptions.map((option) => (
              <Button
                className="h-auto min-w-[10rem] justify-between rounded-[var(--radius-panel)] px-4 py-3 text-left"
                key={option.value}
                onClick={() => setActiveFocus(option.value)}
                size="sm"
                type="button"
                variant={activeFocus === option.value ? "secondary" : "outline"}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {option.label}
                  </span>
                  <span className="text-[11px] font-medium normal-case text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <span className="ml-3 text-xs font-semibold">
                  {focusCounts[option.value]}
                </span>
              </Button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Visible signals</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {focusCounts[activeFocus]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Rows and time slices visible inside the active analytics view.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Peak revenue day</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {peakDailyRevenue ? peakDailyRevenue.date : "No billing data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {peakDailyRevenue
              ? `${formatCurrency(peakDailyRevenue.billed)} billed and ${formatCurrency(peakDailyRevenue.paid)} collected on the strongest day.`
              : "No daily revenue data is available in this snapshot."}
          </p>
        </SurfaceCard>
      </section>

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

      <section className="grid gap-4 xl:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Most used module</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {busiestModule ? busiestModule.module : "No usage data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {busiestModule
              ? `${busiestModule.total} tracked actions were recorded in the busiest module.`
              : "Module usage metrics are not available in this snapshot."}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Delivery watch</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {weakestChannel
              ? weakestChannel.channel.replaceAll("_", " ")
              : "No delivery data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {weakestChannel
              ? `${formatPercent(weakestChannel.deliveryRate)} delivery rate with ${weakestChannel.failed} failures logged.`
              : "Channel performance metrics are not available in this snapshot."}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Security pressure</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {summary.blockedSignIns}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Blocked sign-ins captured in the current analytics window.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Workflow watch</p>
          <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {priorityWorkflow ? priorityWorkflow.label : "No workflow data"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {priorityWorkflow
              ? `${priorityWorkflow.messageCount} tracked messages and ${priorityWorkflow.unreadNotifications} unread notifications are active in the busiest communication workflow.`
              : "Reminder, discharge, and staff-notification workflow signals are not available in this snapshot."}
          </p>
        </SurfaceCard>
      </section>

      {showFinance
        ? (
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

            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Finance snapshot
              </p>
              <div className="mt-6 space-y-3">
                {[
                  ["Revenue", formatCurrency(summary.totalRevenue)],
                  ["Collected", formatCurrency(summary.amountCollected)],
                  ["Outstanding", formatCurrency(summary.outstandingAmount)],
                  ["Occupancy linked admissions", summary.activeAdmissions],
                ].map(([label, value]) => (
                  <div
                    className="management-subtle-card flex items-center justify-between px-4 py-3"
                    key={String(label)}
                  >
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-sm text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </section>
        )
        : null}

      {showOperations
        ? (
          <section className="grid gap-6 xl:grid-cols-3">
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Module usage
              </p>
              {filteredModuleUsage.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No modules match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-6 space-y-3">
                    {filteredModuleUsage.map((entry) => (
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
                )}
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Action activity
              </p>
              {filteredActionActivity.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No audit actions match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-6 space-y-3">
                    {filteredActionActivity.map((entry) => (
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
                )}
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Staff distribution
              </p>
              {filteredRoleDistribution.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No staff roles match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredRoleDistribution.map((entry) => (
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
                )}
            </SurfaceCard>
          </section>
        )
        : null}

      <section className="grid gap-6 xl:grid-cols-3">
        {showDelivery
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Channel performance
              </p>
              {filteredChannelPerformance.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No delivery channels match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredChannelPerformance.map((entry) => (
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
                )}
            </SurfaceCard>
          )
          : null}

        {showDelivery
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Care communication flows
              </p>
              {filteredCommunicationWorkflows.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No reminder, discharge, or staff-notification flows match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredCommunicationWorkflows.map((entry) => (
                      <div
                        key={entry.workflow}
                        className="management-subtle-card p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-foreground">{entry.label}</p>
                          <span className="text-sm text-primary">
                            {formatPercent(entry.deliveryRate)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.messageCount} messages / {entry.notificationCount} notifications /{" "}
                          {entry.unreadNotifications} unread
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.delivered} delivered / {entry.queued} queued / {entry.failed} failed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </SurfaceCard>
          )
          : null}

        {showSecurity
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sign-in outcomes
              </p>
              {filteredSignInActivity.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No sign-in labels match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredSignInActivity.map((entry) => (
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
                )}
            </SurfaceCard>
          )
          : null}

        {showCapacity
          ? (
            <SurfaceCard>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Bed status mix
              </p>
              {filteredOccupancyBreakdown.length === 0
                ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No bed-status rows match the current analytics search.
                  </p>
                )
                : (
                  <div className="mt-5 space-y-3">
                    {filteredOccupancyBreakdown.map((entry) => (
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
                )}
            </SurfaceCard>
          )
          : null}
      </section>
    </div>
  );
}
