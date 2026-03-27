import type { HTMLAttributes } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function SurfaceCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn(
        "relative p-4 lg:p-5",
        className,
      )}
      {...props}
    />
  );
}
