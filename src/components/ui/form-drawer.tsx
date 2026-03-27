"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/bottom-drawer";
import { APP_TEXT } from "@/constants/appText";
import { APP_THEME } from "@/constants/appTheme";
import { cn } from "@/lib/utils/cn";

type FormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  mode?: "create" | "edit";
  statusLabel?: string;
  statusVariant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description = APP_TEXT.FORMS.FORM_DESCRIPTION,
  mode = "create",
  statusLabel,
  statusVariant = "outline",
  footer,
  children,
  className,
  contentClassName,
}: FormDrawerProps) {
  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent
        className={className}
        style={{ ["--drawer-max-width" as string]: `${APP_THEME.layout.drawerMaxWidth}px` }}
      >
        <div className="mx-auto flex w-full max-w-[var(--drawer-max-width)] flex-col gap-4 py-1">
          <div className="management-record-shell px-4 py-4 md:px-5">
            <DrawerHeader className="gap-3 border-b-0 px-0 py-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit" variant={mode === "create" ? "default" : "secondary"}>
                  {mode === "create" ? APP_TEXT.FORMS.CREATE_RECORD : APP_TEXT.FORMS.EDIT_RECORD}
                </Badge>
                {statusLabel ? (
                  <Badge className="w-fit" variant={statusVariant}>
                    {statusLabel}
                  </Badge>
                ) : null}
              </div>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
          </div>

          <div
            className={cn(
              "grid gap-4",
              footer ? "pb-2" : "pb-6",
              contentClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="management-record-shell px-4 py-3 md:px-5">
              <DrawerFooter className="border-t-0 px-0 py-0">{footer}</DrawerFooter>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function FormDrawerSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("management-record-shell p-4", className)}>
      <div className="border-b border-border/70 pb-3">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3.5">{children}</div>
    </section>
  );
}
