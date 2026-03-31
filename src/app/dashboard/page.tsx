import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, Ticket } from "lucide-react";
import {
  BookingBatchCard,
  type DashboardBookingRow,
} from "@/components/dashboard/booking-batch-card";
import { dashboardBookingBatchKey } from "@/lib/dashboard-booking-key";

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eventSectionLabel(eventDate: Date): "today" | "upcoming" | "past" {
  const now = new Date();
  const sod = startOfLocalDay(now);
  const eod = new Date(sod);
  eod.setHours(23, 59, 59, 999);
  const ed = new Date(eventDate);
  const dayStart = startOfLocalDay(ed);
  if (dayStart.getTime() === sod.getTime()) return "today";
  if (ed > eod) return "upcoming";
  return "past";
}

type BookingWithRelations = Awaited<
  ReturnType<typeof fetchUserBookings>
>[number];

async function fetchUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          imageUrl: true,
          category: true,
          description: true,
        },
      },
      ticketType: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

function toDashboardRow(b: BookingWithRelations): DashboardBookingRow {
  return {
    id: b.id,
    paymentIntentId: b.paymentIntentId,
    eventId: b.eventId,
    createdAt: b.createdAt.toISOString(),
    status: b.status,
    totalAmount: b.totalAmount,
    quantity: b.quantity,
    event: {
      id: b.event.id,
      title: b.event.title,
      date: b.event.date.toISOString(),
      location: b.event.location,
      imageUrl: b.event.imageUrl,
    },
    ticketType: b.ticketType,
  };
}

function aggregateGroups(bookings: BookingWithRelations[]) {
  const map = new Map<string, BookingWithRelations[]>();
  for (const b of bookings) {
    const k = dashboardBookingBatchKey(b);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(b);
  }
  const groups = [...map.values()].map((rows) =>
    [...rows].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  );
  groups.sort(
    (a, b) =>
      new Date(b[b.length - 1].createdAt).getTime() -
      new Date(a[a.length - 1].createdAt).getTime()
  );
  return groups;
}

function Section({
  title,
  groups,
  userName,
  userEmail,
}: {
  title: string;
  groups: DashboardBookingRow[][];
  userName?: string | null;
  userEmail?: string | null;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-[0.8125rem] font-medium text-[var(--text-muted)] uppercase tracking-normal">
        {title}
      </h3>
      <div className="space-y-3">
        {groups.map((g) => (
          <BookingBatchCard
            key={dashboardBookingBatchKey(g[0])}
            group={g}
            userName={userName ?? undefined}
            userEmail={userEmail ?? undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const bookings = await fetchUserBookings(session.user.id);

  const rawGroups = aggregateGroups(bookings);
  const groups = rawGroups.map((g) => g.map(toDashboardRow));
  const today: DashboardBookingRow[][] = [];
  const upcoming: DashboardBookingRow[][] = [];
  const past: DashboardBookingRow[][] = [];

  for (const g of groups) {
    const label = eventSectionLabel(new Date(g[0].event.date));
    if (label === "today") today.push(g);
    else if (label === "upcoming") upcoming.push(g);
    else past.push(g);
  }

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="container-main max-w-4xl space-y-6">
        <div className="glass rounded-xl p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-5">
            {session.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={72}
                height={72}
                className="rounded-full border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-zinc-800 border border-[var(--border-subtle)] flex items-center justify-center text-xl font-medium text-[var(--text-primary)]">
                {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-[var(--text-primary)]">
                Welcome back, {session.user?.name || "User"}!
              </h1>
              <p className="text-[var(--text-tertiary)] mt-1 text-[0.875rem]">
                {session.user?.email} &bull; Role:{" "}
                <span className="capitalize lowercase">
                  {session.user?.role || "USER"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {(session.user?.role === "ORGANIZER" ||
            session.user?.role === "ADMIN") && (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/organizer"
                className="btn-secondary inline-flex items-center gap-2 text-[0.8125rem]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Switch to organiser dashboard
              </Link>
            </div>
          )}

          <h2 className="text-base font-semibold tracking-normal text-[var(--text-primary)]">
            Your Bookings
            {bookings.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
                ({bookings.length} ticket line{bookings.length !== 1 ? "s" : ""})
              </span>
            )}
          </h2>

          {bookings.length === 0 ? (
            <div className="glass rounded-xl p-8 border border-[var(--border-subtle)] text-center">
              <Ticket className="w-9 h-9 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-[var(--text-tertiary)] text-[0.875rem]">
                No bookings yet. Explore events to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <Section
                title="Today"
                groups={today}
                userName={session.user?.name ?? undefined}
                userEmail={session.user?.email ?? undefined}
              />
              <Section
                title="Upcoming"
                groups={upcoming}
                userName={session.user?.name ?? undefined}
                userEmail={session.user?.email ?? undefined}
              />
              <Section
                title="Past"
                groups={past}
                userName={session.user?.name ?? undefined}
                userEmail={session.user?.email ?? undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
