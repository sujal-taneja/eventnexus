"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const benefits = [
  "Create and publish events at no upfront cost",
  "Manage ticket tiers — General, VIP, Student, and more",
  "Automated e-ticket delivery on confirmed booking",
  "Secure Stripe-powered payment processing",
];

export function CTASection() {
  const { data: session, status } = useSession();

  return (
    <section className="section">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="border border-[var(--border-subtle)] rounded-lg p-6 sm:p-10 md:p-12"
        >
          <div className="max-w-lg">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Get started
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2 leading-[1.15]">
              Start selling tickets
              <br />
              in under five minutes.
            </h2>

            <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed mb-6 max-w-sm">
              EventNexus gives organisers everything they need to publish events,
              manage attendance, and collect payments — all from one dashboard.
            </p>

            {/* Benefits */}
            <ul className="space-y-2 mb-8">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2 text-[0.8125rem] text-[var(--text-secondary)]"
                >
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTAs — signed-in users only need browse; guests see both */}
            <div className="flex flex-wrap gap-3">
              {status === "loading" ? (
                <div className="h-10 w-40 rounded-lg bg-white/5 animate-pulse" />
              ) : session ? (
                <Link href="/events" className="btn-primary inline-flex w-fit items-center gap-2">
                  Browse events
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-primary inline-flex w-fit items-center gap-2"
                  >
                    Get started free
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/events" className="btn-secondary inline-flex w-fit items-center">
                    Browse events
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
