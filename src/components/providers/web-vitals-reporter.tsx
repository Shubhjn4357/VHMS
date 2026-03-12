"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      pathname: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry/web-vitals", payload);
      return;
    }

    void fetch("/api/telemetry/web-vitals", {
      method: "POST",
      body: payload,
      headers: {
        "content-type": "application/json",
      },
      keepalive: true,
    });
  });

  return null;
}
