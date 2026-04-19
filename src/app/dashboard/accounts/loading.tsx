import { SkeletonBlock, SkeletonText, SkeletonCircle } from "@/components/Skeleton";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant/[0.06] last:border-b-0">
      <SkeletonCircle className="w-8 h-8" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <SkeletonText className="h-3.5 w-28" />
        <SkeletonText className="h-2.5 w-40" />
      </div>
      <SkeletonText className="h-3 w-20 shrink-0" />
      <SkeletonBlock className="w-7 h-7 !rounded-md shrink-0" />
    </div>
  );
}

export default function AccountsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-44 mb-2" />
        <SkeletonText className="h-4 w-72" />
      </header>

      {/* Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-outline-variant/[0.06]">
          <SkeletonText className="h-2.5 w-14 flex-1" />
          <SkeletonText className="h-2.5 w-16 shrink-0" />
          <div className="w-7 shrink-0" />
        </div>
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
