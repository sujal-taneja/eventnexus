import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { BookingQr } from "@/components/dashboard/booking-qr";

function batchKey(b: {
  paymentIntentId: string | null;
  eventId: string;
  id: string;
}) {
  if (b.paymentIntentId) return `${b.paymentIntentId}::${b.eventId}`;
  return b.id;
}

type BookingRow = Awaited<ReturnType<typeof loadBookingsForEvent>>[number];

async function loadBookingsForEvent(userId: string, eventId: string) {
  return prisma.booking.findMany({
    where: {
      userId,
      eventId,
      status: { not: "CANCELLED" },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          imageUrl: true,
          description: true,
        },
      },
      ticketType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

function groupBatches(rows: BookingRow[]) {
  const map = new Map<string, BookingRow[]>();
  for (const b of rows) {
    const k = batchKey(b);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(b);
  }
  return [...map.values()].map((g) =>
    [...g].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  );
}

export default async function DashboardEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { eventId } = await params;

  const rows = await loadBookingsForEvent(session.user.id, eventId);
  if (rows.length === 0) notFound();

  const event = rows[0].event;
  const batches = groupBatches(rows);
  const totalTickets = rows.reduce((s, r) => s + r.quantity, 0);

  const eventDate = new Date(event.date);
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

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-main max-w-3xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-[var(--border-subtle)]">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[0.8125rem] text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {eventDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl border border-[var(--border-subtle)] p-6 space-y-3">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Your tickets
          </h2>
          <p className="text-[0.9375rem] text-[var(--text-secondary)]">
            You have{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {totalTickets}
            </span>{" "}
            ticket{totalTickets !== 1 ? "s" : ""} across{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {batches.length}
            </span>{" "}
            purchase{batches.length !== 1 ? "s" : ""}.
          </p>
        </div>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-3">
            About this event
          </h2>
          <p className="text-[0.9375rem] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Entry QR codes
          </h2>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
            Each purchase has its own QR. Multiple tiers bought together share one
            code for that checkout.
          </p>
          <div className="space-y-4">
            {batches.map((batch) => {
              const ids = batch.map((b) => b.id).sort();
              const payload = `eventnexus:batch:${ids.join(",")}`;
              const lines = batch.map((b) => `${b.ticketType.name} × ${b.quantity}`);
              const qty = batch.reduce((s, b) => s + b.quantity, 0);
              const showQr = batch.some((b) => b.status === "CONFIRMED");
              return (
                <div
                  key={batchKey(batch[0])}
                  className="glass rounded-xl border border-[var(--border-subtle)] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <p className="text-[0.8125rem] text-[var(--text-muted)]">
                      Purchased{" "}
                      {new Date(batch[0].createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-[0.9375rem] text-[var(--text-primary)] mt-1">
                      {lines.join(" · ")}
                    </p>
                    <p className="text-[0.8125rem] text-[var(--text-tertiary)] mt-1">
                      {qty} ticket{qty !== 1 ? "s" : ""} ·{" "}
                      <span className="uppercase">{batch[0].status}</span>
                    </p>
                  </div>
                  {showQr ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <BookingQr
                        eventTitle={event.title}
                        qrPayload={payload}
                        detail={`${ids.length} row${ids.length !== 1 ? "s" : ""}`}
                        userName={session.user?.name ?? undefined}
                        userEmail={session.user?.email ?? undefined}
                        paymentIntentId={batch[0].paymentIntentId}
                        eventDate={eventDateLong}
                        eventTime={eventTime}
                        eventLocation={event.location}
                        bookingRows={batch.map((b) => ({
                          bookingId: b.id,
                          ticketName: b.ticketType.name,
                          quantity: b.quantity,
                          totalAmount: b.totalAmount,
                          status: b.status,
                        }))}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
