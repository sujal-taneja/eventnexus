"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import Link from "next/link";
import { CheckCircle2, XCircle, Ticket, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Status = "loading" | "success" | "already_confirmed" | "failed";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);
  const items = useCartStore((state) => state.items);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status !== "success" && status !== "already_confirmed") return;
    toast.success(
      "Payment confirmed! Your tickets are in the dashboard."
    );
    const t = window.setTimeout(() => router.replace("/dashboard"), 800);
    return () => window.clearTimeout(t);
  }, [status, router]);

  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntentId = searchParams.get("payment_intent");

    // Case 1: no Stripe redirect params → payment was confirmed without redirect
    // (handlePaymentSuccess in checkout/page.tsx already called /api/bookings/confirm)
    if (!paymentIntentId) {
      clearCart();
      setStatus("success");
      return;
    }

    // Case 2: Stripe redirected back (3DS, UPI, etc.)
    if (redirectStatus === "failed" || redirectStatus === "requires_payment_method") {
      setStatus("failed");
      setErrorMsg("Your payment could not be processed. Please try again.");
      return;
    }

    if (redirectStatus !== "succeeded") {
      setStatus("failed");
      setErrorMsg(`Unexpected payment status: ${redirectStatus ?? "unknown"}`);
      return;
    }

    // Confirm booking via API (idempotent — safe to call even if webhook already ran)
    const confirmBooking = async () => {
      try {
        const fallbackTheme =
          document.documentElement.getAttribute("data-theme") ===
          "light"
            ? "light"
            : "dark";
        const res = await fetch("/api/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
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

        if (res.ok) {
          const data = await res.json();
          clearCart();
          setStatus(data.alreadyConfirmed ? "already_confirmed" : "success");
        } else if (res.status === 402) {
          setStatus("failed");
          setErrorMsg("Payment verification failed. Contact support if money was charged.");
        } else {
          // Even if confirm fails, webhook will handle it — show success
          clearCart();
          setStatus("success");
        }
      } catch {
        // Network error — webhook is the backup; show success to user
        clearCart();
        setStatus("success");
      }
    };

    void confirmBooking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md px-5 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Payment failed
          </h1>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed mb-8">
            {errorMsg}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className="btn-primary justify-center">
              Try again
            </Link>
            <Link href="/events" className="btn-secondary justify-center">
              Browse events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center pt-14 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-5 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
          {status === "already_confirmed" ? "Already confirmed!" : "Payment confirmed!"}
        </h1>
        <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed mb-8">
          {status === "already_confirmed"
            ? "Your booking was already registered. Check your dashboard to view your tickets."
            : "Your tickets have been booked. Check your dashboard to view your confirmed tickets."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary justify-center">
            <Ticket className="w-3.5 h-3.5" />
            View my tickets
          </Link>
          <Link href="/events" className="btn-secondary justify-center">
            Browse more events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
