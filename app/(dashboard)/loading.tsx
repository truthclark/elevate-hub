// Shimmer skeleton while server pages fetch — no more blank white flash.
export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="skeleton mb-2 h-3 w-32" />
          <div className="skeleton h-7 w-48" />
        </div>
        <div className="skeleton h-9 w-40" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton mb-4 h-10 w-10" />
            <div className="skeleton mb-2 h-3 w-24" />
            <div className="skeleton h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="skeleton mb-4 h-4 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton mb-2.5 h-10 w-full" />
          ))}
        </div>
        <div className="card p-5">
          <div className="skeleton mb-4 h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton mb-2.5 h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
