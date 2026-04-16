"use client";

import { useSearchParams } from "next/navigation";
import OAuthButtons from "@/components/OAuthButtons";

export default function OAuthSignup() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const nextUrl = searchParams.get("next") || (planParam ? `/checkout?plan=${planParam}` : undefined);

  return (
    <div className="gradient-border rounded-2xl">
      <div className="glass-panel-strong noise-overlay rounded-2xl p-6">
        <OAuthButtons redirectTo={nextUrl} mode="signup" />
      </div>
    </div>
  );
}
