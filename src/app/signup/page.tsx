import { Suspense } from "react";
import SignupForm from "./SignupForm";
import OAuthSignup from "./OAuthSignup";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import Link from "next/link";

export default function SignupPage() {
  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(
    /:\d+$/,
    "",
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      {/* Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] bg-tertiary/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-lg space-y-6 animate-scale-in">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-2">
          <SiteLaunchLogo className="h-14 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight font-headline text-on-surface">
            Start with SiteLaunch
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
