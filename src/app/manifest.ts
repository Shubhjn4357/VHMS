import type { MetadataRoute } from "next";

import { APP_MANIFEST_COLORS } from "@/constants/appBrand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VHMS Enterprise",
    short_name: "VHMS",
    description:
      "Invite-only hospital operations platform with billing, occupancy, print, analytics, and offline-ready drafts.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: APP_MANIFEST_COLORS.background,
    theme_color: APP_MANIFEST_COLORS.theme,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
