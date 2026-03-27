import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[calc(var(--radius-panel)+0.05rem)] border border-border/80 bg-card p-5 text-card-foreground shadow-[var(--shadow-soft)] sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow
            ? (
              <Badge className="mb-3 w-fit rounded-full" variant="secondary">
                {eyebrow}
              </Badge>
            )
            : null}
          <h1 className="text-[1.45rem] font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
            {title}
          </h1>
          {description
            ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )
            : null}
        </div>

        {actions
          ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {actions}
            </div>
          )
          : null}
      </div>
    </div>
  );
}
