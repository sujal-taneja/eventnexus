export default function EventsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="container-main">
        {/* Header skeleton */}
        <div className="mb-8 space-y-3">
          <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-5 w-96 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-white/5 rounded-lg animate-pulse" />
            <div className="w-36 h-10 bg-white/5 rounded-lg animate-pulse" />
            <div className="w-20 h-10 bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 bg-white/5 rounded-md animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-white/[0.02] animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-44 bg-white/5" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
                <div className="h-3 w-2/3 bg-white/5 rounded" />
                <div className="flex justify-between pt-2">
                  <div className="h-5 w-16 bg-white/5 rounded" />
                  <div className="h-5 w-20 bg-white/5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
