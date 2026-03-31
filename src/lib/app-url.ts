import "server-only";

const PROD_FALLBACK = "https://eventnexus-suzie.vercel.app";

function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getAppUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (process.env.NODE_ENV === "production" ? PROD_FALLBACK : "http://localhost:3000");

  return normalize(raw);
}

