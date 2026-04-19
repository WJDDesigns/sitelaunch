import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonBadge } from "@/components/Skeleton";

function SkeletonMemberRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant/[0.06] last:border-b-0">
      <SkeletonCircle className="w-9 h-9" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonText className="h-3.5 w-28" />
        <SkeletonText className="h-2.5 w-40" />
      </div>
      <SkeletonBadge className="h-6 w-16 shrink-0" />
      <SkeletonBlock className="w-7 h-7 !rounded-md shrink-0" />
    </div>
  );
}

export default function TeamLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-32 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </header>

      {/* Team list */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10">
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/[0.06]">
          <SkeletonText className="h-2.5 w-20" />
          <SkeletonBlock className="h-8 w-28 !rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMemberRow key={i} />
        ))}
      </div>
    </div>
  );
}
