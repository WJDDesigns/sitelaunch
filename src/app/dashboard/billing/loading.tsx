import { SkeletonBlock, SkeletonText } from "@/components/Skeleton";

function SkeletonPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6 space-y-4">
      {children}
    </div>
  );
}

function SkeletonInvoiceRow() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/[0.06] last:border-b-0">
      <div className="flex items-center gap-4">
        <SkeletonText className="h-3.5 w-16" />
        <SkeletonText className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-5 w-14 !rounded-full" />
        <SkeletonText className="h-3 w-10" />
      </div>
    </div>
  );
}

export default function BillingLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header>
        <SkeletonText className="h-8 w-28 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </header>

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
            </div>
            <SkeletonBlock className="h-10 w-full !rounded-lg" />
          </SkeletonPanel>
        ))}
      </div>

      {/* Invoices */}
      <SkeletonPanel>
        <SkeletonText className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonInvoiceRow key={i} />
        ))}
      </SkeletonPanel>
    </div>
  );
}
