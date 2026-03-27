"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogClose;
const SheetHeader = DialogHeader;
const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

const sheetVariants = {
  right:
    "fixed inset-y-0 right-0 z-50 h-full w-[min(92vw,26rem)] border-l bg-background shadow-[var(--shadow-card)]",
  left:
    "fixed inset-y-0 left-0 z-50 h-full w-[min(92vw,26rem)] border-r bg-background shadow-[var(--shadow-card)]",
} as const;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: keyof typeof sheetVariants;
    showClose?: boolean;
  }
>(({ children, className, side = "right", showClose = true, style, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "z-50 flex flex-col gap-4 overflow-y-auto overscroll-contain p-5 lg:p-6",
        sheetVariants[side],
        className,
      )}
      ref={ref}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        ...style,
      }}
      {...props}
    >
      {showClose ? (
        <SheetClose className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius-control)+0.05rem)] text-muted-foreground hover:bg-muted/70 hover:text-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      ) : null}
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
SheetContent.displayName = "SheetContent";

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
