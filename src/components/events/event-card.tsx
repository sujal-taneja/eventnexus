"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface EventCardProps {
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
}

export function EventCard({
  id,
  title,
  date,
  time,
  location,
  imageUrl,
  category,
  price,
  spotsLeft,
}: Omit<EventCardProps, "totalSpots"> & { totalSpots?: number }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/events/${id}`}
        className="group block glass-card overflow-hidden"
      >
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent z-10" />
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Category */}
          <div className="absolute top-3 left-3 z-20">
            <span className="badge">{category}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <h3 className="text-[0.875rem] font-medium text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--text-primary)] transition-colors duration-150">
            {title}
          </h3>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Calendar className="w-3 h-3" />
              <span>{date}</span>
              <span>·</span>
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{location}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                {spotsLeft} spots left
              </span>
            </div>

            <div className="text-[0.875rem] font-medium text-[var(--text-primary)]">
              {price === 0 ? "Free" : `₹${price}`}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
