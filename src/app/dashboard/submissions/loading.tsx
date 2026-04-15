import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonBadge } from "@/components/Skeleton";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant/[0.06] last:border-b-0">
      {/* Checkbox */}
      <SkeletonBlock className="w-4 h-4 shrink-0 !rounded" />
      {/* Client name + email */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonText className="h-3.5 w-28" />
        <SkeletonText className="h-2.5 w-36" />
      </div>
      {/* Partner */}
      <div className="flex items-center gap-2 w-40 shrink-0">
        <SkeletonCircle className="w-8 h-8" />
        <SkeletonText className="h-3 w-20" />
      </div>
      {/* Status */}
      <div className="w-28 shrink-0">
        <SkeletonBadge className="h-6 w-20" />
      </div>
      {/* Date */}
      <SkeletonText className="h-3 w-20 shrink-0" />
      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <SkeletonBlock className="w-7 h-7 !rounded-md" />
        <SkeletonBlock className="w-7 h-7 !rounded-md" />
        <SkeletonText className="h-3.5 w-14" />
      </div>
    </div>
  );
}

export default function SubmissionsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-56 mb-2" />
        <SkeletonText className="h-4 w-80" />
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-10 w-64 !rounded-xl" />
        <SkeletonBlock className="h-10 w-36 !rounded-xl" />
        <SkeletonBlock className="h-10 w-36 !rounded-xl" />
        <SkeletonBlock className="h-10 w-32 !rounded-xl" />
        <div className="flex-1" />
        <SkeletonBlock className="h-10 w-28 !rounded-xl" />
      </div>

      {/* Count */}
      <SkeletonText className="h-3 w-24" />

      {/* Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-outline-variant/[0.06]">
          <SkeletonBlock className="w-4 h-4 shrink-0 !rounded" />
          <SkeletonText className="h-2.5 w-14 flex-1" />
          <SkeletonText className="h-2.5 w-16 w-40 shrink-0" />
          <SkeletonText className="h-2.5 w-14 w-28 shrink-0" />
          <SkeletonText className="h-2.5 w-16 shrink-0" />
          <div className="w-24 shrink-0" />
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
