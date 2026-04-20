"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-sm text-on-surface-variant">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-primary hover:underline">Try again</button>
    </div>
  );
}
