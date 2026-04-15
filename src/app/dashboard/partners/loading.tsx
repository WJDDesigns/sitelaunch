import { SkeletonBlock, SkeletonText, SkeletonCircle } from "@/components/Skeleton";

function SkeletonPartnerCard() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkeletonCircle className="w-12 h-12" />
          <div className="space-y-1.5">
            <SkeletonText className="h-5 w-32" />
            <SkeletonText className="h-2.5 w-44" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-8 h-8 !rounded-lg" />
          <SkeletonBlock className="w-8 h-8 !rounded-lg" />
          <SkeletonBlock className="w-20 h-8 !rounded-lg" />
        </div>
      </div>
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-outline-variant/[0.06]">
        <SkeletonText className="h-2.5 w-20" />
        <SkeletonText className="h-2.5 w-24" />
        <SkeletonText className="h-2.5 w-20" />
      </div>
    </div>
  );
}

export default function PartnersLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div>
            <SkeletonText className="h-8 w-32 mb-2" />
            <SkeletonText className="h-4 w-64" />
          </div>
          <SkeletonBlock className="h-10 w-32 !rounded-xl" />
        </div>
      </header>

      {/* Invite form */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
        <SkeletonText className="h-5 w-32 mb-3" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 flex-1 !rounded-xl" />
          <SkeletonBlock className="h-10 w-28 !rounded-lg" />
        </div>
      </div>

      {/* Partner cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPartnerCard key={i} />
        ))}
      </div>
    </div>
  );
}
