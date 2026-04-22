import { SkeletonBlock, SkeletonText, SkeletonIcon } from "@/components/Skeleton";

function SkeletonFormCard() {
  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <SkeletonIcon className="w-12 h-12" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonText className="h-5 w-36" />
              </div>
              <SkeletonText className="h-2.5 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SkeletonBlock className="w-9 h-9 !rounded-lg" />
            <SkeletonBlock className="w-16 h-9 !rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-outline-variant/[0.06]">
          <SkeletonText className="h-2.5 w-16" />
          <SkeletonText className="h-2.5 w-16" />
          <SkeletonText className="h-2.5 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function FormsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div>
            <SkeletonText className="h-8 w-28 mb-2" />
            <SkeletonText className="h-4 w-72" />
          </div>
          <SkeletonBlock className="h-10 w-28 !rounded-xl" />
        </div>
      </header>

      {/* Landing mode toggle */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] p-5 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <SkeletonText className="h-4 w-36" />
            <SkeletonText className="h-3 w-64" />
          </div>
          <SkeletonBlock className="h-9 w-52 !rounded-lg" />
        </div>
      </div>

      {/* Form cards */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonFormCard key={i} />
        ))}
      </div>
    </div>
  );
}
