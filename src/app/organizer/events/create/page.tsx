"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        body: formData, // Sending as FormData so we can handle file uploads (or just raw data) easily in API
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || "Failed to create event");
      }

      const data = await res.json();
      router.push(`/organizer/events/${data.event.id}/tickets`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Create New Event</h1>
        <p className="text-[var(--text-secondary)]">
          Fill in the details below to publish a new event. You can add ticket tiers in the next step.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 sm:p-8 space-y-6">
           {error && (
             <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
               {error}
             </div>
           )}

           <div className="space-y-2">
             <label htmlFor="title" className="text-sm font-medium text-[var(--text-primary)]">Event Title</label>
             <input
               id="title"
               name="title"
               type="text"
               required
               placeholder="e.g. Summer Music Festival 2026"
               className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
             />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="space-y-2 sm:col-span-2">
               <label htmlFor="date" className="text-sm font-medium text-[var(--text-primary)]">Date & Time</label>
               <input
                 id="date"
                 name="date"
                 type="datetime-local"
                 required
                 className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
               />
             </div>
             <div className="space-y-2">
               <label htmlFor="timeZone" className="text-sm font-medium text-[var(--text-primary)]">Event timezone</label>
               <select
                 id="timeZone"
                 name="timeZone"
                 required
                 defaultValue="Asia/Kolkata"
                 className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors text-[0.875rem]"
               >
                 <option value="Asia/Kolkata">India (IST)</option>
                 <option value="Europe/London">UK (London)</option>
                 <option value="Europe/Amsterdam">Netherlands (Amsterdam)</option>
                 <option value="America/New_York">US Eastern</option>
                 <option value="America/Los_Angeles">US Pacific</option>
               </select>
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label htmlFor="category" className="text-sm font-medium text-[var(--text-primary)]">Category</label>
               <select
                 id="category"
                 name="category"
                 required
                 className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
               >
                 {["Tech", "Music", "Gaming", "Anime", "Food", "Business"].map((c) => (
                   <option key={c} value={c}>
                     {c}
                   </option>
                 ))}
               </select>
             </div>
           </div>

           <div className="space-y-2">
             <label htmlFor="location" className="text-sm font-medium text-[var(--text-primary)]">Location</label>
             <input
               id="location"
               name="location"
               type="text"
               required
               placeholder="e.g. Jawaharlal Nehru Stadium, New Delhi"
               className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
             />
           </div>

           <div className="space-y-2">
             <label htmlFor="imageUrl" className="text-sm font-medium text-[var(--text-primary)]">Cover Image URL</label>
             <input
               id="imageUrl"
               name="imageUrl"
               type="url"
               required
               placeholder="https://images.unsplash.com/..."
               className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors"
             />
           </div>

           <div className="space-y-2">
             <label htmlFor="description" className="text-sm font-medium text-[var(--text-primary)]">Description</label>
             <textarea
               id="description"
               name="description"
               rows={5}
               required
               placeholder="Describe your event..."
               className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/20 transition-colors resize-none"
             />
           </div>
        </div>

        <div className="flex justify-end gap-4">
           <Link href="/organizer/events" className="btn-secondary py-2.5 px-6">
             Cancel
           </Link>
           <button
             type="submit"
             disabled={loading}
             className="btn-primary py-2.5 px-6 inline-flex items-center gap-2"
           >
             {loading && <Loader2 className="w-4 h-4 animate-spin" />}
             {loading ? "Creating..." : "Create Event"}
           </button>
        </div>
      </form>
    </div>
  );
}
