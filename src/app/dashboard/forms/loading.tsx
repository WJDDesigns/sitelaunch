import { SkeletonBlock, SkeletonText, SkeletonBadge } from "@/components/Skeleton";

function SkeletonFormCard() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonText className="h-4 w-32" />
        <SkeletonBadge className="h-5 w-16" />
      </div>
      <SkeletonText className="h-2.5 w-48" />
      <SkeletonText className="h-2.5 w-24" />
      <div className="flex items-center gap-2 pt-2">
        <SkeletonBlock className="h-8 w-20 !rounded-lg" />
        <SkeletonBlock className="h-8 w-20 !rounded-lg" />
      </div>
    </div>
  );
}

export default function FormsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-32 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </header>

      {/* Forms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonFormCard key={i} />
        ))}
      </div>
    </div>
  );
}
