import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Download } from "lucide-react";

export default async function AttendeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  // Ensure the event belongs to this organizer
  const event = await prisma.event.findUnique({
    where: { id: eventId, organizerId: userId },
    select: { title: true, id: true },
  });

  if (!event) {
    redirect("/organizer/events");
  }

  const bookings = await prisma.booking.findMany({
    where: { eventId: event.id, status: "CONFIRMED" },
    include: {
      user: { select: { name: true, email: true } },
      ticketType: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
         <div>
           <Link href="/organizer/events" className="inline-flex items-center gap-2 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4">
             <ArrowLeft className="w-3.5 h-3.5" />
             Back to Events
           </Link>
           <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">{event.title} — Attendees</h1>
           <p className="text-[var(--text-secondary)]">View and manage the confirmed attendees for this event.</p>
         </div>
         <div className="flex flex-wrap items-center gap-3">
           <a
             href={`/api/organizer/events/${event.id}/export`}
             className="btn-secondary py-2 px-4 inline-flex items-center gap-2 text-sm"
             download
           >
             <Download className="w-4 h-4" />
             Export CSV
           </a>
           <Link
             href={`/organizer/events/${event.id}/check-in`}
             className="btn-primary py-2 px-4 inline-flex items-center gap-2 text-sm"
           >
             QR check-in
           </Link>
         </div>
      </div>

      {bookings.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed">
          <Users className="w-12 h-12 text-[var(--border-strong)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No attendees yet</h3>
          <p className="text-[var(--text-tertiary)] max-w-sm">
            Once people start booking tickets for this event, they will appear here.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                   <tr>
                     <th className="px-6 py-4 font-medium">Attendee Name</th>
                     <th className="px-6 py-4 font-medium">Email Address</th>
                     <th className="px-6 py-4 font-medium">Ticket Type</th>
                     <th className="px-6 py-4 font-medium">Quantity</th>
                     <th className="px-6 py-4 font-medium">Check-in</th>
                     <th className="px-6 py-4 font-medium text-right">Paid</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                   {bookings.map((b) => (
                     <tr key={b.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                       <td className="px-6 py-4 font-medium">{b.user.name || "Unknown"}</td>
                       <td className="px-6 py-4 text-[var(--text-secondary)]">{b.user.email}</td>
                       <td className="px-6 py-4">
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[0.75rem]">
                           {b.ticketType.name}
                         </span>
                       </td>
                       <td className="px-6 py-4">{b.quantity}</td>
                       <td className="px-6 py-4 text-[0.8125rem]">
                         {b.checkedInAt ? (
                           <span className="text-emerald-500">In</span>
                         ) : (
                           <span className="text-[var(--text-muted)]">—</span>
                         )}
                       </td>
                       <td className="px-6 py-4 text-right font-medium">₹{b.totalAmount.toLocaleString("en-IN")}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
}
