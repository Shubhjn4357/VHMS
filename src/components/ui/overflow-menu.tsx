"use client";

import type { LucideIcon } from "lucide-react";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_TEXT } from "@/constants/appText";
import { cn } from "@/lib/utils/cn";

export type OverflowMenuItem = {
  label: string;
  description?: string;
  href?: string;
  onSelect?: () => void;
  icon?: LucideIcon;
  tone?: "default" | "danger";
};

type OverflowMenuProps = {
  items: OverflowMenuItem[];
  align?: "left" | "right";
  label?: string;
  className?: string;
  triggerClassName?: string;
  size?: "icon" | "sm";
};

export function OverflowMenu({
  items,
  align = "right",
  label = APP_TEXT.FORMS.OPTIONS,
  className,
  triggerClassName,
  size = "icon",
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <Button
        aria-controls={contentId}
        aria-expanded={open}
        aria-label={label}
        className={triggerClassName}
        onClick={() => setOpen((current) => !current)}
        size={size}
        type="button"
        variant="outline"
      >
        <MoreHorizontal className="h-4 w-4" />
        {size === "sm" ? <span>{label}</span> : <span className="sr-only">{label}</span>}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 min-w-64 overflow-hidden rounded-[calc(var(--radius-control)+0.05rem)] border bg-popover p-1 shadow-[var(--shadow-soft)]",
            align === "right" ? "right-0" : "left-0",
          )}
          id={contentId}
          role="menu"
        >
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const toneClass = item.tone === "danger"
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-muted/70 hover:text-foreground";

              if (item.href) {
                return (
                  <Link
                    className={cn(
                      "flex items-start gap-3 rounded-[calc(var(--radius-control)+0.05rem)] px-3 py-2.5",
                      toneClass,
                    )}
                    href={item.href}
                    key={item.label}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect?.();
                    }}
                    role="menuitem"
                  >
                    {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight">
                        {item.label}
                      </p>
                      {item.description ? (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              }

              return (
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[calc(var(--radius-control)+0.05rem)] px-3 py-2.5 text-left",
                    toneClass,
                  )}
                  key={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">
                      {item.label}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
