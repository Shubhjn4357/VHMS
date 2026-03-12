import type { Metadata } from "next";

import { env } from "@/env";

const siteName = "Vahi HMS Enterprise";
const defaultImagePath = "/icon.svg";

export function getMetadataBase() {
  return new URL(env.NEXTAUTH_URL);
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return new URL(path, getMetadataBase()).toString();
}

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  imagePath?: string;
  type?: "website" | "article";
};

export function buildPublicMetadata({
  title,
  description,
  path,
  keywords = [],
  imagePath = defaultImagePath,
  type = "website",
}: PublicMetadataInput): Metadata {
  const imageUrl = absoluteUrl(imagePath);
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      title,
      description,
      url,
      siteName,
      locale: "en_IN",
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

type DashboardMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function buildDashboardMetadata({
  title,
  description,
  path,
}: DashboardMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}
