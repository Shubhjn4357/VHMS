import type { Metadata } from "next";

import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Offline",
  description:
    "Offline fallback page for Vahi HMS Enterprise showing local draft persistence and queued action behavior.",
  path: "/offline",
});

export default function OfflineFallbackPage() {
  return (
    <main className="min-h-screen px-6 py-16 text-ink">
      <div className="glass-panel-strong mx-auto max-w-3xl rounded-[40px] p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          Offline fallback
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Connection lost. Local drafts and queued actions stay on this device.
        </h1>
        <p className="mt-6 text-base leading-8 text-ink-soft">
          VHMS keeps unsent patient registrations, appointment schedules, and
          draft bills in the browser until the connection returns. Reopen the
          dashboard when online to continue syncing.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Drafts", "Forms keep local progress instead of losing it."],
            ["Queue", "Offline submissions wait for a safe reconnect."],
            ["PWA", "Install the app for a faster operational shell."],
          ].map(([title, description]) => (
            <div
              className="glass-panel-muted rounded-[24px] p-5"
              key={String(title)}
            >
              <p className="text-lg font-semibold">{title}</p>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
