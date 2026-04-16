"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import RocketAnimation from "@/components/RocketAnimation";
import Link from "next/link";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"ready" | "submitting" | "success" | "error">("ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatically exchanges the token from the URL hash
    // when the client is created. We just need to wait for it.
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (in case event already fired)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("submitting");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("success");
    // Redirect to dashboard after a brief pause
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
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
            {status === "success" ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-check text-tertiary text-xl" />
                </div>
                <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight">
                  Password updated
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant/70">
                  Your password has been reset successfully. Redirecting you to the dashboard...
                </p>
              </div>
            ) : !sessionReady ? (
              <div className="text-center py-4">
                <i className="fa-solid fa-spinner fa-spin text-primary text-lg mb-3 block" />
                <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight">
                  Verifying link...
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant/70">
                  Please wait while we verify your reset link.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight text-center">
                  Set new password
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant/70 text-center">
                  Choose a strong password for your account.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                      New Password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`mt-1.5 ${INPUT_CLS}`}
                      placeholder="At least 8 characters"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                      Confirm Password
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`mt-1.5 ${INPUT_CLS}`}
                      placeholder="Re-enter your password"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-60 transition-all duration-500 relative overflow-hidden group"
                  >
                    <span className="relative z-10">
                      {status === "submitting" ? "Updating..." : "Update password"}
                    </span>
                  </button>

                  {status === "error" && errorMsg && (
                    <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                      {errorMsg}
                    </div>
                  )}

                  {status === "ready" && errorMsg && (
                    <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                      {errorMsg}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
