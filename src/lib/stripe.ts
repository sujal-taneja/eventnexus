/**
 * Client-safe Stripe utilities.
 * Only imports from @stripe/stripe-js (browser bundle) — never the
 * server-side `stripe` SDK.  Import this file from client components.
 */
import { loadStripe } from "@stripe/stripe-js";

// Singleton so the same promise is reused across re-renders
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
