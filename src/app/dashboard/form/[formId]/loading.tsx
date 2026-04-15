import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function FormEditorLoading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-outline-variant/10 bg-surface-container-low/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkeletonText className="h-3 w-16" />
          <SkeletonBlock className="h-8 w-40 !rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-20 !rounded-lg" />
          <SkeletonText className="h-3 w-44 hidden md:block" />
          <SkeletonBlock className="h-8 w-24 !rounded-lg" />
          <SkeletonBlock className="h-8 w-16 !rounded-lg" />
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel */}
        <div className="w-64 shrink-0 border-r border-outline-variant/10 p-4 space-y-3">
          <SkeletonText className="h-3 w-20 mb-4" />
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full !rounded-lg" />
          ))}
        </div>

        {/* Center canvas */}
        <div className="flex-1 p-8 space-y-4">
          <SkeletonText className="h-6 w-48 mb-2" />
          <SkeletonText className="h-3 w-64 mb-6" />
          <SkeletonBlock className="h-16 w-full !rounded-xl" />
          <SkeletonBlock className="h-16 w-full !rounded-xl" />
          <SkeletonBlock className="h-12 w-40 !rounded-xl mx-auto" />
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-outline-variant/10 p-4 space-y-4">
          <SkeletonText className="h-3 w-20" />
          <SkeletonBlock className="h-24 w-full !rounded-xl" />
          <SkeletonText className="h-3 w-16 mt-4" />
          <SkeletonText className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}
