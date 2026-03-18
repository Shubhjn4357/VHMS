"use client";

import type { LucideIcon } from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_TEXT } from "@/constants/appText";
import { cn } from "@/lib/utils/cn";

export type OptionsMenuItem = {
  label: string;
  description?: string;
  href?: string;
  onSelect?: () => void;
  icon?: LucideIcon;
  tone?: "default" | "danger";
};

type OptionsMenuProps = {
  items: OptionsMenuItem[];
  align?: "left" | "right";
  label?: string;
  className?: string;
  triggerClassName?: string;
  size?: "icon" | "sm";
};

export function OptionsMenu({
  items,
  align = "right",
  label = APP_TEXT.FORMS.OPTIONS,
  className,
  triggerClassName,
  size = "icon",
}: OptionsMenuProps) {
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

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "absolute top-[calc(100%+0.5rem)] z-50 min-w-64 overflow-hidden rounded-lg border bg-popover p-1 shadow-[var(--shadow-card)]",
              align === "right" ? "right-0" : "left-0",
            )}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            id={contentId}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            role="menu"
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const toneClass = item.tone === "danger"
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground";

                if (item.href) {
                  return (
                    <Link
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
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
                        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
