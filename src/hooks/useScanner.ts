"use client";

import { useEffect } from "react";

export function useScanner({
  enabled,
  onScan,
  minLength = 6,
}: {
  enabled: boolean;
  onScan: (value: string) => void;
  minLength?: number;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let buffer = "";
    let lastTimestamp = 0;

    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;

      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if (event.key === "Enter") {
        if (buffer.length >= minLength) {
          onScan(buffer);
        }

        buffer = "";
        lastTimestamp = 0;
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const now = Date.now();
      const delta = now - lastTimestamp;
      lastTimestamp = now;

      if (delta > 60) {
        buffer = event.key;
        return;
      }

      buffer += event.key;
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, minLength, onScan]);
}
