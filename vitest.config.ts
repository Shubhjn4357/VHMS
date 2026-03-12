import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: {
      APP_NAME: "VHMS Enterprise Test",
      DATABASE_URL: "postgresql://user:password@host/database",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      HOSPITAL_NAME: "Vahi Hospital",
      NEXTAUTH_SECRET: "test-only-secret-change-before-production",
      NEXTAUTH_URL: "http://localhost:3000",
      NODE_ENV: "test",
    },
  },
});
