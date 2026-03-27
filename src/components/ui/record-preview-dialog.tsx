import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

type RecordPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: string;
  status?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

type RecordPreviewSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function RecordPreviewDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  status,
  actions,
  footer,
  children,
  className,
}: RecordPreviewDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={cn("max-w-4xl overflow-hidden p-0", className)}>
        <div className="border-b border-border/70 bg-muted/25 px-5 py-5 lg:px-6">
          <DialogHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
              {status}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <DialogTitle>{title}</DialogTitle>
                {description ? (
                  <DialogDescription className="mt-2 max-w-2xl">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              {actions ? (
                <div className="flex flex-wrap gap-3">{actions}</div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 lg:px-6">
          <div className="space-y-4">{children}</div>
        </div>

        <DialogFooter className="bg-muted/10 px-5 pb-5 lg:px-6">
          {footer ?? (
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecordPreviewSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: RecordPreviewSectionProps) {
  return (
    <section className={cn("management-record-shell p-4", className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)+0.05rem)] bg-primary/12 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold text-foreground">{title}</h4>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function RecordPreviewField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("management-metric px-3.5 py-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}
