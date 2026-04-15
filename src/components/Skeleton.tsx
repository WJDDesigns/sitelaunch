/**
 * Reusable skeleton primitives for shimmer loading states.
 * Compose these to build page-specific skeleton screens that
 * mirror the actual layout so the transition feels seamless.
 */

function pulse() {
  return "animate-pulse bg-on-surface/[0.06] rounded-lg";
}

/** Rectangular block — set width/height via className */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${pulse()} ${className}`} />;
}

/** Single line of text */
export function SkeletonText({ className = "h-3 w-32" }: { className?: string }) {
  return <div className={`${pulse()} ${className}`} />;
}

/** Circle (avatar / icon) */
export function SkeletonCircle({ className = "w-10 h-10" }: { className?: string }) {
  return <div className={`${pulse()} !rounded-full ${className}`} />;
}

/** Rounded square (icon container) */
export function SkeletonIcon({ className = "w-12 h-12" }: { className?: string }) {
  return <div className={`${pulse()} !rounded-xl ${className}`} />;
}

/** Badge pill shape */
export function SkeletonBadge({ className = "h-5 w-16" }: { className?: string }) {
  return <div className={`${pulse()} !rounded-full ${className}`} />;
}
