"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import RocketAnimation from "@/components/RocketAnimation";
import Link from "next/link";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <SiteLaunchLogo className="h-14 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="gradient-border rounded-2xl">
          <div className="relative glass-panel-strong noise-overlay rounded-2xl p-8">
            <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight text-center">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant/70 text-center">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {status === "sent" ? (
              <div className="mt-6 rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm text-primary text-center">
                <i className="fa-solid fa-envelope text-lg mb-2 block" />
                Check your inbox. We&apos;ve sent a password reset link to{" "}
                <span className="font-medium">{email}</span>.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1.5 ${INPUT_CLS}`}
                    placeholder="you@example.com"
                  />
                </label>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-60 transition-all duration-500 relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    {status === "sending" ? "Sending..." : "Send reset link"}
                  </span>
                </button>

                {status === "error" && (
                  <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                    {errorMsg}
                  </div>
                )}
              </form>
            )}

            <p className="mt-6 text-center text-xs text-on-surface-variant/50">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
