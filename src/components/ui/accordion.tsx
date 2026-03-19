"use client";

import type { ReactNode } from "react";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

export function Accordion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function AccordionItem({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("management-record-shell overflow-hidden", className)}>
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      {open ? <div className="border-t border-border/70 px-5 py-4">{children}</div> : null}
    </div>
  );
}
