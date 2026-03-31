"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";

export function HeroSection() {
  return (
    <section className="relative min-h-[56vh] flex items-center justify-center overflow-hidden pt-10 pb-2">
      {/* Subtle corner gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[300px] -right-[300px] w-[700px] h-[700px] rounded-full bg-white opacity-[0.02] blur-[120px]" />
      </div>

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="container-main relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex justify-center mb-2"
          >
            <span className="badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
              Tickets for every occasion
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-[3.25rem] font-semibold tracking-tight leading-[1.05] mb-2 text-[var(--text-primary)]"
          >
            Book the events
            <br />
            that matter to you
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-[0.9375rem] text-[var(--text-secondary)] max-w-lg mx-auto mb-4 leading-snug space-y-1 tracking-tight"
          >
            <span className="block">
              Browse thousands of events across music, gaming, food, business,
              and culture.
            </span>
            <span className="block">
              Reserve your seat in seconds — no friction, no fuss.
            </span>
          </motion.p>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center mb-4"
          >
            <div className="w-full max-w-md">
              <SearchBar
                placeholder="Search events, artists, venues..."
                className="w-full"
              />
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3"
          >
            <Link href="/events" className="btn-primary">
              Explore Events
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/organizers" className="btn-secondary">
              Host an Event
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex justify-center gap-6 md:gap-8 mt-6 pt-4 border-t border-[var(--border-subtle)]"
          >
            {[
              { value: "15+", label: "Live events" },
              { value: "6", label: "Categories" },
              { value: "5", label: "Organisers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 tracking-tight">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
