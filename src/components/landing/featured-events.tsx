"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/event-card";

type FeaturedEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  category: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  organizer: string;
};

const getCategories = (events: FeaturedEvent[]) => {
  const uniqueCats = Array.from(new Set(events.map(e => e.category)));
  return [
    { label: "All Events", value: "all" },
    ...uniqueCats.map(c => ({ label: c, value: c.toLowerCase() }))
  ];
};

export function FeaturedEventsSection({ events }: { events: FeaturedEvent[] }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const categories = getCategories(events);

  const filteredEvents =
    activeCategory === "all"
      ? events
      : events.filter(
          (e) => e.category.toLowerCase() === activeCategory
        );

  return (
    <section className="section">
      <div className="container-main">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Trending now
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Featured Events
            </h2>
          </div>
          <Link
            href="/events"
            className="btn-secondary text-[0.8125rem] group"
          >
            View all
            <ArrowRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-[0.8125rem] transition-all duration-150 ${
                activeCategory === cat.value
                  ? "bg-white text-black font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.03]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <EventCard {...event} />
            </motion.div>
          ))}
        </motion.div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-[0.8125rem]">
              No events in this category yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
