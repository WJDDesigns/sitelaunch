import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonIcon } from "@/components/Skeleton";

function SkeletonStatCard() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5">
      <div className="flex items-center justify-between mb-3">
        <SkeletonText className="h-2.5 w-24" />
        <SkeletonBlock className="w-6 h-6 !rounded" />
      </div>
      <SkeletonText className="h-7 w-14" />
    </div>
  );
}

function SkeletonActivityRow() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-outline-variant/[0.06] last:border-b-0">
      <SkeletonCircle className="w-8 h-8 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonText className="h-3 w-56" />
        <SkeletonText className="h-2.5 w-20" />
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-44 mb-2" />
        <SkeletonText className="h-4 w-56" />
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5 space-y-3">
            <SkeletonIcon className="w-10 h-10" />
            <SkeletonText className="h-4 w-28" />
            <SkeletonText className="h-2.5 w-40" />
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
        <SkeletonText className="h-5 w-32 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonActivityRow key={i} />
        ))}
      </div>
    </div>
  );
}
