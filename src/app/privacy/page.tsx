export const metadata = { title: "Privacy Policy — EventNexus" };

export default function PrivacyPage() {
  const updated = "29 March 2026";
  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-main max-w-3xl py-16">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Legal</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-[0.8125rem] text-[var(--text-muted)] mb-10">Last updated: {updated}</p>

        <div className="space-y-8 text-[0.9375rem] text-[var(--text-secondary)] leading-relaxed">
          <Section title="1. Introduction">
            EventNexus (&quot;we&quot;, &quot;our&quot;, &quot;the platform&quot;) is committed to protecting your personal information.
            This policy explains what data we collect, how we use it, and the choices available to you.
          </Section>

          <Section title="2. Information we collect">
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong className="text-[var(--text-primary)]">Account data</strong> — name, email address, and profile image provided by your OAuth provider (Google or GitHub).</li>
              <li><strong className="text-[var(--text-primary)]">Booking data</strong> — event, ticket type, quantity, and payment confirmation for tickets you purchase.</li>
              <li><strong className="text-[var(--text-primary)]">Usage data</strong> — pages visited, search queries, and session metadata collected for platform improvement.</li>
              <li><strong className="text-[var(--text-primary)]">Payment data</strong> — card details are handled exclusively by Stripe. We never store raw card numbers.</li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            We use your information to provide and improve the EventNexus service — processing your bookings,
            sending confirmation emails, preventing fraud, and personalising event recommendations. We do not
            sell personal data to third parties.
          </Section>

          <Section title="4. Data sharing">
            We share data only with:
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong className="text-[var(--text-primary)]">Stripe</strong> — for secure payment processing.</li>
              <li><strong className="text-[var(--text-primary)]">Event organisers</strong> — name and email for tickets you purchase, to facilitate event check-in.</li>
              <li><strong className="text-[var(--text-primary)]">Legal authorities</strong> — where required by applicable law.</li>
            </ul>
          </Section>

          <Section title="5. Cookies and local storage">
            We use secure session cookies for authentication and local storage for cart state. You may
            disable cookies in your browser, though this will affect core platform functionality.
          </Section>

          <Section title="6. Data retention">
            Account data is retained for as long as your account is active. You may request deletion by
            contacting support. Booking records are retained for 7 years for legal and accounting compliance.
          </Section>

          <Section title="7. Your rights">
            Under applicable data protection laws you have the right to access, correct, or delete your
            personal data. You may also object to certain processing activities. To exercise any right,
            use our <a href="/contact" className="text-[var(--text-primary)] underline hover:no-underline">contact page</a>.
          </Section>

          <Section title="8. Changes to this policy">
            We may update this policy periodically. When we do, we will revise the &quot;Last updated&quot; date
            at the top of this page and, where appropriate, notify you by email.
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
