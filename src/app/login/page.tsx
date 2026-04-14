"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
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
    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Sign in to SiteLaunch</h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "password" ? "Sign in with your email and password." : "We'll email you a magic link."}
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-lg bg-brand-50 p-4 text-sm text-brand-700">
            Check your inbox. The link will bring you right back here.
          </div>
        ) : (
          <form
            onSubmit={mode === "password" ? handlePassword : handleMagic}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                placeholder="you@example.com"
              />
            </label>

            {mode === "password" && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {status === "sending"
                ? (mode === "password" ? "Signing in…" : "Sending…")
                : (mode === "password" ? "Sign in" : "Send magic link")}
            </button>

            {status === "error" && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "password" ? "magic" : "password");
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
            >
              {mode === "password" ? "Use magic link instead" : "Use password instead"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
