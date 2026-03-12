import { env } from "@/env";
import { logInfo } from "@/lib/observability/logger";

export async function register() {
  logInfo("observability.registered", {
    nodeEnv: env.NODE_ENV,
    sentryConfigured: Boolean(env.SENTRY_DSN),
    otelConfigured: Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT),
  });
}
