/**
 * Server-only Stripe client.
 * This file must NEVER be imported from client components.
 * The `server-only` import enforces this at build time — if a client
 * component accidentally imports this module, Next.js will throw a
 * build error rather than exposing STRIPE_SECRET_KEY to the browser.
 */
import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to your .env file.\n" +
      "Get it from https://dashboard.stripe.com/apikeys"
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
});
