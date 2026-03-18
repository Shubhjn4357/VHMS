import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center shadow-sm",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground" />
      <h3 className="mt-4 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
