"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { Globe, LayoutDashboard, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { APP_TEXT } from "@/constants/appText";
import { publicSiteNavigation } from "@/lib/public-site/navigation";
import { cn } from "@/lib/utils/cn";

type PublicNavbarProps = {
  hospital: {
    displayName: string;
    logoUrl?: string | null;
  };
  extraLinks?: { label: string; href: string }[];
};

export function PublicNavbar({ hospital, extraLinks = [] }: PublicNavbarProps) {
  const pathname = usePathname();
  const allLinks = [...publicSiteNavigation, ...extraLinks];
  const mobileMenuItems = [
    ...allLinks.map((item) => ({
      label: item.label,
      href: item.href,
      icon: Globe,
    })),
    {
      label: APP_TEXT.SHELL.STAFF_ACCESS,
      href: "/login",
      icon: ShieldCheck,
    },
    {
      label: APP_TEXT.SHELL.OPEN_BOARD,
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ];

  return (
    <header className="public-grid-shell sticky top-4 z-50 rounded-[calc(var(--radius-panel)+0.2rem)] px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4 xl:gap-6">
        <Link
          className="flex min-w-0 items-center gap-4 transition-opacity hover:opacity-90"
          href="/"
        >
          {hospital.logoUrl ? (
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
              <Image
                alt={hospital.displayName}
                className="object-cover"
                fill
                src={hospital.logoUrl}
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted text-xs font-semibold text-foreground">
              {APP_TEXT.BRAND_SHORT}
            </div>
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/72">
              {APP_TEXT.PUBLIC.NAV_LABEL}
            </p>
            <span className="mt-1 block truncate text-lg font-semibold tracking-tight text-foreground">
              {hospital.displayName}
            </span>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 2xl:flex">
          {allLinks.map((item) => {
            const isActive = pathname === item.href;
            const isAnchor = item.href.startsWith("#");

            const Comp = isAnchor ? "a" : Link;

            return (
              <Comp
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
                )}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Comp>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
            <Link href="/login">{APP_TEXT.SHELL.STAFF_ACCESS}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">{APP_TEXT.SHELL.OPEN_BOARD}</Link>
          </Button>
          <div className="xl:hidden">
            <OverflowMenu items={mobileMenuItems} key={`${pathname}-public-menu`} />
          </div>
        </div>
      </div>
    </header>
  );
}
