import Link from "next/link";
import { ArrowRight, Ticket, Users, Globe, Zap } from "lucide-react";

export const metadata = { title: "About — EventNexus" };

const values = [
  {
    icon: Zap,
    title: "Speed first",
    body: "Every interaction is optimised for time-to-ticket. We believe the booking experience should never be the reason you miss an event.",
  },
  {
    icon: Users,
    title: "Built for everyone",
    body: "Whether you are buying your first ticket or managing your tenth event as an organiser, EventNexus is designed to work for you out of the box.",
  },
  {
    icon: Globe,
    title: "Transparent by default",
    body: "No hidden fees at checkout. No opaque pricing tiers. What you see on the event page is what you pay.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-20 md:pt-24">
      {/* Hero */}
      <section className="border-b border-[var(--border-subtle)]">
        <div className="container-main pt-2 pb-10 md:pb-14">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-normal mb-3 md:mb-4">About EventNexus</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight max-w-2xl mb-5">
            A ticketing platform that respects your time.
          </h1>
          <p className="text-[var(--text-tertiary)] text-[0.9375rem] max-w-xl leading-relaxed">
            EventNexus was founded on a simple idea: booking a ticket should be
            as fast and stress-free as deciding to attend. We built the
            infrastructure, now you focus on the experience.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="section">
        <div className="container-main">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Our mission</p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-4">
                Connect people with the events that matter to them.
              </h2>
              <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed mb-4">
                From grassroots community meetups to large-scale music festivals,
                every gathering deserves a professional booking experience.
                EventNexus gives organisers the tools to sell tickets and gives
                attendees the confidence that their seat is guaranteed.
              </p>
              <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed">
                We handle the complexity — seat locking, secure payments, real-time
                availability — so both sides of the transaction can focus on
                what they care about: the event itself.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Events live", value: "15+" },
                { label: "Ticket categories", value: "6" },
                { label: "Organiser accounts", value: "5" },
                { label: "Cities covered", value: "10+" },
              ].map((s) => (
                <div key={s.label} className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  <p className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{s.value}</p>
                  <p className="text-[0.8125rem] text-[var(--text-tertiary)] tracking-normal">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section border-t border-[var(--border-subtle)]">
        <div className="container-main">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 text-center">What we stand for</p>
          <h2 className="text-2xl font-semibold tracking-tight text-center text-[var(--text-primary)] mb-10">
            Our values
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-xl border border-[var(--border-subtle)]">
                <v.icon className="w-5 h-5 text-[var(--text-muted)] mb-4" />
                <h3 className="font-medium text-[var(--text-primary)] mb-2">{v.title}</h3>
                <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section border-t border-[var(--border-subtle)]">
        <div className="container-main text-center max-w-lg mx-auto">
          <Ticket className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Ready to explore?</h2>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)] mb-6">Browse all live events and book your next experience today.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/events" className="btn-primary">
              Browse events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/contact" className="btn-secondary">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
