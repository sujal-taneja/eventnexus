"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";
import { motion } from "framer-motion";
import { X, ShoppingCart, Trash2, Clock, ArrowRight, Plus, Minus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Turnstile } from "@marsidev/react-turnstile";

type StatusError = Error & { status?: number };
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const { status: sessionStatus } = useSession();
  
  const storeIsOpen = useCartStore((state) => state.isOpen);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const storeItems = useCartStore((state) => state.items);
  const storeExpiresAt = useCartStore((state) => state.expiresAt);
  const setExpiresAt = useCartStore((state) => state.setExpiresAt);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = mounted ? storeIsOpen : false;
  const items = mounted ? storeItems : [];
  const expiresAt = mounted ? storeExpiresAt : null;
  const needsTurnstile = Boolean(TURNSTILE_SITE_KEY);
  const turnstileOk = !needsTurnstile || Boolean(turnstileToken);

  // Timer logic
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = expiresAt - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft("Expired");
        clearCart();
        // In a real app we would ping an API here to explicitly release locks Early
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, clearCart]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    // Auth gate: never reserve seats / start timer for unauthenticated users.
    if (sessionStatus !== "authenticated") {
      if (sessionStatus === "loading") {
        toast.error("Please wait…");
        return;
      }

      setExpiresAt(null);
      setTimeLeft(null);
      setIsOpen(false);
      router.push(
        `/login?callbackUrl=${encodeURIComponent("/checkout")}`
      );
      return;
    }

    // If timer is already running and not expired, just proceed
    if (expiresAt && timeLeft && timeLeft !== "Expired") {
      setIsOpen(false);
      router.push("/checkout");
      return;
    }

    setIsLocking(true);

    try {
      if (!turnstileOk) {
        toast.error("Complete the security verification first.");
        return;
      }

      // Single reserve request: Turnstile tokens are single-use.
      // Sending one token across multiple parallel reserve calls causes failures.
      const reservePayload = {
        tickets: items.map((item) => ({
          id: item.ticketTypeId,
          quantity: item.quantity,
        })),
        turnstileToken: needsTurnstile ? turnstileToken : undefined,
      };

      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservePayload),
      });
      if (!res.ok) {
        const err = await res.json();
        const e = new Error(err.error || "Failed to reserve tickets") as StatusError;
        e.status = res.status;
        throw e;
      }

      // Set expiry globally! Starts the 10-minute countdown!
      setExpiresAt(Date.now() + 10 * 60 * 1000);
      
      toast.success("Tickets successfully reserved!");
      setIsOpen(false);
      router.push("/checkout");

    } catch (e: unknown) {
      const status = e instanceof Error ? (e as StatusError).status : undefined;
      if (status === 401) {
        setExpiresAt(null);
        setTimeLeft(null);
        setIsOpen(false);
        router.push(
          `/login?callbackUrl=${encodeURIComponent("/checkout")}`
        );
        return;
      }
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to lock seats. Some may be unavailable.";
      toast.error(msg);
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-subtle)] z-[101] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Your Cart</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--bg-card-hover)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="w-12 h-12 text-[var(--border-strong)] mb-4" />
            <h3 className="text-[var(--text-primary)] font-medium mb-2">Your cart is empty</h3>
            <p className="text-[var(--text-tertiary)] text-[0.875rem] mb-6">
              Looks like you haven&apos;t added any tickets yet.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-secondary"
            >
              Continue Browsing
            </button>
          </div>
        ) : (
          <>
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400 text-[0.8125rem] font-medium">
                <Clock className="w-4 h-4" />
                <span>Seats reserved for:</span>
              </div>
              <span className="text-orange-400 font-mono font-medium tracking-wide">
                {timeLeft || "10:00"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.map((item) => (
                <div key={item.ticketTypeId} className="flex gap-4">
                  <div className="flex-1">
                    <h4 className="text-[0.9375rem] font-medium text-[var(--text-primary)] leading-tight">
                      {item.eventTitle}
                    </h4>
                    <p className="text-[0.8125rem] text-[var(--text-secondary)] mt-1">
                      {item.ticketName}
                    </p>
                    <div className="text-[0.875rem] font-medium text-[var(--text-primary)] mt-3">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.ticketTypeId)}
                      className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] rounded-md p-1 border border-[var(--border-subtle)] mt-2">
                      <button
                        onClick={() => updateQuantity(item.ticketTypeId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[0.8125rem] font-medium w-4 text-center select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.ticketTypeId, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[var(--text-secondary)]">Total</span>
                <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  ₹{getCartTotal()}
                </span>
              </div>
              {needsTurnstile && (
                <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                  <p className="mb-2 text-[0.75rem] uppercase tracking-wider text-[var(--text-muted)]">
                    Security verification
                  </p>
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                    options={{ theme: "auto", size: "normal" }}
                  />
                </div>
              )}
              <button
                disabled={isLocking || !turnstileOk}
                onClick={handleCheckout}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2"
              >
                {isLocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reserving Seats...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
