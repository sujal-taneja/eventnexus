export const metadata = { title: "Terms of Service — EventNexus" };

export default function TermsPage() {
  const updated = "29 March 2026";
  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-main max-w-3xl py-16">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">Terms of Service</h1>
        <p className="text-[0.8125rem] text-[var(--text-muted)] mb-10">Last updated: {updated}</p>

        <div className="space-y-8 text-[0.9375rem] leading-relaxed">
          <Section title="1. Acceptance">
            By creating an account or purchasing a ticket on EventNexus you agree to these Terms of Service.
            If you do not agree, you must not use the platform.
          </Section>

          <Section title="2. Accounts">
            You are responsible for maintaining the security of your account. We offer sign-in via Google
            and GitHub OAuth. You must not use another person&apos;s account without authorisation. We reserve
            the right to suspend or terminate accounts that violate these Terms.
          </Section>

          <Section title="3. Ticket purchases">
            All sales are final unless the event is cancelled by the organiser. Tickets are non-transferable
            unless explicitly stated by the organiser. EventNexus is not responsible for the quality, safety,
            or occurrence of any event listed on the platform.
          </Section>

          <Section title="4. Organiser responsibilities">
            Organisers are solely responsible for the accuracy of event information and for honouring
            tickets sold through the platform. Fraudulent events or misrepresentation will result in
            immediate account termination and fund recovery.
          </Section>

          <Section title="5. Payments">
            Payments are processed by Stripe Inc. By completing a purchase you also agree to Stripe&apos;s
            Terms of Service. EventNexus collects a platform fee on each paid transaction; this is displayed
            at checkout before payment confirmation.
          </Section>

          <Section title="6. Prohibited conduct">
            You may not use EventNexus to: resell tickets above face value; impersonate any person;
            scrape or crawl the platform without authorisation; or use automated tools to purchase tickets.
          </Section>

          <Section title="7. Limitation of liability">
            To the maximum extent permitted by law, EventNexus&apos;s liability is limited to the amount you
            paid for the specific transaction giving rise to the claim. We are not liable for indirect,
            incidental, or consequential damages.
          </Section>

          <Section title="8. Governing law">
            These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of
            Mumbai, Maharashtra.
          </Section>

          <Section title="9. Contact">
            Questions about these Terms? Contact us at{" "}
            visit our <a href="/contact" className="text-[var(--text-primary)] underline hover:no-underline">contact page</a>.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
      <div className="text-[var(--text-secondary)]">{children}</div>
    </section>
  );
}
