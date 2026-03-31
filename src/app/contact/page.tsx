import { MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata = { title: "Contact — EventNexus" };

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container-main max-w-2xl py-16">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Get in touch</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-4">Contact us</h1>
        <p className="text-[0.9375rem] text-[var(--text-tertiary)] leading-relaxed mb-10">
          Have a question, a partnership enquiry, or need help with a booking? Fill out the form below — we route
          messages directly to our team (inbox forwarded from this secure form).
        </p>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] mb-8">
          <MessageCircle className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
          <p className="text-[0.875rem] text-[var(--text-tertiary)]">
            Responses are typically within one business day. Please complete the security check before sending.
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
