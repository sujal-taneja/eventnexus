import { prisma } from "@/lib/prisma";
import { IndianRupee, Users, Ticket, CalendarDays } from "lucide-react";

export default async function AdminDashboardPage() {
  // Aggregate global platform stats
  const [totalUsers, totalEvents, bookingsAgg] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.booking.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { totalAmount: true, quantity: true },
      _count: true,
    }),
  ]);

  const platformRevenue = bookingsAgg._sum.totalAmount || 0;
  const platformTicketsSold = bookingsAgg._sum.quantity || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Platform Overview</h1>
        <p className="text-[var(--text-secondary)]">
          Global metrics and system health monitoring for EventNexus.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-red-500/10 border">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-[0.875rem]">Total Platform Revenue</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            ₹{platformRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/10 border">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-[0.875rem]">Total Users</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            {totalUsers.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/10 border">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-[0.875rem]">Total Events Hosting</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            {totalEvents.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/10 border">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] mb-4">
            <Ticket className="w-5 h-5 text-amber-400" />
            <h3 className="font-medium text-[0.875rem]">Global Tickets Sold</h3>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            {platformTicketsSold.toLocaleString("en-IN")}
          </div>
        </div>
      </div>
      
      {/* Chart Stub */}
      <div className="glass-card p-8 min-h-[400px] flex items-center justify-center border-dashed border-red-500/10">
        <div className="text-center">
           <p className="text-[var(--text-tertiary)]">Global analytics charts / Time-series graphs will render here using Recharts.</p>
        </div>
      </div>
    </div>
  );
}
