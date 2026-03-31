import Link from "next/link";

export const metadata = { title: "Refund Policy — EventNexus" };

export default function RefundsPage() {
  const updated = "29 March 2026";
  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-main max-w-3xl py-16">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">Refund Policy</h1>
        <p className="text-[0.8125rem] text-[var(--text-muted)] mb-10">Last updated: {updated}</p>

        <div className="space-y-8 text-[0.9375rem] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">General policy</h2>
            <p className="text-[var(--text-secondary)]">
              All ticket sales are final. EventNexus does not offer refunds on confirmed purchases unless
              the event is cancelled, postponed, or significantly changed by the organiser.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Event cancellation</h2>
            <p className="text-[var(--text-secondary)]">
              If an organiser cancels their event, all affected ticket holders will receive a full refund
              of the ticket face value to their original payment method within 5–10 business days.
              Platform fees are non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Event postponement</h2>
            <p className="text-[var(--text-secondary)]">
              If an event is postponed, your ticket remains valid for the rescheduled date. If you cannot
              attend on the new date, you may request a refund within 7 days of the postponement
              announcement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Duplicate purchases</h2>
            <p className="text-[var(--text-secondary)]">
              If you accidentally purchase tickets twice for the same event, contact us within 24 hours
              with your order references and we will process a refund for the duplicate order.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">How to request a refund</h2>
            <p className="text-[var(--text-secondary)]">
              Contact us via our <a href="/contact" className="text-[var(--text-primary)] underline hover:no-underline">contact page</a> with your
              booking reference, the reason for your request, and any relevant documentation. We aim to
              respond within 2 business days.
            </p>
          </section>

          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] mt-4">
            <p className="text-[0.875rem] text-[var(--text-secondary)]">
              Questions about a specific booking?{" "}
              <Link href="/dashboard" className="text-white hover:underline underline-offset-4">
                View your bookings
              </Link>{" "}
              in the dashboard or contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
