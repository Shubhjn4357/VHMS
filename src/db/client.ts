import { promises as dnsPromises, setDefaultResultOrder } from "node:dns";
import net from "node:net";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/env";
import * as schema from "@/db/schema";

setDefaultResultOrder("ipv4first");

const PUBLIC_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];
const publicDnsResolver = new dnsPromises.Resolver();
publicDnsResolver.setServers(PUBLIC_DNS_SERVERS);

const tcpHostResolutionCache = new Map<string, Promise<string>>();

function parseDatabaseHost(connectionString: string) {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
}

function shouldUsePublicDnsFallback(hostname: string) {
  return hostname.endsWith(".neon.tech");
}

async function resolveTcpHost(hostname: string) {
  const cached = tcpHostResolutionCache.get(hostname);
  if (cached) {
    return cached;
  }

  const resolutionPromise = publicDnsResolver.resolve4(hostname).then(
    (addresses: string[]) => {
      const address = addresses[0];
      if (!address) {
        throw new Error(`No IPv4 address returned for ${hostname}`);
      }
      return address;
    },
  );

  tcpHostResolutionCache.set(hostname, resolutionPromise);
  return resolutionPromise;
}

function createDnsFallbackStreamFactory(databaseHost: string) {
  return () => {
    const socket = new net.Socket();
    const originalConnect = socket.connect.bind(socket);

    socket.connect = ((...args: unknown[]) => {
      const [portOrOptions, hostArg] = args;

      if (typeof portOrOptions !== "number" ||
        typeof hostArg !== "string" ||
        net.isIP(hostArg) !== 0 ||
        !shouldUsePublicDnsFallback(hostArg)) {
        return originalConnect(...args as Parameters<typeof originalConnect>);
      }

      void resolveTcpHost(hostArg).then((resolvedHost) => {
        originalConnect(portOrOptions, resolvedHost);
      }).catch((error) => {
        const wrappedError = error instanceof Error
          ? error
          : new Error(String(error));
        wrappedError.message =
          `Failed to resolve ${databaseHost} through public DNS: ${wrappedError.message}`;
        socket.emit("error", wrappedError);
      });

      return socket;
    }) as typeof socket.connect;

    return socket;
  };
}

function createDbBundle() {
  const normalizedDatabaseUrl = env.DATABASE_URL.replace(
    "sslmode=require",
    "sslmode=verify-full",
  );
  const databaseHost = parseDatabaseHost(normalizedDatabaseUrl);
  const shouldPatchDns = shouldUsePublicDnsFallback(databaseHost);
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const pool = new Pool({
    connectionString: normalizedDatabaseUrl,
    max: isBuildPhase ? 1 : env.NODE_ENV === "production" ? 5 : 3,
    ssl: normalizedDatabaseUrl.includes("sslmode=verify-full")
      ? {
        rejectUnauthorized: false,
        servername: databaseHost || undefined,
      }
      : undefined,
    stream: shouldPatchDns
      ? createDnsFallbackStreamFactory(databaseHost)
      : undefined,
  });
  const db = drizzle({ client: pool, schema });

  return { db, pool };
}

let cachedBundle: ReturnType<typeof createDbBundle> | undefined;

function getBundle() {
  if (!cachedBundle) {
    cachedBundle = createDbBundle();
  }

  return cachedBundle;
}

export function getDb() {
  return getBundle().db;
}

export function getDatabaseClient() {
  return getBundle().pool;
}
