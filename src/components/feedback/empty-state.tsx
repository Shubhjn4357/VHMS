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
        "glass-panel-muted flex min-h-72 flex-col items-center justify-center rounded-[30px] border-dashed px-6 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-brand" />
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">
        {description}
      </p>
    </div>
  );
}
