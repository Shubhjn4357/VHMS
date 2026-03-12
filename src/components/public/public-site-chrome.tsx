import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getHospitalBranding } from "@/lib/hospital/service";
import { publicSiteNavigation } from "@/lib/public-site/navigation";

export async function PublicSiteChrome({
  children,
}: {
  children: ReactNode;
}) {
  const hospital = await getHospitalBranding();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-panel-strong rounded-[34px] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              {hospital.logoUrl
                ? (
                  <div className="glass-chip flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={hospital.displayName}
                      className="h-full w-full object-cover"
                      src={hospital.logoUrl}
                    />
                  </div>
                )
                : (
                  <div className="glass-chip flex h-11 w-11 items-center justify-center rounded-[16px] text-sm font-semibold text-primary">
                    VH
                  </div>
                )}
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  {hospital.displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Public product journal and launch-facing hospital system surface.
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
              {publicSiteNavigation.map((item) => (
                <Link
                  className="rounded-full px-3 py-2 transition hover:bg-white/60 hover:text-foreground dark:hover:bg-white/6"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Staff access</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Open live board</Link>
              </Button>
            </nav>
          </div>
        </header>

        <div className="mt-6">{children}</div>

        <footer className="glass-panel mt-6 rounded-[34px] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                VHMS Product Journal
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Public writing for operators, administrators, and hospital teams
                evaluating secure digital workflows, billing controls, occupancy
                operations, and audit-ready rollout.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-muted-foreground">
              {publicSiteNavigation.map((item) => (
                <Link
                  className="transition hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="transition hover:text-foreground">
                Staff login
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
