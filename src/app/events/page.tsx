import { searchEvents, getEventCategories, SortOption } from "@/lib/search";
import { EventCard } from "@/components/events/event-card";
import { EventsFilters } from "@/components/search/events-filters";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    city?: string;
  }>;
}

export default async function EventsDiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = params.q ?? "";
  const category = params.category ?? "all";
  const city = params.city ?? "";
  const sort = (params.sort ?? "date_asc") as SortOption;
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;

  const [dbEvents, categories] = await Promise.all([
    searchEvents({
      q,
      category,
      sort,
      minPrice,
      maxPrice,
      ...(city.trim() ? { city: city.trim() } : {}),
    }),
    getEventCategories(),
  ]);

  const events = dbEvents.map((evt) => {
    const eventDate = new Date(evt.date);
    const lowestPrice =
      evt.tickets.length > 0
        ? Math.min(...evt.tickets.map((t) => t.price))
        : 0;
    const totalCapacity = evt.tickets.reduce((sum, t) => sum + t.capacity, 0);

    return {
      id: evt.id,
      title: evt.title,
      date: eventDate
        .toLocaleDateString("en-US", { month: "short", day: "numeric" })
        .toUpperCase(),
      time: eventDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      location: evt.location,
      imageUrl: evt.imageUrl ?? "",
      category: evt.category,
      price: lowestPrice,
      spotsLeft: totalCapacity,
      totalSpots: totalCapacity,
      organizer: evt.organizer.name ?? "Organizer",
    };
  });

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container-main">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-4xl font-semibold tracking-normal text-[var(--text-primary)] mb-2">
            {q ? `Results for "${q}"` : "Discover Events"}
          </h1>
          <p className="text-[1rem] text-[var(--text-secondary)] max-w-2xl">
            Find conferences, concerts, and meetups — fast search and filters so you land on the right
            event without digging through noise.
          </p>
        </div>

        {/* Filters: search bar, categories, sort, price */}
        <EventsFilters
          categories={categories}
          currentQ={q}
          currentCity={city}
          currentCategory={category}
          currentSort={sort}
          currentMinPrice={params.minPrice}
          currentMaxPrice={params.maxPrice}
          totalResults={events.length}
        />

        {/* Results grid */}
        {events.length === 0 ? (
          <div className="py-14 text-center glass rounded-xl border border-[var(--border-subtle)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">
              No events found
            </h3>
            <p className="text-[var(--text-tertiary)]">
              {q
                ? `Try a different search term or remove some filters.`
                : "Check back later or organize your own event."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
