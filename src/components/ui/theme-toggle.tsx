"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { THEME_MODE_ORDER } from "@/constants/appTheme";

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
  const currentIndex = THEME_MODE_ORDER.indexOf(
    THEME_MODE_ORDER.find((mode) => mode === currentTheme) ?? "system",
  );
  const nextTheme = THEME_MODE_ORDER[(currentIndex + 1) % THEME_MODE_ORDER.length];

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
