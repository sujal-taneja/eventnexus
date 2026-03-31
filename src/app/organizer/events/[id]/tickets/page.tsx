"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function EventTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/tickets`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || "Failed to create ticket tier");
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      router.refresh();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div>
        <Link href="/organizer/events" className="inline-flex items-center gap-2 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Events
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Create Ticket Tier</h1>
        <p className="text-[var(--text-secondary)]">
          Add pricing levels (like General Admission, VIP) and configure their inventory capacity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 sm:p-8 space-y-6">
           {error && (
             <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
               {error}
             </div>
           )}

           {success && (
             <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4" />
               Ticket tier added successfully! You can add another one or return to your events.
             </div>
           )}

           <div className="space-y-2">
             <label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)]">Tier Name</label>
             <input
               id="name"
               name="name"
               type="text"
               required
               placeholder="e.g. Early Bird, VIP Access"
               className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
             />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="price" className="text-sm font-medium text-[var(--text-primary)]">Price (₹)</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 1499"
                  className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="capacity" className="text-sm font-medium text-[var(--text-primary)]">Total Seats (Capacity)</label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500"
                  className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
           </div>
        </div>

        <div className="flex justify-end gap-4">
           <Link href="/organizer/events" className="btn-secondary py-2.5 px-6">
             Done Setup
           </Link>
           <button
             type="submit"
             disabled={loading}
             className="btn-primary py-2.5 px-6 inline-flex items-center gap-2"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
             {loading ? "Adding..." : "Add Ticket Tier"}
           </button>
        </div>
      </form>
    </div>
  );
}
