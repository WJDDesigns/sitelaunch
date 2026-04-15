import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center gap-3 px-6 md:px-8 py-5 border-b border-on-surface/[0.04]">
        <SkeletonBlock className="w-10 h-10 !rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonText className="h-5 w-32" />
          <SkeletonText className="h-2 w-28" />
        </div>
      </header>

      {/* Content */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="space-y-5 flex flex-col items-center">
          <SkeletonText className="h-10 w-80 md:w-[28rem]" />
          <SkeletonText className="h-4 w-64 md:w-96" />
          <SkeletonText className="h-4 w-48 md:w-80" />
          <SkeletonBlock className="h-14 w-48 !rounded-xl mt-4" />
        </div>
      </section>
    </main>
  );
}
