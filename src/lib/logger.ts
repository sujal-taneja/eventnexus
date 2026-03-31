import "server-only";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogMeta = Record<string, unknown>;

const REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
  "token",
  "password",
  "apikey",
  "apiKey",
  "clientSecret",
]);

function safeMeta(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((x) => safeMeta(x));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = safeMeta(v);
  }
  return out;
}

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  if (level === "debug" && process.env.NODE_ENV === "production") return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    meta: meta ? safeMeta(meta) : undefined,
  };

  // Vercel captures stdout/stderr; JSON logs make filtering easier.
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    emit("error", message, meta);
  },
  debug(message: string, meta?: LogMeta) {
    emit("debug", message, meta);
  },
};

