import { auth } from "@/lib/auth";
import { Calendar, BarChart3, CreditCard, Users, Shield, Zap } from "lucide-react";
import { OrganizerCta } from "@/components/organizers/organizer-cta";

export const metadata = { title: "For Organisers — EventNexus" };

const features = [
  {
    icon: Calendar,
    title: "Publish in minutes",
    body: "Create your event, set ticket tiers with custom pricing and capacity, and go live without technical knowledge.",
  },
  {
    icon: Zap,
    title: "Real-time availability",
    body: "Seat counts update live. Our timed seat-lock system prevents double-booking, so you never oversell.",
  },
  {
    icon: CreditCard,
    title: "Stripe-powered payments",
    body: "Accept cards, UPI, and net banking. Funds are settled directly to your Stripe account — we never hold your money.",
  },
  {
    icon: BarChart3,
    title: "Booking dashboard",
    body: "See who has booked, how many seats remain per tier, and track your revenue — all from one clean interface.",
  },
  {
    icon: Users,
    title: "Multi-tier tickets",
    body: "Offer General Admission, VIP, Early Bird, Student, and any custom tier you need, each with its own price and capacity.",
  },
  {
    icon: Shield,
    title: "Fraud protection",
    body: "CAPTCHA on login, rate-limited booking APIs, and PCI-compliant payments keep your revenue safe from bad actors.",
  },
];

const steps = [
  { n: "01", title: "Create an account", body: "Sign up with Google or GitHub — no forms to fill, no email verification loop." },
  { n: "02", title: "Submit your event", body: "Add your event details, set the date, location, and ticket tiers." },
  { n: "03", title: "Publish and share", body: "Go live instantly. Share your event page link anywhere." },
  { n: "04", title: "Collect payments", body: "Attendees book and pay securely through Stripe. You track every booking in your dashboard." },
];

export default async function OrganisersPage() {
  const session = await auth();
  const userRole = (session?.user?.role ?? null) as "USER" | "ORGANIZER" | "ADMIN" | null;

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="border-b border-[var(--border-subtle)]">
        <div className="container-main py-8 md:py-12">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-normal mb-2">For Organisers</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-normal leading-tight text-[var(--text-primary)] max-w-2xl mb-4">
            Everything you need to run a successful event.
          </h1>
          <p className="text-[0.9375rem] text-[var(--text-secondary)] max-w-xl leading-relaxed mb-6">
            EventNexus handles ticketing, payments, and seat management so you
            can focus entirely on delivering an unforgettable experience for
            your attendees.
          </p>

          {/* Auth-aware CTA — rendered client-side */}
          <OrganizerCta userRole={userRole} isSignedIn={!!session} />

          {/* Contextual hint */}
          {session && userRole === "USER" && (
            <div className="mt-10 pt-8 border-t border-[var(--border-subtle)]">
              <p className="text-[0.8125rem] text-[var(--text-muted)]">
                You are signed in as{" "}
                <span className="text-[var(--text-secondary)]">{session.user?.email}</span>.
                One click upgrades your account.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container-main">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-normal mb-2 text-center">Platform features</p>
          <h2 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] text-center mb-8">
            Built for organisers who want results.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border-subtle)] rounded-xl overflow-hidden">
            {features.map((f) => (
              <div key={f.title} className="bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors p-6 group">
                <f.icon className="w-5 h-5 text-[var(--text-muted)] mb-4 group-hover:text-[var(--text-secondary)] transition-colors" />
                <h3 className="text-[0.875rem] font-medium text-[var(--text-primary)] mb-1.5">{f.title}</h3>
                <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section border-t border-[var(--border-subtle)]">
        <div className="container-main">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-normal mb-2">How it works</p>
          <h2 className="text-2xl font-semibold tracking-normal text-[var(--text-primary)] mb-8">From idea to live event in four steps.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="p-5 rounded-xl border border-[var(--border-subtle)]">
                <span className="text-2xl font-semibold text-[var(--text-muted)] mb-3 block">{s.n}</span>
                <h3 className="font-medium text-[var(--text-primary)] mb-1.5">{s.title}</h3>
                <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section border-t border-[var(--border-subtle)]">
        <div className="container-main text-center max-w-md mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Ready to host your first event?</h2>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)] mb-6">
            {session
              ? "Upgrade your account with one click and start publishing immediately."
              : "Sign up free and publish your event in under five minutes."}
          </p>
          <OrganizerCta userRole={userRole} isSignedIn={!!session} />
        </div>
      </section>
    </div>
  );
}
