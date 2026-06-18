/** Skeleton shown while the report's server flow runs (geocode → deals → AI). */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-7 p-6">
      <div className="bg-muted h-4 w-28 animate-pulse rounded" />
      <div className="bg-muted h-36 animate-pulse rounded-2xl" />
      <div className="bg-muted h-28 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-80 animate-pulse rounded-2xl" />
      <p className="text-muted-foreground text-center text-sm">מחשב הערכה — שולף עסקאות, מנתח ומסביר…</p>
    </main>
  );
}
