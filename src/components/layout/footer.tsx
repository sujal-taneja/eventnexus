import Link from "next/link";
import { Ticket, Globe, MessageCircle, Mail } from "lucide-react";

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Browse Events", href: "/events" },
      { label: "Categories", href: "/categories" },
      { label: "For Organisers", href: "/organizers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refunds" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)]">
      <div className="container-main">
        <div className="py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-white/90 flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-[0.9375rem] font-medium tracking-tight">
                EventNexus
              </span>
            </Link>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)] max-w-xs leading-relaxed mb-5">
              The modern ticketing platform for attendees and organisers.
              Browse events, reserve seats, and pay securely — all in one place.
            </p>
            <div className="flex items-center gap-2">
              {[Globe, MessageCircle, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-all duration-150"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-[0.8125rem] font-medium text-[var(--text-secondary)] mb-3">
                {section.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.8125rem] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="py-5 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} EventNexus. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            <span className="text-xs text-[var(--text-muted)]">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
