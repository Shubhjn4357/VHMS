import axios from "axios";

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return Math.abs(hash).toString(36);
}

function buildIdempotencyKey(config: { method?: string; url?: string; data?: unknown }) {
  const payload =
    typeof config.data === "string" ? config.data : JSON.stringify(config.data ?? null);
  return hashString(`${config.method ?? "post"}:${config.url ?? ""}:${payload}`);
}

export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();

  if (["post", "put", "patch", "delete"].includes(method) &&
    !config.headers["X-Idempotency-Key"]) {
    config.headers["X-Idempotency-Key"] = buildIdempotencyKey(config);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ??
      error.message ??
      "Unexpected API error";

    return Promise.reject(new Error(message));
  },
);
