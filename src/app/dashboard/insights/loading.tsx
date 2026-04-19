import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

function SkeletonWidget() {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5 space-y-4">
      <SkeletonText className="h-4 w-28" />
      <SkeletonBlock className="h-32 w-full !rounded-xl" />
    </div>
  );
}

export default function InsightsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-36 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </header>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonWidget />
        <SkeletonWidget />
        <SkeletonWidget />
        <SkeletonWidget />
      </div>
    </div>
  );
}
