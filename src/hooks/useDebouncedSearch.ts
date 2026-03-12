"use client";

import { useEffect, useState } from "react";

export function useDebouncedSearch(value: string, delayMs = 300) {
  const normalizedValue = value.trim();
  const [debouncedValue, setDebouncedValue] = useState(normalizedValue);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(normalizedValue);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, normalizedValue]);

  return debouncedValue;
}
