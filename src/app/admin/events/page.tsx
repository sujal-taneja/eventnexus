import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { toggleEventStatus } from "./actions";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organizer: { select: { name: true, email: true } },
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Platform Events</h1>
        <p className="text-[var(--text-secondary)]">
          Moderate events created by organizers across the platform.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                 <tr>
                   <th className="px-6 py-4 font-medium min-w-[300px]">Event Listing</th>
                   <th className="px-6 py-4 font-medium">Organizer</th>
                   <th className="px-6 py-4 font-medium text-center">Sales (Tickets)</th>
                   <th className="px-6 py-4 font-medium text-right">Moderation Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                 {events.map((e) => (
                   <tr key={e.id} className="hover:bg-white/[0.02] transition-colors relative">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-4">
                         <div className="relative w-16 h-12 rounded overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                           <Image src={e.imageUrl} alt={e.title} fill className="object-cover opacity-80" />
                         </div>
                         <div>
                           <div className="font-medium text-white flex items-center gap-2">
                             {e.title}
                             {!e.isActive && <span className="text-[10px] uppercase font-bold text-red-400 border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded">Suspended</span>}
                           </div>
                           <div className="text-[0.8125rem] text-[var(--text-tertiary)] flex gap-2">
                             <span>{new Date(e.date).toLocaleDateString()}</span>
                             <span>&bull;</span>
                             <span>{e.category}</span>
                           </div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-[var(--text-secondary)]">
                       <div className="font-medium text-[var(--text-primary)]">{e.organizer.name || "N/A"}</div>
                       <div className="text-[0.8125rem]">{e.organizer.email}</div>
                     </td>
                     <td className="px-6 py-4 text-center">
                       {e._count.bookings.toLocaleString("en-IN")}
                     </td>
                     <td className="px-6 py-4 text-right">
                       <form action={async () => {
                          "use server";
                          await toggleEventStatus(e.id, !e.isActive);
                       }}>
                         <button
                           type="submit"
                           className={`px-3 py-1.5 rounded text-[0.8125rem] font-medium transition-colors border ${
                             e.isActive 
                              ? "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 hover:border-red-500/20" 
                              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-500/20"
                           }`}
                         >
                           {e.isActive ? "Suspend Event" : "Enable Event"}
                         </button>
                       </form>
                     </td>
                   </tr>
                 ))}
              </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
