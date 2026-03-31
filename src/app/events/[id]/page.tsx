import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, MapPin, Clock, ArrowLeft, Users, Ticket } from "lucide-react";
import Link from "next/link";
import { TicketSelector } from "@/components/events/ticket-selector";
import { auth } from "@/lib/auth";
import { getRemainingByTicketType } from "@/lib/ticket-availability";
import { formatEventDateTime } from "@/lib/timezone";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      tickets: true,
      organizer: { select: { name: true, image: true } },
    },
  });

  if (!event) notFound();

  const ticketIds = event.tickets.map((t) => t.id);
  const remainingMap = await getRemainingByTicketType(ticketIds);
  const remainingById = Object.fromEntries(
    ticketIds.map((id) => [id, remainingMap.get(id) ?? 0])
  );

  const session = await auth();
  let ownedById: Record<string, number> = {};
  if (session?.user?.id) {
    const mine = await prisma.booking.groupBy({
      by: ["ticketTypeId"],
      where: {
        userId: session.user.id,
        eventId: id,
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
      _sum: { quantity: true },
    });
    ownedById = Object.fromEntries(
      mine.map((m) => [m.ticketTypeId, m._sum.quantity ?? 0])
    );
  }

  const { dateLong: dateStr, timeShort: timeStr } = formatEventDateTime({
    date: new Date(event.date),
    timeZone: event.timeZone,
    locale: "en-US",
  });

  const totalCapacity = event.tickets.reduce((s, t) => s + t.capacity, 0);
  const lowestPrice =
    event.tickets.length > 0
      ? Math.min(...event.tickets.map((t) => t.price))
      : 0;

  return (
    <div className="min-h-screen pt-14 pb-24">
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative w-full h-[50vh] min-h-[340px] bg-[var(--bg-secondary)] overflow-hidden">
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover opacity-50"
            priority
          />
        )}
        {/* strong bottom gradient so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.45)] via-[rgba(0,0,0,0.55)] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,0,0,0.25)] to-transparent" />

        {/* Category tag only on top image (keeps hero readable) */}
        <div className="absolute bottom-0 left-0 right-0 container-main pb-8">
          <span className="inline-block px-2.5 py-1 mb-3 rounded-md glass border border-[var(--border-subtle)] text-[11px] font-medium tracking-widest uppercase text-[var(--text-tertiary)]">
            {event.category}
          </span>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────────────────── */}
      <div className="container-main mt-12 md:mt-16">
        {/* Title + metadata moved below the image for consistent readability */}
        <div className="mb-10">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to events
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight max-w-3xl">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 text-[0.8125rem] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {timeStr}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {event.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              {totalCapacity.toLocaleString()} total seats
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 xl:gap-16">
          {/* ── Left: event info ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-12">

            {/* Price callout banner */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
              <div>
                <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                  Starting from
                </p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {lowestPrice === 0 ? "Free" : `₹${lowestPrice.toLocaleString()}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                  Ticket tiers
                </p>
                <p className="text-lg font-medium text-[var(--text-secondary)]">
                  {event.tickets.length}
                </p>
              </div>
            </div>

            {/* Description */}
            <section>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-3">
                About this event
              </h2>
              <p className="text-[0.9375rem] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </section>

            {/* Ticket tiers overview */}
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-4">
                Ticket options
              </h2>
              <div className="space-y-2">
                {event.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                  >
                    <div>
                      <p className="text-[0.875rem] font-medium text-[var(--text-primary)]">
                        {ticket.name}
                      </p>
                      <p className="text-[0.8125rem] text-[var(--text-muted)] mt-0.5">
                        {remainingById[ticket.id] ?? 0} seats left
                        {(ownedById[ticket.id] ?? 0) > 0 ? (
                          <span className="text-[var(--text-tertiary)]">
                            {" "}
                            · You hold {ownedById[ticket.id]}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <p className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                      {ticket.price === 0 ? "Free" : `₹${ticket.price.toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Organizer */}
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-4">
                Organised by
              </h2>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                {event.organizer.image ? (
                  <Image
                    src={event.organizer.image}
                    alt={event.organizer.name || ""}
                    width={48}
                    height={48}
                    className="rounded-full border border-[var(--border-subtle)]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center font-semibold text-lg text-[var(--text-primary)]">
                    {event.organizer.name?.[0] || "O"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {event.organizer.name || "Anonymous Organiser"}
                  </p>
                  <p className="text-[0.8125rem] text-[var(--text-tertiary)] mt-0.5">
                    Event Organiser
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right: ticket selector ───────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {session &&
                Object.values(ownedById).reduce((a, b) => a + b, 0) > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
                    <Ticket className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[0.8125rem] text-[var(--text-secondary)] leading-relaxed">
                      You already have tickets for this event. You can add more below
                      if seats are available.
                    </p>
                  </div>
                )}
              <TicketSelector
                eventId={event.id}
                eventTitle={event.title}
                tickets={event.tickets}
                remainingById={remainingById}
                ownedById={ownedById}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
