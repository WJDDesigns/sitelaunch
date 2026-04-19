import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-8 space-y-6">
        <SkeletonText className="h-7 w-36 mx-auto" />
        <SkeletonText className="h-3 w-48 mx-auto" />
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <SkeletonText className="h-2.5 w-20" />
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
        </div>
        <SkeletonBlock className="h-12 w-full !rounded-xl" />
      </div>
    </div>
  );
}
