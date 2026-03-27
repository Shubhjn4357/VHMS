import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/features",
          "/solutions",
          "/about",
          "/contact",
          "/blog",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/login",
          "/access-denied",
          "/offline",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
