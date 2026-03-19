"use client";

import Link from "next/link";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useBillingDirectory } from "@/hooks/useBillingApi";
import { useChargeDirectory } from "@/hooks/useChargesApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";

import { BillingRegisterPanel } from "./billing-register-panel";
import { ChargeMasterPanel } from "./charge-master-panel";

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

type BillingManagementProps = {
  hideHeader?: boolean;
};

export function BillingManagement({ hideHeader = false }: BillingManagementProps) {
  const chargeQuery = useChargeDirectory();
  const billingQuery = useBillingDirectory();
  const { canAccess: canFinalizeBilling } = useModuleAccess([
    "billing.finalize",
  ]);

  const chargeSummary = chargeQuery.data?.summary;
  const billSummary = billingQuery.data?.summary;

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 3 billing core"
            title="Charge master and OPD billing"
            description="This slice turns the queue into revenue operations: reusable charge master entries, appointment-linked draft bills, and controlled settlement handled by billing-finalize permissions."
            actions={
              <>
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href="/dashboard/charge-master"
                >
                  Charge master
                </Link>
                <Link
                  className={buttonVariants({ variant: "default" })}
                  href="/dashboard/billing/create"
                >
                  New invoice workspace
                </Link>
                {canFinalizeBilling
                  ? (
                    <Link
                      className={buttonVariants({ variant: "outline" })}
                      href="/dashboard/billing/checkout"
                    >
                      Checkout desk
                    </Link>
                  )
                  : null}
                <Button
                  onClick={() => {
                    void chargeQuery.refetch();
                    void billingQuery.refetch();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {chargeQuery.isFetching || billingQuery.isFetching
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </Button>
              </>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-5">
        {[
          ["Charges", chargeSummary?.total ?? 0, "Configured billable entries"],
          [
            "Active charges",
            chargeSummary?.active ?? 0,
            "Visible in bill composer",
          ],
          ["Bills", billSummary?.total ?? 0, "Current billing register"],
          [
            "Collected",
            formatCurrency(billSummary?.amountCollected ?? 0),
            "Settled amount across listed bills",
          ],
          [
            "Outstanding",
            formatCurrency(billSummary?.outstandingAmount ?? 0),
            "Still pending collection",
          ],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <ChargeMasterPanel />
        <div className="space-y-6">
          <SurfaceCard className="overflow-hidden">
            <div className="relative">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -bottom-10 right-10 h-28 w-28 rounded-full bg-success/10 blur-2xl" />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Invoice runtime
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Create draft bills on a full page
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
                  The bill composer now lives on its own route so charge
                  selection, line items, totals, and offline drafts have room
                  to breathe without squeezing the billing register.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className={buttonVariants({ variant: "default" })}
                    href="/dashboard/billing/create"
                  >
                    Open invoice workspace
                  </Link>
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href="/dashboard/charge-master"
                  >
                    Open charge master
                  </Link>
                  {canFinalizeBilling
                    ? (
                      <Link
                        className={buttonVariants({ variant: "outline" })}
                        href="/dashboard/billing/checkout"
                      >
                        Open checkout desk
                      </Link>
                    )
                    : null}
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href="/dashboard/print-templates"
                  >
                    Tune print templates
                  </Link>
                </div>
              </div>
            </div>
          </SurfaceCard>
          <BillingRegisterPanel />
        </div>
      </section>
    </div>
  );
}
