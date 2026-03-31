import "server-only";
import { logger } from "@/lib/logger";

/**
 * Verifies a Cloudflare Turnstile token when CLOUDFLARE_TURNSTILE_SECRET_KEY is set.
 * Returns true when Turnstile is not configured (dev / optional mode).
 */
export async function verifyTurnstileToken(
  token: string | undefined
): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.debug("turnstile.skipped_secret_not_configured");
    return true;
  }
  if (!token || typeof token !== "string") {
    logger.warn("turnstile.missing_or_invalid_token", { hasToken: Boolean(token) });
    return false;
  }

  try {
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );

    const data = (await verifyRes.json()) as {
      success?: boolean;
      "error-codes"?: string[];
      action?: string;
      hostname?: string;
      challenge_ts?: string;
    };

    if (!data.success) {
      logger.warn("turnstile.verify_failed", {
        status: verifyRes.status,
        errorCodes: data["error-codes"] ?? [],
        action: data.action,
        hostname: data.hostname,
      });
      return false;
    }

    logger.debug("turnstile.verify_ok", {
      hostname: data.hostname,
      action: data.action,
      challengeTs: data.challenge_ts,
    });
    return true;
  } catch (error) {
    logger.error("turnstile.verify_request_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
