import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

function SkeletonPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-36 mb-2" />
        <SkeletonText className="h-4 w-72" />
      </header>

      {/* Logo upload */}
      <SkeletonPanel>
        <SkeletonText className="h-4 w-20" />
        <div className="flex items-center gap-4">
          <SkeletonBlock className="w-20 h-20 !rounded-2xl" />
          <div className="space-y-2">
            <SkeletonText className="h-3 w-48" />
            <SkeletonBlock className="h-9 w-28 !rounded-lg" />
          </div>
        </div>
      </SkeletonPanel>

      {/* Workspace branding */}
      <SkeletonPanel>
        <SkeletonText className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonText className="h-2.5 w-24" />
            <SkeletonBlock className="h-10 w-full !rounded-xl" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-2.5 w-24" />
            <SkeletonBlock className="h-10 w-full !rounded-xl" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-2.5 w-28" />
            <SkeletonBlock className="h-10 w-full !rounded-xl" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-2.5 w-28" />
            <SkeletonBlock className="h-10 w-full !rounded-xl" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-20 !rounded-lg" />
      </SkeletonPanel>

      {/* Custom domain */}
      <SkeletonPanel>
        <SkeletonText className="h-5 w-36" />
        <SkeletonText className="h-3 w-80" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 flex-1 !rounded-xl" />
          <SkeletonBlock className="h-10 w-20 !rounded-lg" />
        </div>
      </SkeletonPanel>

      {/* Current plan */}
      <SkeletonPanel>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-28" />
            <SkeletonText className="h-3 w-48" />
          </div>
          <SkeletonBlock className="h-9 w-24 !rounded-lg" />
        </div>
      </SkeletonPanel>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPanel key={i}>
            <SkeletonText className="h-5 w-24" />
            <SkeletonText className="h-8 w-20" />
            <div className="space-y-2 pt-2">
              <SkeletonText className="h-2.5 w-full" />
              <SkeletonText className="h-2.5 w-3/4" />
              <SkeletonText className="h-2.5 w-5/6" />
              <SkeletonText className="h-2.5 w-2/3" />
            </div>
            <SkeletonBlock className="h-10 w-full !rounded-lg" />
          </SkeletonPanel>
        ))}
      </div>
    </div>
  );
}
