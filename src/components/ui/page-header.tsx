import type { ReactNode } from "react";

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
        "glass-panel-strong flex flex-col gap-4 rounded-[24px] p-4 text-card-foreground lg:flex-row lg:items-end lg:justify-between lg:p-5",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow
          ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
              {eyebrow}
            </p>
          )
          : null}
        <h1 className="mt-1.5 text-[1.45rem] font-semibold tracking-tight text-foreground sm:text-[1.8rem]">
          {title}
        </h1>
        {description
          ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              {description}
            </p>
          )
          : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
