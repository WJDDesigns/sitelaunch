import { SkeletonBlock, SkeletonText, SkeletonBadge } from "@/components/Skeleton";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant/[0.06] last:border-b-0">
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonText className="h-3.5 w-32" />
        <SkeletonText className="h-2.5 w-48" />
      </div>
      <SkeletonBadge className="h-6 w-20 shrink-0" />
      <SkeletonText className="h-3 w-20 shrink-0" />
      <SkeletonBlock className="w-7 h-7 !rounded-md shrink-0" />
    </div>
  );
}

export default function EntriesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-40 mb-2" />
        <SkeletonText className="h-4 w-72" />
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-10 w-64 !rounded-xl" />
        <SkeletonBlock className="h-10 w-36 !rounded-xl" />
        <div className="flex-1" />
        <SkeletonBlock className="h-10 w-28 !rounded-xl" />
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-outline-variant/[0.06]">
          <SkeletonText className="h-2.5 w-14 flex-1" />
          <SkeletonText className="h-2.5 w-16 shrink-0" />
          <SkeletonText className="h-2.5 w-16 shrink-0" />
          <div className="w-7 shrink-0" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
