"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "./actions";

interface Props {
  token: string;
  email: string;
  existingUser: boolean;
  existingUserName: string | null;
}

export default function AcceptInviteForm({ token, email, existingUser, existingUserName }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(existingUserName ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!existingUser && password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const result = await acceptInviteAction(token, fullName, password);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Brief pause to show success then redirect to login
    setTimeout(() => {
      router.push("/login?invited=true");
    }, 1500);
  }

  if (success) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/15 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-tertiary/10 flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-check text-xl text-tertiary" />
        </div>
        <h2 className="text-lg font-bold font-headline text-on-surface mb-2">
          You&rsquo;re in!
        </h2>
        <p className="text-sm text-on-surface-variant/60">
          Redirecting you to sign in&hellip;
        </p>
      </div>
    );
  }

  const INPUT_CLS =
    "w-full rounded-xl border border-outline-variant/20 bg-surface-container-low/50 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  return (
    <div className="gradient-border rounded-2xl">
      <form
        onSubmit={handleSubmit}
        className="relative glass-panel-strong noise-overlay rounded-2xl p-8 space-y-5"
      >
        {existingUser ? (
          <div className="text-center">
            <p className="text-sm text-on-surface-variant/70 mb-2">
              You already have a SiteLaunch account with
            </p>
            <p className="text-sm font-bold text-on-surface">{email}</p>
            <p className="text-xs text-on-surface-variant/50 mt-2">
              Click below to add this partner to your account.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className={`${INPUT_CLS} opacity-60 cursor-not-allowed`}
              />
              <p className="text-[10px] text-on-surface-variant/40 mt-1">
                This is the email the invite was sent to
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Your name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className={INPUT_CLS}
              />
            </div>
          </>
        )}

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            <i className="fa-solid fa-circle-exclamation mr-2" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] transition-all duration-300 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <i className="fa-solid fa-spinner animate-spin text-xs" />
              {existingUser ? "Joining…" : "Creating account…"}
            </span>
          ) : existingUser ? (
            "Join this partner"
          ) : (
            "Create account & join"
          )}
        </button>

        <p className="text-center text-xs text-on-surface-variant/40">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
