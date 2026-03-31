import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Event Categories — EventNexus" };
export const revalidate = 60;

const CATEGORY_META: Record<string, { description: string }> = {
  Tech: { description: "AI summits, hackathons, developer conferences, and innovation expos." },
  Music: { description: "Live concerts, orchestra nights, electronic festivals, and genre showcases." },
  Gaming: { description: "Esports tournaments, LAN parties, game launches, and retro events." },
  Anime: { description: "Cosplay conventions, fan gatherings, manga workshops, and fan art shows." },
  Food: { description: "Culinary festivals, tasting menus, cooking workshops, and food championships." },
  Business: { description: "Startup pitches, networking dinners, VC summits, and founder conferences." },
};

export default async function CategoriesPage() {
  // Count events per category
  const counts = await prisma.event.groupBy({
    by: ["category"],
    where: { isActive: true },
    _count: { id: true },
  });

  const categories = counts.map((c) => ({
    name: c.category,
    count: c._count.id,
    ...(CATEGORY_META[c.category] ?? { description: "Explore events in this category." }),
  }));

  return (
    <div className="min-h-screen pt-20 pb-16">
      <section>
        <div className="container-main py-8 md:py-10">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-normal mb-2">Browse</p>
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--text-primary)] mb-2">
            Event Categories
          </h1>
          <p className="text-[0.9375rem] text-[var(--text-tertiary)] max-w-lg">
            Find events that match your interests. Every category is a gateway
            to a different kind of experience.
          </p>
        </div>
      </section>

      {/* Use a real <hr> so spacing/margins are consistent across themes. */}
      <hr className="border-0 border-t border-[var(--border-subtle)] my-6" />

      <div className="container-main py-8 md:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/events?category=${encodeURIComponent(cat.name)}`}
              className="group h-full flex flex-col p-5 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-full border border-[var(--border-subtle)]">
                  {cat.count} event{cat.count !== 1 ? "s" : ""}
                </span>
              </div>
              <h2 className="font-semibold text-[var(--text-primary)] mb-1.5">
                {cat.name}
              </h2>
              <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed mb-3">
                {cat.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors mt-auto">
                Browse {cat.name} events{" "}
                <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/events" className="btn-secondary">
            View all events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
