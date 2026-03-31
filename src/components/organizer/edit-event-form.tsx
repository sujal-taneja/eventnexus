"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  eventId: string;
  initial: {
    title: string;
    description: string;
    datetimeLocal: string;
    location: string;
    imageUrl: string;
    category: string;
  };
};

export function EditEventForm({ eventId, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description"),
          date: fd.get("date"),
          location: fd.get("location"),
          imageUrl: fd.get("imageUrl"),
          category: fd.get("category"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      router.push("/organizer/events");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <div>
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-2 text-[0.8125rem] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Events
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
          Edit Event
        </h1>
        <p className="text-[var(--text-secondary)]">
          Update details — ticket tiers are managed separately.
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
            <label htmlFor="title" className="text-sm font-medium text-[var(--text-primary)]">
              Event Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={initial.title}
              className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-[var(--text-primary)]">
                Date & Time
              </label>
              <input
                id="date"
                name="date"
                type="datetime-local"
                required
                defaultValue={initial.datetimeLocal}
                className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium text-[var(--text-primary)]">
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={initial.category}
                className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
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
            <label htmlFor="location" className="text-sm font-medium text-[var(--text-primary)]">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              defaultValue={initial.location}
              className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="imageUrl" className="text-sm font-medium text-[var(--text-primary)]">
              Cover Image URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              required
              defaultValue={initial.imageUrl}
              className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              required
              defaultValue={initial.description}
              className="w-full bg-black/40 border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-hover)] transition-colors resize-none"
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
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
