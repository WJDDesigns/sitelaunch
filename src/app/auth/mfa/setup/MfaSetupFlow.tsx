"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startRegistration } from "@simplewebauthn/browser";

type Step = "choose" | "totp-enroll" | "totp-verify" | "passkey-register" | "done";

interface Props {
  redirectTo: string;
  userEmail: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300 text-center tracking-[0.3em] font-mono";

export default function MfaSetupFlow({ redirectTo, userEmail }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // TOTP state
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  // Passkey state
  const [deviceName, setDeviceName] = useState("");

  /* ── TOTP Enrollment ─────────────────────────── */

  async function startTotpEnrollment() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: userEmail,
      });

      if (enrollError) throw enrollError;
      if (!data) throw new Error("No enrollment data returned");

      setTotpQr(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setTotpFactorId(data.id);
      setStep("totp-verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start TOTP enrollment");
    } finally {
      setLoading(false);
    }
  }

  async function verifyTotpEnrollment() {
    if (!totpFactorId || totpCode.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();

      // Challenge first
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactorId,
      });
      if (challengeError) throw challengeError;

      // Then verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw verifyError;

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Try again.");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }

  /* ── Passkey Registration ────────────────────── */

  async function startPasskeyRegistration() {
    setError(null);
    setLoading(true);
    try {
      // Get registration options from our API
      const optionsRes = await fetch("/api/auth/passkey/register");
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const options = await optionsRes.json();

      // Start WebAuthn registration in the browser
      const credential = await startRegistration({ optionsJSON: options });

      // Verify with the server
      const verifyRes = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          challenge: options.challenge,
          deviceName: deviceName || "Passkey",
        }),
      });

      const result = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(result.error || "Server rejected passkey registration");
      }
      if (!result.verified) throw new Error("Passkey verification returned false");

      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Passkey registration failed";
      // Don't show "cancelled" errors
      if (!message.includes("cancelled") && !message.includes("abort")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Done ────────────────────────────────────── */

  function handleFinish() {
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="gradient-border rounded-2xl">
      <div className="relative rounded-2xl p-8 space-y-6 bg-surface-container shadow-xl border border-outline-variant/10">

        {/* ── Step: Choose Method ─── */}
        {step === "choose" && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-shield-halved text-primary text-xl" />
              </div>
              <h1 className="text-2xl font-bold font-headline text-on-surface tracking-tight">
                Secure your account
              </h1>
              <p className="mt-2 text-sm text-on-surface-variant/70">
                Set up multi-factor authentication to protect your workspace.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setError(null); startTotpEnrollment(); }}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-outline-variant/15 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <i className="fa-solid fa-mobile-screen text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-on-surface">Authenticator app</div>
                  <div className="text-xs text-on-surface-variant/60 mt-0.5">
                    Google Authenticator, Authy, 1Password, etc.
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-on-surface-variant/30 ml-auto" />
              </button>

              <button
                onClick={() => { setError(null); setStep("passkey-register"); }}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-outline-variant/15 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0 group-hover:bg-tertiary/15 transition-colors">
                  <i className="fa-solid fa-fingerprint text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-on-surface">Passkey</div>
                  <div className="text-xs text-on-surface-variant/60 mt-0.5">
                    Face ID, Touch ID, Windows Hello, or hardware key
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-on-surface-variant/30 ml-auto" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                {error}
              </div>
            )}
          </>
        )}

        {/* ── Step: TOTP Verify ─── */}
        {step === "totp-verify" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold font-headline text-on-surface">
                Scan QR code
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant/70">
                Open your authenticator app and scan this code.
              </p>
            </div>

            {totpQr && (
              <div className="flex justify-center">
                <div className="bg-white rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpQr} alt="TOTP QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {totpSecret && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-1">
                  Or enter this key manually
                </p>
                <code className="text-xs font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-lg select-all break-all">
                  {totpSecret}
                </code>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2 text-center">
                Enter the 6-digit code
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

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("choose"); setError(null); setTotpCode(""); }}
                className="flex-1 py-3 text-sm font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:bg-surface-container-high/50 transition-all"
              >
                Back
              </button>
              <button
                onClick={verifyTotpEnrollment}
                disabled={loading || totpCode.length !== 6}
                className="flex-1 py-3 text-sm font-bold bg-primary text-on-primary rounded-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-50 transition-all"
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : "Verify"}
              </button>
            </div>
          </>
        )}

        {/* ── Step: Passkey Register ─── */}
        {step === "passkey-register" && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-tertiary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-fingerprint text-tertiary text-xl" />
              </div>
              <h2 className="text-xl font-bold font-headline text-on-surface">
                Register a passkey
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant/70">
                Use your device&apos;s biometrics or a hardware security key.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                Device name <span className="normal-case font-normal text-on-surface-variant/50">(optional)</span>
              </span>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. MacBook Pro"
                className={`mt-1.5 ${INPUT_CLS} tracking-normal text-left`}
              />
            </label>

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/15 px-3 py-2 text-sm text-error text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("choose"); setError(null); }}
                className="flex-1 py-3 text-sm font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:bg-surface-container-high/50 transition-all"
              >
                Back
              </button>
              <button
                onClick={startPasskeyRegistration}
                disabled={loading}
                className="flex-1 py-3 text-sm font-bold bg-primary text-on-primary rounded-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <><i className="fa-solid fa-spinner fa-spin text-xs mr-1.5" /> Waiting...</>
                ) : (
                  <><i className="fa-solid fa-fingerprint text-xs mr-1.5" /> Register Passkey</>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Step: Done ─── */}
        {step === "done" && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-tertiary/10 flex items-center justify-center mb-4">
                <i className="fa-solid fa-circle-check text-tertiary text-2xl" />
              </div>
              <h2 className="text-xl font-bold font-headline text-on-surface">
                MFA is active
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant/70">
                Your account is now protected with multi-factor authentication.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 text-sm font-bold bg-primary text-on-primary rounded-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] transition-all"
            >
              Continue to dashboard <i className="fa-solid fa-arrow-right text-xs ml-1.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
