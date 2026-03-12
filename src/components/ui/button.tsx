import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-primary/10 bg-[linear-gradient(180deg,var(--primary)_0%,var(--brand-strong)_100%)] text-primary-foreground shadow-[var(--shadow-button)] hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "glass-panel-muted text-secondary-foreground hover:-translate-y-0.5 hover:border-primary/20 hover:text-foreground",
        outline:
          "glass-chip text-foreground hover:-translate-y-0.5 hover:border-primary/20 hover:text-primary",
        ghost:
          "border border-transparent bg-transparent text-foreground hover:bg-white/50 dark:hover:bg-white/6",
        destructive:
          "border border-destructive/10 bg-[linear-gradient(180deg,#ef4444_0%,#dc2626_100%)] text-destructive-foreground shadow-[0_16px_32px_rgba(220,38,38,0.2)] hover:-translate-y-0.5 hover:brightness-105",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-11 rounded-xl px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
