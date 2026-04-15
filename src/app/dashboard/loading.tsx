import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonIcon } from "@/components/Skeleton";

function SkeletonStatCard() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5">
      <SkeletonText className="h-2.5 w-20 mb-3" />
      <SkeletonText className="h-7 w-16" />
    </div>
  );
}

function SkeletonQuickAction() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5 space-y-3">
      <SkeletonIcon className="w-10 h-10" />
      <SkeletonText className="h-4 w-24" />
      <SkeletonText className="h-2.5 w-36" />
    </div>
  );
}

function SkeletonPartnerRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/[0.06] last:border-b-0">
      <SkeletonCircle className="w-8 h-8" />
      <div className="flex-1 space-y-1.5">
        <SkeletonText className="h-3.5 w-28" />
        <SkeletonText className="h-2.5 w-40" />
      </div>
      <SkeletonText className="h-3 w-14" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-48 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonQuickAction />
        <SkeletonQuickAction />
        <SkeletonQuickAction />
        <SkeletonQuickAction />
      </div>

      {/* Partners list */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/[0.06]">
          <SkeletonText className="h-5 w-28" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPartnerRow key={i} />
        ))}
      </div>
    </div>
  );
}
