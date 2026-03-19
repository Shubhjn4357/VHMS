"use client";

import { CloudOff, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type OfflineDraftPanelProps = {
  description: string;
  isOnline: boolean;
  onDiscard: () => void;
  onRestore: () => void;
  title: string;
  updatedAt: string;
};

function formatDraftUpdatedAt(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OfflineDraftPanel({
  description,
  isOnline,
  onDiscard,
  onRestore,
  title,
  updatedAt,
}: OfflineDraftPanelProps) {
  return (
    <div className="management-subtle-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            <CloudOff className="h-4 w-4" />
            Saved local draft
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Updated {formatDraftUpdatedAt(updatedAt)} / {isOnline ? "ready to restore" : "stays on this device until reconnect"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onRestore}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
            Restore draft
          </Button>
          <Button
            className="hover:border-destructive hover:text-destructive"
            onClick={onDiscard}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            Discard draft
          </Button>
        </div>
      </div>
    </div>
  );
}
