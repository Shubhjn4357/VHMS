type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  event: string;
  timestamp: string;
  message?: string;
  meta?: Record<string, unknown>;
};

function writeLog(level: LogLevel, payload: Omit<LogPayload, "level" | "timestamp">) {
  const entry: LogPayload = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logInfo(event: string, meta?: Record<string, unknown>) {
  writeLog("info", { event, meta });
}

export function logWarn(event: string, meta?: Record<string, unknown>) {
  writeLog("warn", { event, meta });
}

export function logError(
  event: string,
  error: unknown,
  meta?: Record<string, unknown>,
) {
  const normalized = error instanceof Error
    ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
    : {
      message: String(error),
    };

  writeLog("error", {
    event,
    message: normalized.message,
    meta: {
      ...meta,
      error: normalized,
    },
  });
}
