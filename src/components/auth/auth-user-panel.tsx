"use client";

import { CircleUserRound, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { OptionsMenu } from "@/components/ui/options-menu";
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
        className={buttonVariants({ size: "sm", variant: "outline" })}
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
          "flex min-w-0 items-center gap-3 border bg-background text-left shadow-[var(--shadow-soft)] transition-[padding,width] duration-200",
          compact ? "rounded-lg px-2 py-2" : "rounded-xl px-3 py-2.5",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-foreground">
          {initials}
        </span>
        {!compact
          ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-ink">
                {userLabel}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <Badge className="mt-2 w-fit" variant="outline">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          )
          : null}
      </div>
      <OptionsMenu
        key={`${pathname}-auth-menu`}
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
