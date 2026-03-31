import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Calendar, Ticket, IndianRupee } from "lucide-react";
import { OrganizerRevenueChart } from "@/components/organizer/revenue-chart";
import type { RevenueChartPoint } from "@/components/organizer/revenue-chart";

function buildLast30DaysRevenue(
  rows: { totalAmount: number; createdAt: Date }[]
): RevenueChartPoint[] {
  // Use UTC keys so they match createdAt.toISOString() (UTC).
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - 29);
  cursor.setUTCHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let i = 0; i < 30; i++) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const sums = new Map<string, number>();
  for (const k of keys) sums.set(k, 0);

  for (const r of rows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    if (sums.has(day)) sums.set(day, (sums.get(day) ?? 0) + r.totalAmount);
  }

  return keys.map((day) => ({
    day: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
    revenue: Math.round(sums.get(day) ?? 0),
  }));
}

export default async function OrganizerDashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const events = await prisma.event.findMany({
    where: { organizerId: userId },
    select: { id: true, _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
  });

  const eventIds = events.map((e) => e.id);

  const bookingsAgg = await prisma.booking.aggregate({
    where: { eventId: { in: eventIds }, status: "CONFIRMED" },
    _sum: { totalAmount: true, quantity: true },
    _count: true,
  });

  const thirtyAgo = new Date();
  thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 29);
  thirtyAgo.setUTCHours(0, 0, 0, 0);

  const recentBookings = await prisma.booking.findMany({
    where: {
      eventId: { in: eventIds },
      status: "CONFIRMED",
      createdAt: { gte: thirtyAgo },
    },
    select: { totalAmount: true, createdAt: true },
  });

  const totalRevenue = bookingsAgg._sum.totalAmount || 0;
  const totalTicketsSold = bookingsAgg._sum.quantity || 0;
  const activeEventsCount = events.length;
  const chartData = buildLast30DaysRevenue(recentBookings);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
          Overview
        </h1>
        <p className="text-[var(--text-secondary)]">
          Welcome back. Here is what is happening with your events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <IndianRupee className="w-5 h-5" />
            <h3 className="font-medium text-[0.875rem]">Total Revenue</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <Ticket className="w-5 h-5" />
            <h3 className="font-medium text-[0.875rem]">Tickets Sold</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {totalTicketsSold.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <Calendar className="w-5 h-5" />
            <h3 className="font-medium text-[0.875rem]">Active Events</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {activeEventsCount}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <h2 className="text-[0.8125rem] font-semibold text-[var(--text-muted)] uppercase tracking-tight mb-4">
          Revenue (last 30 days)
        </h2>
        <OrganizerRevenueChart data={chartData} />
      </div>
    </div>
  );
}
