"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Shield,
  Zap,
  BarChart3,
  Lock,
  Search,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Find Events Instantly",
    description:
      "Full-text search with intelligent autocomplete — filter by category, price, or date and land on the right event in seconds.",
  },
  {
    icon: Zap,
    title: "Live Seat Availability",
    description:
      "Ticket counts update in real time. When a seat is reserved it is held during checkout, so you always get what you paid for.",
  },
  {
    icon: Lock,
    title: "Secure Seat Locks",
    description:
      "A timed reservation holds your tickets exclusively during checkout, eliminating double-bookings for every customer.",
  },
  {
    icon: Brain,
    title: "Personalised Picks",
    description:
      "Search suggestions learn from what is popular in your preferred categories so relevant events surface first.",
  },
  {
    icon: BarChart3,
    title: "Transparent Pricing",
    description:
      "Multiple ticket tiers per event — General, VIP, Student — so attendees choose the access level that suits their budget.",
  },
  {
    icon: Shield,
    title: "Verified Payments",
    description:
      "All transactions are processed through Stripe's PCI-compliant infrastructure, keeping your card data fully protected.",
  },
];

export function FeaturesSection() {
  return (
    <section className="section">
      <div className="container-main">
        {/* Header */}
        <div className="text-center max-w-lg mx-auto mb-12">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Why EventNexus
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-3">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
            A streamlined ticketing experience built for attendees who value speed, reliability, and clarity.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border-subtle)] rounded-lg overflow-hidden">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="bg-[var(--bg-primary)] p-6 group hover:bg-[var(--bg-secondary)] transition-colors duration-200"
            >
              <feature.icon className="w-5 h-5 text-[var(--text-muted)] mb-4 group-hover:text-[var(--text-secondary)] transition-colors duration-200" />
              <h3 className="text-[0.875rem] font-medium text-[var(--text-primary)] mb-1.5">
                {feature.title}
              </h3>
              <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
