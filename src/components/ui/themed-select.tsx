import type { SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type ThemedSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  containerClassName?: string;
};

export function ThemedSelect({
  children,
  className,
  containerClassName,
  ...props
}: ThemedSelectProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-[var(--radius-control)] border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-[var(--shadow-soft)] outline-none transition-colors focus:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
