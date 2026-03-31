import type { NextRequest } from "next/server";

/** First client IP from proxy headers (Vercel / nginx). */
export function getClientIpFromRequest(req: NextRequest | Request): string {
  const h = req.headers.get("x-forwarded-for");
  if (h) return h.split(",")[0]?.trim() || "anonymous";
  return req.headers.get("x-real-ip")?.trim() ?? "anonymous";
}
