"use client";

import { CircleUserRound, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { OverflowMenu } from "@/components/ui/overflow-menu";
import { APP_TEXT } from "@/constants/appText";
import { ROLE_LABELS } from "@/constants/roles";
import { useAuthUser } from "@/hooks/useAuthUser";
import { cn } from "@/lib/utils/cn";

type AuthUserPanelProps = {
  compact?: boolean;
};

export function AuthUserPanel({ compact = false }: AuthUserPanelProps) {
  const { isAuthenticated, user } = useAuthUser();
  const pathname = usePathname();

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "rounded-full",
        )}
      >
        {APP_TEXT.SHELL.STAFF_ACCESS}
      </Link>
    );
  }

  const userLabel = user.name ?? user.email ?? "Approved user";
  const initials = userLabel.slice(0, 1).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={cn(
          "flex min-w-0 items-center gap-3 border border-border/70 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--card)_95%,white_5%)_0%,color-mix(in_srgb,var(--card)_90%,var(--accent)_10%)_100%)] text-left shadow-[var(--shadow-soft)]",
          compact ? "rounded-full px-1.5 py-1.5" : "rounded-full px-2 py-1.5 pr-3.5",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-primary/18 bg-background text-sm font-semibold text-foreground",
            compact ? "h-9 w-9" : "h-10 w-10",
          )}
        >
          {initials}
        </span>
        {!compact
          ? (
            <div className="min-w-0 pr-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {userLabel}
                </p>
                <span className="signal-dot signal-dot-success h-2 w-2 rounded-full" />
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">{ROLE_LABELS[user.role]}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                <p className="truncate">{user.email}</p>
              </div>
            </div>
          )
          : (
            <div className="pr-1">
              <span className="signal-dot signal-dot-success block h-2.5 w-2.5 rounded-full" />
            </div>
          )}
      </div>
      <OverflowMenu
        key={`${pathname}-auth-menu`}
        triggerClassName="rounded-full border-border/70 bg-card/90 shadow-[var(--shadow-soft)]"
        items={[
          {
            label: "Profile",
            description: "Review account identity and dashboard access context.",
            href: "/dashboard/profile",
            icon: CircleUserRound,
          },
          {
            label: "Settings",
            description: "Open hospital profile, flags, and templates.",
            href: "/dashboard/settings",
            icon: Settings2,
          },
          {
            label: "Sign out",
            description: "Close the current authenticated session.",
            icon: LogOut,
            onSelect: () => signOut({ callbackUrl: "/" }),
            tone: "danger",
          },
        ]}
      />
    </div>
  );
}
