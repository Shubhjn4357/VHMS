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
>(({ children, className, side = "right", showClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "z-50 flex flex-col gap-5 overflow-y-auto p-6 duration-200",
        sheetVariants[side],
        className,
      )}
      ref={ref}
      {...props}
    >
      {showClose ? (
        <SheetClose className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
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
