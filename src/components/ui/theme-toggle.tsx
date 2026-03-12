"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const cycleOrder = ["light", "dark", "system"] as const;

function subscribe() {
  return () => {};
}

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);
  const currentTheme = isMounted ? theme ?? "system" : "system";
  const safeResolvedTheme = isMounted ? resolvedTheme : "light";
  const currentIndex = cycleOrder.indexOf(
    cycleOrder.find((mode) => mode === currentTheme) ?? "system",
  );
  const nextTheme = cycleOrder[(currentIndex + 1) % cycleOrder.length];

  return (
    <Button
      aria-label={`Switch theme. Current theme is ${currentTheme}.`}
      onClick={() => setTheme(nextTheme)}
      size={compact ? "icon" : "sm"}
      type="button"
      variant="outline"
    >
      {currentTheme === "system"
        ? <LaptopMinimal className="h-4 w-4" />
        : safeResolvedTheme === "dark"
        ? <Moon className="h-4 w-4" />
        : <Sun className="h-4 w-4" />}
      {!compact
        ? (
          <span className="hidden lg:inline">
            {currentTheme === "system"
              ? "System"
              : safeResolvedTheme === "dark"
              ? "Dark"
              : "Light"}
          </span>
        )
        : null}
    </Button>
  );
}
