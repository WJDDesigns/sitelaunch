"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import OAuthButtons from "@/components/OAuthButtons";
import RocketAnimation from "@/components/RocketAnimation";
import Link from "next/link";

type Mode = "password" | "magic";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    // Check if user needs MFA verification
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const aal = aalData?.currentLevel;
    const factors = await supabase.auth.mfa.listFactors();
    const hasVerifiedFactors = (factors.data?.totp ?? []).some(f => f.status === "verified")
      || (factors.data?.phone ?? []).some(f => f.status === "verified");

    if (hasVerifiedFactors && aal !== "aal2") {
      // User has MFA enrolled but hasn't verified yet — redirect to challenge
      router.push(`/auth/mfa/challenge?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    router.push(nextUrl);
    router.refresh();
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-end justify-center px-6 pb-[8vh] pt-[45vh] relative overflow-hidden">
      {/* Rocket animation background */}
      <RocketAnimation />
      {/* Soft radial wash for depth */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <SiteLaunchLogo className="h-14 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="gradient-border rounded-2xl">
          <div className="relative glass-panel-strong noise-overlay rounded-2xl p-8">
            <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight text-center">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant/70 text-center">
              {mode === "password" ? "Sign in with your email and password." : "We'll email you a magic link."}
            </p>

            {/* OAuth Providers */}
            <div className="mt-6">
              <OAuthButtons redirectTo={nextUrl !== "/dashboard" ? nextUrl : undefined} mode="signin" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-outline-variant/10" />
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold">or</span>
              <div className="flex-1 h-px bg-outline-variant/10" />
            </div>

            {status === "sent" ? (
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm text-primary text-center">
                <i className="fa-solid fa-envelope text-lg mb-2 block" />
                Check your inbox. The link will bring you right back here.
              </div>
            ) : (
              <form
                onSubmit={mode === "password" ? handlePassword : handleMagic}
                className="space-y-4"
              >
                <label className="block">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1.5 ${INPUT_CLS}`}
                    placeholder="you@example.com"
                  />
                </label>

                {mode === "password" && (
                  <label className="block">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Password</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`mt-1.5 ${INPUT_CLS}`}
                    />
                  </label>
                )}

                {mode === "password" && (
                  <div className="flex justify-end -mt-1">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-on-surface-variant/50 hover:text-primary transition-colors duration-300"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-60 transition-all duration-500 relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    {status === "sending"
                      ? (mode === "password" ? "Signing in..." : "Sending...")
                      : (mode === "password" ? "Sign in" : "Send magic link")}
                  </span>
                </button>

                {status === "error" && (
                  <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "password" ? "magic" : "password");
                    setStatus("idle");
                    setErrorMsg(null);
                  }}
                  className="w-full text-center text-xs text-on-surface-variant/50 hover:text-primary transition-colors duration-300"
                >
                  {mode === "password" ? "Use magic link instead" : "Use password instead"}
                </button>
              </form>
            )}
            <p className="mt-6 text-center text-xs text-on-surface-variant/50">
              Don&apos;t have an account?{" "}
              <Link
                href={nextUrl !== "/dashboard" ? `/signup?next=${encodeURIComponent(nextUrl)}` : "/signup"}
                className="font-medium text-primary hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
