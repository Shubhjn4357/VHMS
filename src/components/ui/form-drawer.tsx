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
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description = APP_TEXT.FORMS.FORM_DESCRIPTION,
  mode = "create",
  footer,
  children,
  className,
}: FormDrawerProps) {
  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent
        className={className}
        style={{ ["--drawer-max-width" as string]: `${APP_THEME.layout.drawerMaxWidth}px` }}
      >
        <div className="mx-auto flex w-full max-w-[var(--drawer-max-width)] flex-col gap-6">
          <DrawerHeader className="px-0">
            <Badge className="w-fit" variant={mode === "create" ? "default" : "secondary"}>
              {mode === "create" ? APP_TEXT.FORMS.CREATE_RECORD : APP_TEXT.FORMS.EDIT_RECORD}
            </Badge>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className={cn("grid gap-5", footer ? "pb-2" : "pb-4")}>
            {children}
          </div>

          {footer ? <DrawerFooter className="px-0">{footer}</DrawerFooter> : null}
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
    <section className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="border-b border-border/70 pb-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
