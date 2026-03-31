import "server-only";
import { redis } from "@/lib/redis";

/** First caller wins; prevents duplicate confirmation emails from webhook + confirm. */
export async function claimBookingConfirmationSend(
  paymentIntentId: string
): Promise<boolean> {
  try {
    const ok = await redis.set(
      `booking:email:${paymentIntentId}`,
      "1",
      "EX",
      86400,
      "NX"
    );
    return ok === "OK";
  } catch {
    return true;
  }
}
