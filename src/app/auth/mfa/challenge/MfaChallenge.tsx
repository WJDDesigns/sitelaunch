"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startAuthentication } from "@simplewebauthn/browser";

type Method = "totp" | "passkey";

interface Props {
  redirectTo: string;
  userId: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300 text-center tracking-[0.3em] font-mono";

export default function MfaChallenge({ redirectTo, userId }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("totp");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);

  // Check which MFA methods are available
  useEffect(() => {
    async function checkFactors() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();

      const verifiedTotp = (data?.totp ?? []).find(f => f.status === "verified");
      if (verifiedTotp) {
        setHasTotp(true);
        setTotpFactorId(verifiedTotp.id);
      }

      // Check passkeys via our API
      try {
        const res = await fetch("/api/auth/passkey/authenticate");
        if (res.ok) setHasPasskey(true);
      } catch { /* no passkeys */ }

      // Auto-select available method
      if (verifiedTotp) {
        setMethod("totp");
      } else {
        setMethod("passkey");
      }
    }
    checkFactors();
  }, [userId]);

  async function verifyTotp() {
    if (!totpFactorId || totpCode.length !== 6) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw verifyError;

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Try again.");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPasskey() {
    setError(null);
    setLoading(true);

    try {
      // Get authentication options
      const optionsRes = await fetch("/api/auth/passkey/authenticate");
      if (!optionsRes.ok) throw new Error("Failed to get challenge");
      const options = await optionsRes.json();

      // Start WebAuthn authentication
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify with server
      const verifyRes = await fetch("/api/auth/passkey/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
        }),
      });

      const result = await verifyRes.json();
      if (!result.verified) throw new Error("Passkey verification failed");

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      if (!message.includes("cancelled") && !message.includes("abort")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gradient-border rounded-2xl">
      <div className="relative glass-panel-strong noise-overlay rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <i className="fa-solid fa-shield-halved text-primary text-xl" />
          </div>
          <h1 className="text-xl font-bold font-headline text-on-surface tracking-tight">
            Two-factor authentication
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant/70">
            Verify your identity to continue.
          </p>
        </div>

        {/* Method tabs */}
        {hasTotp && hasPasskey && (
          <div className="flex gap-1 p-1 rounded-xl bg-surface-container-high/30">
            <button
              onClick={() => { setMethod("totp"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                method === "totp"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant"
              }`}
            >
              <i className="fa-solid fa-mobile-screen text-[10px] mr-1.5" />
              Authenticator
            </button>
            <button
              onClick={() => { setMethod("passkey"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                method === "passkey"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant"
              }`}
            >
              <i className="fa-solid fa-fingerprint text-[10px] mr-1.5" />
              Passkey
            </button>
          </div>
        )}

        {/* TOTP */}
        {method === "totp" && hasTotp && (
          <>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2 text-center">
                Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                className={INPUT_CLS}
                placeholder="000000"
              />
            </div>

            <button
              onClick={verifyTotp}
              disabled={loading || totpCode.length !== 6}
              className="w-full py-3 text-sm font-bold bg-primary text-on-primary rounded-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-50 transition-all"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : "Verify"}
            </button>
          </>
        )}

        {/* Passkey */}
        {method === "passkey" && hasPasskey && (
          <button
            onClick={verifyPasskey}
            disabled={loading}
            className="w-full py-4 text-sm font-bold bg-primary text-on-primary rounded-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-50 transition-all"
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin text-xs mr-1.5" /> Waiting for device...</>
            ) : (
              <><i className="fa-solid fa-fingerprint mr-1.5" /> Verify with passkey</>
            )}
          </button>
        )}

        {/* No methods available — redirect to setup */}
        {!hasTotp && !hasPasskey && (
          <div className="text-center">
            <p className="text-sm text-on-surface-variant/70 mb-4">
              No MFA methods found. Please set up authentication.
            </p>
            <button
              onClick={() => router.push(`/auth/mfa/setup?next=${encodeURIComponent(redirectTo)}`)}
              className="w-full py-3 text-sm font-bold bg-primary text-on-primary rounded-xl transition-all"
            >
              Set up MFA
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
