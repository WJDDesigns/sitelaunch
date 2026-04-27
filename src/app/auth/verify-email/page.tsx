"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import VantaBackground from "@/components/VantaBackground";
import AuthHeader from "@/components/AuthHeader";
import { resendVerificationAction } from "./actions";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  async function handleResend() {
    if (!email || cooldown) return;

    setStatus("sending");
    setErrorMsg(null);

    const result = await resendVerificationAction(email, plan || undefined);

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    setStatus("sent");

    // Prevent spamming — 60-second cooldown
    setCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setCooldown(false);
      setStatus("idle");
    }, 60_000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pt-16 pb-8 relative overflow-hidden bg-surface">
      <VantaBackground />
      <AuthHeader />

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className="gradient-border rounded-2xl">
          <div className="relative rounded-2xl p-8 bg-surface-container shadow-xl border border-outline-variant/10">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <i className="fa-solid fa-envelope-circle-check text-2xl text-primary" />
              </div>
            </div>

            <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight text-center">
              Check your email
            </h1>

            <p className="mt-3 text-sm text-on-surface-variant/70 text-center leading-relaxed">
              We sent a verification link to
              {email ? (
                <span className="block mt-1 font-medium text-on-surface">{email}</span>
              ) : (
                <span className="block mt-1 font-medium text-on-surface">your email address</span>
              )}
            </p>

            <div className="mt-6 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/10 p-4 space-y-2">
              <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                <i className="fa-solid fa-circle-info text-primary/60 mr-1.5" />
                Click the link in the email to verify your account{plan ? " and complete your plan setup" : " and access your dashboard"}. The link expires in 24 hours.
              </p>
              <p className="text-xs text-on-surface-variant/50 leading-relaxed">
                <i className="fa-solid fa-lightbulb text-on-surface-variant/30 mr-1.5" />
                Don&apos;t see it? Check your spam or junk folder.
              </p>
            </div>

            {/* Resend button */}
            <div className="mt-6 space-y-3">
              {status === "sent" ? (
                <div className="rounded-xl bg-tertiary/10 border border-tertiary/20 px-3 py-2.5 text-sm text-tertiary text-center">
                  <i className="fa-solid fa-check mr-1.5" />
                  Verification email resent successfully.
                </div>
              ) : status === "error" ? (
                <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                  {errorMsg}
                </div>
              ) : null}

              {email && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={status === "sending" || cooldown}
                  className="w-full rounded-xl border border-outline-variant/20 px-4 py-3 text-sm font-medium text-on-surface-variant hover:border-primary/30 hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {status === "sending" ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1.5" />
                      Sending...
                    </>
                  ) : cooldown ? (
                    "Email sent! Check your inbox"
                  ) : (
                    <>
                      <i className="fa-solid fa-rotate-right mr-1.5" />
                      Resend verification email
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Footer links */}
            <div className="mt-6 pt-5 border-t border-outline-variant/10 flex flex-col items-center gap-2">
              <p className="text-xs text-on-surface-variant/50">
                Already verified?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="text-xs text-on-surface-variant/50">
                Wrong email?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up again
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
