import { Suspense } from "react";
import SignupForm from "./SignupForm";
import OAuthSignup from "./OAuthSignup";
import VantaBackground from "@/components/VantaBackground";
import AuthHeader from "@/components/AuthHeader";
import Link from "next/link";

export default function SignupPage() {
  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(
    /:\d+$/,
    "",
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-16 pb-8 relative overflow-hidden bg-surface">
      <VantaBackground />
      <AuthHeader />

      <div className="relative z-10 w-full max-w-lg space-y-6 animate-scale-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight font-headline text-on-surface">
            Start with linqme
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Free forever for one submission a month. Upgrade whenever you&apos;re ready.
          </p>
        </div>

        <Suspense>
          <OAuthSignup />
        </Suspense>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-outline-variant/10" />
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold">or sign up with email</span>
          <div className="flex-1 h-px bg-outline-variant/10" />
        </div>

        <SignupForm rootHost={rootHost} />
      </div>
    </main>
  );
}
