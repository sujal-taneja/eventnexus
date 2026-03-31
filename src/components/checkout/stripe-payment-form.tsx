"use client";

import { useState, useCallback } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ShieldCheck, Loader2, X, RefreshCw } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useRouter } from "next/navigation";

interface StripePaymentFormProps {
  total: number;
  clientSecret: string;
  /** Called with the PaymentIntent ID after Stripe confirms the payment */
  onSuccess: (paymentIntentId: string) => void;
  billingEmail?: string;
  /** Cart items needed to release seat locks on cancellation */
  cartItems: { ticketTypeId: string; eventId: string; quantity: number }[];
}

/** Extract pi_XXXXX from a Stripe client_secret (pi_XXXXX_secret_YYYYY) */
function extractIntentId(secret: string): string {
  return secret.split("_secret_")[0] ?? "";
}

function randomPayChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const mul = Math.random() > 0.55;
  if (mul) return { label: `${a} × ${b}`, answer: a * b };
  return { label: `${a} + ${b}`, answer: a + b };
}

export function StripePaymentForm({
  total,
  clientSecret,
  onSuccess,
  billingEmail,
  cartItems,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();
  const [payChallenge, setPayChallenge] = useState(randomPayChallenge);
  const [captchaPayInput, setCaptchaPayInput] = useState("");
  const refreshPayChallenge = useCallback(() => {
    setPayChallenge(randomPayChallenge());
    setCaptchaPayInput("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cap = parseInt(captchaPayInput, 10);
    if (!Number.isFinite(cap) || cap !== payChallenge.answer) {
      setErrorMessage("Solve the security question to continue.");
      refreshPayChallenge();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const trimmedBillingEmail = billingEmail?.trim();

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        receipt_email: trimmedBillingEmail || undefined,
        // When PaymentElement sets billingDetails.email to "never", Stripe expects
        // confirmParams.payment_method_data.billing_details.email to be present.
        payment_method_data: trimmedBillingEmail
          ? { billing_details: { email: trimmedBillingEmail } }
          : undefined,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(
        error.message ??
          "Payment failed. Your seat reservation is still active — you can retry."
      );
      setLoading(false);
    } else {
      onSuccess(extractIntentId(clientSecret));
    }
  };

  const handleReleaseAndExit = async () => {
    setReleasing(true);
    try {
      const byEvent: Record<string, string[]> = {};
      for (const item of cartItems) {
        if (!byEvent[item.eventId]) byEvent[item.eventId] = [];
        byEvent[item.eventId].push(item.ticketTypeId);
      }
      await Promise.allSettled(
        Object.entries(byEvent).map(([eventId, ticketIds]) =>
          fetch("/api/reserve", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId, tickets: ticketIds }),
          })
        )
      );
    } finally {
      clearCart();
      router.replace("/events");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: {
            applePay: "never",
            googlePay: "never",
            link: "never",
          },
          defaultValues: billingEmail
            ? { billingDetails: { email: billingEmail } }
            : undefined,
          fields: {
            billingDetails: {
              email: billingEmail ? "never" : "auto",
            },
          },
        }}
      />

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 space-y-2">
        <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wider">
          Security check
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.8125rem] text-[var(--text-secondary)]">
            What is {payChallenge.label}?
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={captchaPayInput}
            onChange={(e) => setCaptchaPayInput(e.target.value)}
            className="w-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:border-[var(--border-hover)]"
            aria-label="Payment captcha"
          />
          <button
            type="button"
            onClick={refreshPayChallenge}
            className="inline-flex items-center justify-center p-1 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
            title="New question"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-400/10 border border-red-400/20 px-4 py-3 space-y-2">
          <p className="text-[0.8125rem] text-red-400">{errorMessage}</p>
          <p className="text-[0.75rem] text-[var(--text-muted)]">
            Your seats are still reserved. Retry below, or{" "}
            <button
              type="button"
              onClick={handleReleaseAndExit}
              disabled={releasing}
              className="btn-secondary !py-1.5 !px-3 !text-[0.75rem] disabled:opacity-50"
            >
              {releasing ? "releasing…" : "release your reservation"}
            </button>{" "}
            to let others book.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading || releasing}
        className="w-full btn-primary py-3.5 flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Pay ₹{total.toLocaleString()}
          </>
        )}
      </button>

      {!errorMessage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleReleaseAndExit}
            disabled={releasing}
            className="btn-secondary inline-flex items-center gap-1.5 !py-2 !px-3 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            {releasing ? "Releasing seats…" : "Cancel and release my seats"}
          </button>
        </div>
      )}

      <p className="text-center text-[0.75rem] text-[var(--text-muted)]">
        Secured by{" "}
        <span className="text-[var(--text-secondary)]">Stripe</span>. Card
        details are never stored on our servers.
      </p>
    </form>
  );
}
