import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";
import { APP_TEXT } from "@/constants/appText";
import { env } from "@/env";
import { getMetadataBase } from "@/lib/seo/metadata";
import "./globals.css";

const appSans = Manrope({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

const appMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-app-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: APP_TEXT.BRAND_NAME,
  title: {
    default: APP_TEXT.BRAND_NAME,
    template: `%s | ${APP_TEXT.BRAND_NAME}`,
  },
  manifest: "/manifest.webmanifest",
  description: APP_TEXT.APP_DESCRIPTION,
  keywords: [
    "hospital management system",
    "OPD billing software",
    "IPD billing software",
    "hospital occupancy dashboard",
    "appointment scheduling",
    "healthcare operations software",
  ],
  openGraph: {
    title: APP_TEXT.BRAND_NAME,
    description: APP_TEXT.APP_DESCRIPTION,
    type: "website",
    locale: "en_IN",
    siteName: APP_TEXT.BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TEXT.BRAND_NAME,
    description: APP_TEXT.APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${appSans.variable} ${appMono.variable} text-foreground antialiased`}>
        {env.ENABLE_FIGMA_CAPTURE
          ? (
            <Script
              src="https://mcp.figma.com/mcp/html-to-design/capture.js"
              strategy="afterInteractive"
            />
          )
          : null}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
