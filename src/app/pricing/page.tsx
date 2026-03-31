import { auth } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export const metadata = { title: "Pricing — EventNexus" };

export default async function PricingPage() {
  const session = await auth();
  const isSignedIn = !!session;
  const isOrganizer = session?.user?.role === "ORGANIZER" || session?.user?.role === "ADMIN";

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <section className="border-b border-[var(--border-subtle)]">
        <div className="container-main py-14 text-center max-w-xl mx-auto">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] mb-4">
            Simple, honest pricing.
          </h1>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed">
            No subscriptions. No hidden fees at checkout.
            Attendees pay nothing to use EventNexus.
            Organisers keep what they earn.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="section">
        <div className="container-main">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 flex flex-col relative overflow-hidden">
              {isSignedIn && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  {isOrganizer ? "Organiser access" : "Your current plan"}
                </span>
              )}
              <p className="text-[0.8125rem] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Free
              </p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-3xl font-semibold text-[var(--text-primary)]">₹0</span>
                <span className="text-[0.8125rem] text-[var(--text-muted)] mb-1">/ forever</span>
              </div>
              <p className="text-[0.8125rem] text-[var(--text-tertiary)] mb-6">
                For attendees and event organisers just getting started.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Browse all public events",
                  "Book free & paid tickets",
                  "Manage bookings from your dashboard",
                  "Publish events with multiple ticket tiers",
                  "Real-time seat availability",
                  "Secure Stripe-powered checkout",
                  "OAuth sign-in (Google / GitHub)",
                  "Small platform fee on paid ticket transactions",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.8125rem] text-[var(--text-secondary)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isOrganizer ? (
                <Link href="/organizer" className="btn-primary justify-center">
                  Open organiser dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : isSignedIn ? (
                <Link href="/events" className="btn-secondary justify-center">
                  Browse events <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link href="/register" className="btn-secondary justify-center">
                  Get started free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Custom */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 flex flex-col">
              <span className="self-start mb-4 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] opacity-90">
                Enterprise
              </span>
              <p className="text-[0.8125rem] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Custom
              </p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-3xl font-semibold text-[var(--text-primary)]">Custom</span>
                <span className="text-[0.8125rem] text-[var(--text-muted)] mb-1">/ contact us</span>
              </div>
              <p className="text-[0.8125rem] text-[var(--text-tertiary)] mb-6">
                For large-scale events, ticketing agencies, and white-label deployments.
              </p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Everything in Free",
                  "Dedicated account manager",
                  "White-label option",
                  "Priority support SLA",
                  "Custom integrations & webhooks",
                  "Volume pricing on platform fees",
                  "Custom payment settlement terms",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.8125rem] text-[var(--text-secondary)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/contact" className="btn-primary justify-center">
                Contact us <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Contextual note for signed-in organisers */}
          {isOrganizer && (
            <p className="text-center text-[0.8125rem] text-emerald-400 mt-8">
              You already have full organiser access.{" "}
              <Link href="/dashboard" className="underline hover:no-underline">
                Go to your dashboard →
              </Link>
            </p>
          )}

          <p className="text-center text-[0.8125rem] text-[var(--text-muted)] mt-6">
            Platform fees apply to paid ticket transactions.{" "}
            <Link href="/contact" className="underline hover:text-[var(--text-primary)] transition-colors">
              Get in touch
            </Link>{" "}
            for volume discounts.
          </p>
        </div>
      </section>
    </div>
  );
}
