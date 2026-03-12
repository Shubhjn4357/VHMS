import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[18px] bg-[linear-gradient(90deg,rgba(148,163,184,0.14)_0%,rgba(148,163,184,0.26)_50%,rgba(148,163,184,0.14)_100%)] dark:bg-[linear-gradient(90deg,rgba(71,85,105,0.28)_0%,rgba(100,116,139,0.42)_50%,rgba(71,85,105,0.28)_100%)]",
        className,
      )}
      {...props}
    />
  );
}
