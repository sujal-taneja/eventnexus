"use client";

import { useCartStore } from "@/lib/store/cart";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Clock, Ticket } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Elements } from "@stripe/react-stripe-js";
import { Turnstile } from "@marsidev/react-turnstile";
import { useSession } from "next-auth/react";
import { stripePromise } from "@/lib/stripe";
import { StripePaymentForm } from "@/components/checkout/stripe-payment-form";

const ENX_CHECKOUT_SUCCESS = "enx_checkout_success";
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";

type StatusError = Error & { status?: number };

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const expiresAt = useCartStore((state) => state.expiresAt);
  const clearCart = useCartStore((state) => state.clearCart);
  const setExpiresAt = useCartStore((state) => state.setExpiresAt);
  const setIsCartOpen = useCartStore((state) => state.setIsOpen);
  const { status: sessionStatus } = useSession();

  const [timeLeft, setTimeLeft] = useState<string | null>("10:00");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [freeCheckout, setFreeCheckout] = useState(false);
  const skipEmptyCartToast = useRef(false);

  // Contact info state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const needsTurnstile = Boolean(TURNSTILE_SITE_KEY);
  const turnstileOk = !needsTurnstile || Boolean(turnstileToken);

  type UiTheme = "light" | "dark";
  const [uiTheme, setUiTheme] = useState<UiTheme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  });

  useEffect(() => {
    const read = () => {
      setUiTheme(
        document.documentElement.getAttribute("data-theme") === "light"
          ? "light"
          : "dark"
      );
    };
    read();
    window.addEventListener("theme-change", read);
    return () => window.removeEventListener("theme-change", read);
  }, []);

  // Redirect if cart is empty (skip toast after successful payment — cart clears on purpose)
  useEffect(() => {
    if (items.length === 0) {
      try {
        if (
          skipEmptyCartToast.current ||
          sessionStorage.getItem(ENX_CHECKOUT_SUCCESS) === "1"
        ) {
          skipEmptyCartToast.current = false;
          sessionStorage.removeItem(ENX_CHECKOUT_SUCCESS);
          return;
        }
      } catch {
        /* ignore */
      }
      toast.error("Your cart is empty.");
      router.replace("/events");
    }
  }, [items.length, router]);

  // Auth guard for checkout: if you aren't signed in, keep the cart but clear
  // any reservation timer/payment state, then redirect to sign-in.
  useEffect(() => {
    if (sessionStatus !== "unauthenticated") return;
    try {
      setExpiresAt(null);
    } catch {
      /* ignore */
    }
    setClientSecret(null);
    router.replace(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
  }, [sessionStatus, router, setExpiresAt]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        clearCart();
        toast.error("Your reservation expired.");
        router.replace("/events");
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, clearCart, router]);

  // Debounced PaymentIntent creation (cart + receipt email + Turnstile when enabled)
  useEffect(() => {
    if (!expiresAt) {
      setClientSecret(null);
      return;
    }
    if (items.length === 0 || !turnstileOk) {
      if (!turnstileOk) setClientSecret(null);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        setLoadingIntent(true);
        try {
          const res = await fetch("/api/stripe/payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items,
              billingEmail: email.trim() || undefined,
              turnstileToken: needsTurnstile ? turnstileToken : undefined,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast.error(
              typeof err.error === "string"
                ? err.error
                : "Could not initialise payment."
            );
            return;
          }
          const data = await res.json();
          if (data?.freeCheckout) {
            setFreeCheckout(true);
            try {
              sessionStorage.setItem(ENX_CHECKOUT_SUCCESS, "1");
            } catch {
              skipEmptyCartToast.current = true;
            }
            clearCart();
            toast.success("Comped booking confirmed. Your tickets are in the dashboard.");
            router.replace("/dashboard");
            return;
          }
          setClientSecret(data.clientSecret);
        } catch {
          toast.error("Network error. Please try again.");
        } finally {
          setLoadingIntent(false);
        }
      })();
    }, 480);
    return () => window.clearTimeout(id);
  }, [items, expiresAt, email, turnstileOk, turnstileToken, needsTurnstile]);

  const handleProceedToCheckout = async () => {
    if (sessionStatus !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (!items.length) return;
    if (!turnstileOk) {
      toast.error("Complete the security check to reserve seats.");
      return;
    }

    setIsReserving(true);
    setClientSecret(null);

    try {
      // Single reserve request: Turnstile tokens are single-use and should
      // be consumed by exactly one verification request.
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickets: items.map((item) => ({
            id: item.ticketTypeId,
            quantity: item.quantity,
          })),
          turnstileToken: needsTurnstile ? turnstileToken : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || "Failed to reserve tickets") as StatusError;
        e.status = res.status;
        throw e;
      }

      const nextExpiresAt = Date.now() + 10 * 60 * 1000;
      setExpiresAt(nextExpiresAt);
      setTimeLeft("10:00");
      toast.success("Tickets successfully reserved!");
    } catch (e: unknown) {
      const status = e instanceof Error ? (e as StatusError).status : undefined;
      if (status === 401) {
        setExpiresAt(null);
        setTimeLeft(null);
        router.replace(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
        return;
      }
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to lock seats. Some may be unavailable.";
      toast.error(msg);
    } finally {
      setIsReserving(false);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.toUpperCase() === "NEXUS10") {
      setDiscount(getCartTotal() * 0.1);
      toast.success("10% discount applied!");
    } else {
      setDiscount(0);
      toast.error("Invalid promo code.");
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const fallbackTheme =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "light"
          : "dark";
      await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          billingEmail: email.trim() || undefined,
          items: items.map((i) => ({
            ticketTypeId: i.ticketTypeId,
            eventId: i.eventId,
            quantity: i.quantity,
            price: i.price,
          })),
          emailTheme: "auto",
          emailFallbackTheme: fallbackTheme,
        }),
      });
    } catch {
      // Webhook will handle booking creation as backup
    }
    try {
      sessionStorage.setItem(ENX_CHECKOUT_SUCCESS, "1");
    } catch {
      skipEmptyCartToast.current = true;
    }
    clearCart();
    toast.success("Payment confirmed! Your tickets are in the dashboard.");
    router.replace("/dashboard");
  };

  if (items.length === 0) return null;

  const subtotal = getCartTotal();
  const total = Math.max(0, subtotal - discount);

  const stripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: (uiTheme === "light" ? "flat" : "night") as
            | "flat"
            | "night",
          variables:
            uiTheme === "light"
              ? {
                  colorPrimary: "#0b0b10",
                  colorBackground: "#ffffff",
                  colorText: "#0b0b10",
                  colorTextSecondary: "#52525b",
                  colorDanger: "#e5484d",
                  borderRadius: "8px",
                  fontFamily:
                    '"__nextjs-Geist", "Geist", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSizeBase: "15px",
                  spacingUnit: "3px",
                }
              : {
                  colorPrimary: "#ffffff",
                  colorBackground: "#0a0a0a",
                  colorText: "#f5f5f5",
                  colorTextSecondary: "#a0a0a0",
                  colorDanger: "#e5484d",
                  borderRadius: "8px",
                  fontFamily:
                    '"__nextjs-Geist", "Geist", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSizeBase: "15px",
                  spacingUnit: "3px",
                },
          rules:
            uiTheme === "light"
              ? {
                  ".Label": {
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#52525b",
                  },
                  ".Input": {
                    fontSize: "14px",
                    color: "#0b0b10",
                    borderColor: "rgba(0,0,0,0.08)",
                    boxShadow: "none",
                  },
                  ".Tab": {
                    color: "#52525b",
                  },
                  ".Tab--selected": {
                    color: "#0b0b10",
                  },
                  ".Text": {
                    color: "#52525b",
                  },
                  ".Block": {
                    borderColor: "rgba(0,0,0,0.08)",
                  },
                }
              : {
                  ".Label": {
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#a0a0a0",
                  },
                  ".Input": {
                    fontSize: "14px",
                    color: "#f5f5f5",
                    borderColor: "rgba(255,255,255,0.08)",
                    boxShadow: "none",
                  },
                  ".Tab": {
                    color: "#a0a0a0",
                  },
                  ".Tab--selected": {
                    color: "#f5f5f5",
                  },
                  ".Text": {
                    color: "#a0a0a0",
                  },
                  ".Block": {
                    borderColor: "rgba(255,255,255,0.08)",
                  },
                },
        },
      }
    : undefined;

  return (
    <div className="min-h-screen pt-20 pb-24 bg-[var(--bg-primary)]">
      <div className="container-main max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-[0.875rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to events
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Checkout</h1>
            {expiresAt ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[0.875rem] font-medium">
                <Clock className="w-4 h-4" />
                Reservation expires in {timeLeft}
              </div>
            ) : (
              <button
                type="button"
                disabled={isReserving || !turnstileOk}
                onClick={() => void handleProceedToCheckout()}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isReserving ? "Reserving seats…" : "Proceed to Checkout"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* ── Left: contact + payment ────────────────────────────── */}
          <div className="flex-1 space-y-6 order-2 lg:order-1">
            {/* Contact info */}
            <div className="glass rounded-xl p-6 border border-[var(--border-subtle)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-5">
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.8125rem] text-[var(--text-secondary)]">First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.875rem] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.8125rem] text-[var(--text-secondary)]">Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.875rem] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.8125rem] text-[var(--text-secondary)]">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.875rem] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
                    placeholder="jane@example.com"
                  />
                  <p className="text-[0.75rem] text-[var(--text-tertiary)]">
                    We&apos;ll email your tickets here and to your account address when
                    they differ.
                  </p>
                </div>
              </div>
            </div>

            {/* Stripe payment */}
            <div className="glass rounded-xl p-6 border border-[var(--border-subtle)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-5">Payment</h2>
              {needsTurnstile && (
                <div className="mb-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 flex flex-col items-center gap-2">
                  <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wider self-start">
                    Security verification
                  </p>
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                  />
                </div>
              )}
              {loadingIntent && (
                <div className="text-center py-8 text-[var(--text-muted)] text-[0.875rem]">
                  {turnstileOk
                    ? "Initialising secure payment…"
                    : "Complete the verification above to continue."}
                </div>
              )}
              {!loadingIntent && clientSecret && stripeElementsOptions && (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <StripePaymentForm
                    total={total}
                    clientSecret={clientSecret}
                    billingEmail={email}
                    onSuccess={handlePaymentSuccess}
                    cartItems={items.map((i) => ({
                      ticketTypeId: i.ticketTypeId,
                      eventId: i.eventId,
                      quantity: i.quantity,
                    }))}
                  />
                </Elements>
              )}
              {!loadingIntent && !clientSecret && (
                <div className="text-center py-6">
                  <p className="text-[0.875rem] text-[var(--text-muted)] mb-3">
                    Unable to load payment form.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn-secondary text-[0.8125rem]"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: order summary ────────────────────────────────── */}
          <div className="w-full lg:w-[400px] order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl border border-[var(--border-subtle)] sticky top-24 overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h2 className="font-medium text-[var(--text-primary)]">Order Summary</h2>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="btn-secondary !py-2 !px-3 !text-[0.8125rem] !border-[var(--border-default)]"
                >
                  Edit
                </button>
              </div>

              <div className="p-6 space-y-4">
                {items.map((item) => (
                  <div key={item.ticketTypeId} className="flex justify-between gap-3">
                    <div className="flex gap-3">
                      <Ticket className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[0.875rem] font-medium text-[var(--text-primary)] leading-tight mb-0.5">
                          {item.eventTitle}
                        </p>
                        <p className="text-[0.8125rem] text-[var(--text-secondary)]">
                          {item.ticketName}{" "}
                          <span className="text-[var(--text-tertiary)]">× {item.quantity}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[0.875rem] font-medium text-[var(--text-primary)] shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                <form onSubmit={handleApplyPromo} className="flex gap-2 mb-5">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Promo code (NEXUS10)"
                    className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.8125rem] focus:outline-none focus:border-[var(--border-hover)] transition-colors uppercase tracking-wide"
                  />
                  <button type="submit" className="btn-secondary text-[0.8125rem] py-2 px-3">
                    Apply
                  </button>
                </form>

                <div className="space-y-2.5 text-[0.875rem]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount (NEXUS10)</span>
                      <span>−₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Platform fee</span>
                    <span className="text-[var(--text-muted)]">Included</span>
                  </div>
                  <div className="pt-3 mt-1 border-t border-[var(--border-subtle)] flex justify-between items-baseline text-[var(--text-primary)]">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-semibold tracking-tight">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
