import type { Metadata } from "next";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";
import { getMetadataBase } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "Vahi HMS Enterprise",
  title: {
    default: "Vahi HMS Enterprise",
    template: "%s | Vahi HMS Enterprise",
  },
  manifest: "/manifest.webmanifest",
  description:
    "Hospital operations platform for invite-only staff access, OPD/IPD billing, occupancy, communication automation, analytics, exports, and print-safe workflows.",
  keywords: [
    "hospital management system",
    "OPD billing software",
    "IPD billing software",
    "hospital occupancy dashboard",
    "appointment scheduling",
    "healthcare operations software",
  ],
  openGraph: {
    title: "Vahi HMS Enterprise",
    description:
      "Production-grade hospital operations platform for scheduling, billing, occupancy, consents, discharge, analytics, and staff access control.",
    type: "website",
    locale: "en_IN",
    siteName: "Vahi HMS Enterprise",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vahi HMS Enterprise",
    description:
      "Production-grade hospital operations platform for scheduling, billing, occupancy, consents, discharge, analytics, and staff access control.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
