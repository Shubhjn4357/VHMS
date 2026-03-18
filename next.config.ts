import type { NextConfig } from "next";

function parseBooleanEnv(value?: string) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const isDevelopment = process.env.NODE_ENV !== "production";
const figmaCaptureEnabled = parseBooleanEnv(process.env.ENABLE_FIGMA_CAPTURE);

function buildContentSecurityPolicy() {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  const connectSrc = ["'self'", "https:"];
  const frameSrc = ["'self'"];

  if (isDevelopment) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }

  if (figmaCaptureEnabled) {
    scriptSrc.push("https://mcp.figma.com");
    connectSrc.push("https://mcp.figma.com");
    frameSrc.push("https://mcp.figma.com");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc.join(" ")}`,
    "font-src 'self' data: https:",
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    `frame-src ${frameSrc.join(" ")}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), browsing-topics=(), display-capture=()",
  },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders.map((header) => ({
          ...header,
          value: header.value.replace(/\s{2,}/g, " ").trim(),
        })),
      },
    ];
  },
};

export default nextConfig;
