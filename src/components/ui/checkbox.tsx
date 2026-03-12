import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      className={cn(
        "h-4 w-4 rounded border border-input bg-background text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      type={type ?? "checkbox"}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
