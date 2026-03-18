import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

type BulkActionToolbarProps = {
  count: number;
  itemLabel: string;
  onClear: () => void;
  children: React.ReactNode;
};

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}

export function BulkActionToolbar({
  count,
  itemLabel,
  onClear,
  children,
}: BulkActionToolbarProps) {
  if (count === 0) {
    return null;
  }

  return (
    <SurfaceCard className="rounded-xl border-dashed bg-muted/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bulk actions
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {count} selected {pluralize(itemLabel, count)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {children}
          <Button onClick={onClear} size="sm" type="button" variant="outline">
            <X className="h-4 w-4" />
            Clear selection
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}
