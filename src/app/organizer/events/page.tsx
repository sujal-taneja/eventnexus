import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Plus, Calendar, MapPin, Users, Pencil, ScanLine } from "lucide-react";

export default async function OrganizerEventsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const events = await prisma.event.findMany({
    where: { organizerId: userId },
    orderBy: { date: "desc" },
    include: {
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      tickets: { select: { capacity: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">My Events</h1>
          <p className="text-[var(--text-secondary)]">
            Manage your published and draft events.
          </p>
        </div>
        <Link
          href="/organizer/events/create"
          className="btn-primary py-2.5 px-4 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed">
          <Calendar className="w-12 h-12 text-[var(--border-strong)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No events found</h3>
          <p className="text-[var(--text-tertiary)] max-w-sm mb-6">
            You have not created any events yet. Click the button above to set up your first event and start selling tickets.
          </p>
          <Link
            href="/organizer/events/create"
            className="btn-primary py-2 px-4 inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const totalCapacity = event.tickets.reduce((sum, t) => sum + t.capacity, 0);
            const soldCount = event._count.bookings;
            
            return (
              <div key={event.id} className="glass-card p-4 flex flex-col sm:flex-row gap-6 items-center hover:bg-[var(--bg-secondary)] transition-colors">
                {/* Event Image */}
                <div className="relative w-full sm:w-40 h-28 rounded-lg overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                  <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                </div>
                
                {/* Event Details */}
                <div className="flex-1 w-full space-y-2">
                   <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">{event.title}</h3>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/organizer/events/${event.id}/edit`}
                          className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <Link
                          href={`/organizer/events/${event.id}/check-in`}
                          className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          Scan
                        </Link>
                      </div>
                   </div>
                   <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        {event.location}
                      </span>
                   </div>
                </div>

                {/* Sales Stats Box */}
                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pl-4 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-4 sm:pt-0">
                   <div className="text-left sm:text-right">
                       <span className="block text-[0.75rem] text-[var(--text-tertiary)] mb-0.5 uppercase tracking-wide">Tickets Sold</span>
                       <span className="text-xl font-semibold text-[var(--text-primary)]">
                          {soldCount} <span className="text-sm font-normal text-[var(--text-muted)]">/ {totalCapacity}</span>
                       </span>
                   </div>
                   <Link href={`/organizer/events/${event.id}/attendees`} className="text-[0.8125rem] text-[var(--accent)] hover:underline flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      View Attendees
                   </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
