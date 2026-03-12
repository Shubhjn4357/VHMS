"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROLE_LABELS } from "@/constants/roles";
import { useAuthUser } from "@/hooks/useAuthUser";
import { cn } from "@/lib/utils/cn";

type AuthUserPanelProps = {
  compact?: boolean;
};

export function AuthUserPanel({ compact = false }: AuthUserPanelProps) {
  const { isAuthenticated, user } = useAuthUser();

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Staff login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "glass-chip min-w-0 text-left transition-[padding,width] duration-200",
          compact ? "w-[3rem] rounded-[16px] px-2.5 py-2" : "rounded-[18px] px-3 py-2",
        )}
      >
        <p className="truncate text-sm font-semibold text-ink">
          {compact
            ? (user.name ?? user.email ?? "Approved user").slice(0, 1).toUpperCase()
            : user.name ?? user.email ?? "Approved user"}
        </p>
        {!compact
          ? (
            <Badge className="mt-1.5 w-fit" variant="outline">
              {ROLE_LABELS[user.role]}
            </Badge>
          )
          : null}
      </div>
      <Button
        onClick={() => signOut({ callbackUrl: "/" })}
        size={compact ? "icon" : "sm"}
        type="button"
        variant="outline"
      >
        <LogOut className="h-4 w-4" />
        {!compact
          ? <span className="hidden sm:inline">Sign out</span>
          : <span className="sr-only">Sign out</span>}
      </Button>
    </div>
  );
}
