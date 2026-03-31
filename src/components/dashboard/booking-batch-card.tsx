"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import { BookingQr } from "@/components/dashboard/booking-qr";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  REFUNDED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export type DashboardBookingRow = {
  id: string;
  paymentIntentId: string | null;
  eventId: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  quantity: number;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    imageUrl: string;
  };
  ticketType: { name: string; price: number };
};

interface BookingBatchCardProps {
  group: DashboardBookingRow[];
  userName?: string;
  userEmail?: string;
}

export function BookingBatchCard({ group, userName, userEmail }: BookingBatchCardProps) {
  const first = group[0];
  const eventDate = new Date(first.event.date);
  const ids = group.map((g) => g.id).sort();
  const qrPayload = `eventnexus:batch:${ids.join(",")}`;
  const lineSummaries = group.map(
    (g) => `${g.ticketType.name} × ${g.quantity}`
  );
  const total = group.reduce((s, g) => s + g.totalAmount, 0);
  const ticketCount = group.reduce((s, g) => s + g.quantity, 0);
  const dominantStatus = group.every((g) => g.status === "CONFIRMED")
    ? "CONFIRMED"
    : group[0].status;
  const showQr =
    group.some((g) => g.status === "CONFIRMED") && qrPayload.length > 0;

  const eventDateLong = eventDate.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const eventTime = eventDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const bookingRowsForPdf = group.map((g) => ({
    bookingId: g.id,
    ticketName: g.ticketType.name,
    quantity: g.quantity,
    totalAmount: g.totalAmount,
    status: g.status,
  }));

  return (
    <Link
      href={`/dashboard/events/${first.event.id}`}
      className="glass rounded-xl border border-[var(--border-subtle)] overflow-hidden flex flex-col sm:flex-row group hover:border-[var(--border-hover)] transition-colors"
    >
      <div className="relative w-full sm:w-36 h-28 sm:h-auto shrink-0">
        <Image
          src={first.event.imageUrl}
          alt={first.event.title}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium text-[var(--text-primary)] leading-tight group-hover:opacity-90 transition-opacity flex items-center gap-1">
              {first.event.title}
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 shrink-0" />
            </h3>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)] mt-1">
              {lineSummaries.join(" · ")} · {ticketCount} ticket
              {ticketCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div
            className="flex items-center gap-2 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            role="presentation"
          >
            {showQr && (
              <BookingQr
                eventTitle={first.event.title}
                qrPayload={qrPayload}
                detail={`Batch · ${ids.length} booking row${ids.length !== 1 ? "s" : ""}`}
                userName={userName}
                userEmail={userEmail}
                paymentIntentId={first.paymentIntentId}
                eventDate={eventDateLong}
                eventTime={eventTime}
                eventLocation={first.event.location}
                bookingRows={bookingRowsForPdf}
              />
            )}
            <span
              className={`text-[0.75rem] font-medium px-2.5 py-1 rounded-full border ${
                STATUS_STYLES[dominantStatus] ?? STATUS_STYLES.PENDING
              }`}
            >
              {dominantStatus}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {eventDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {first.event.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Booked{" "}
            {new Date(first.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>

        <div className="text-[0.875rem] font-semibold text-[var(--text-primary)]">
          ₹{total.toLocaleString("en-IN")}
        </div>
      </div>
    </Link>
  );
}
