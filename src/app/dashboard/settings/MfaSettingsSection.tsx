"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface TotpFactor {
  id: string;
  friendlyName: string | null;
  status: string;
  createdAt: string;
}

interface PasskeyInfo {
  id: string;
  deviceName: string | null;
  createdAt: string;
}

export default function MfaSettingsSection() {
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get TOTP factors from Supabase
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = (factors?.totp ?? [])
        .filter(f => f.status === "verified")
        .map(f => ({
          id: f.id,
          friendlyName: f.friendly_name ?? null,
          status: f.status,
          createdAt: f.created_at,
        }));
      setTotpFactors(totp);

      // Get passkeys from our API
      try {
        const res = await fetch("/api/auth/passkey/list");
        if (res.ok) {
          const data = await res.json();
          setPasskeys(data.passkeys ?? []);
        }
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  async function removeTotpFactor(factorId: string) {
    setRemoving(factorId);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setTotpFactors(prev => prev.filter(f => f.id !== factorId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove factor");
    } finally {
      setRemoving(null);
    }
  }

  async function removePasskey(passkeyId: string) {
    setRemoving(passkeyId);
    try {
      const res = await fetch(`/api/auth/passkey/list?id=${passkeyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove passkey");
      setPasskeys(prev => prev.filter(p => p.id !== passkeyId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove passkey");
    } finally {
      setRemoving(null);
    }
  }

  const hasMfa = totpFactors.length > 0 || passkeys.length > 0;

  return (
    <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          Multi-Factor Authentication
        </h2>
        {hasMfa && (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">
            Active
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-on-surface-variant/50 py-4 text-center">
          <i className="fa-solid fa-spinner fa-spin mr-1.5" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          {/* TOTP Factors */}
          {totpFactors.length > 0 && (
            <div className="space-y-2">
              {totpFactors.map(factor => (
                <div key={factor.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-low/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <i className="fa-solid fa-mobile-screen text-primary text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">Authenticator app</p>
                      <p className="text-[10px] text-on-surface-variant/50">
                        Added {new Date(factor.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTotpFactor(factor.id)}
                    disabled={removing === factor.id}
                    className="text-[10px] font-bold uppercase tracking-wider text-error/60 hover:text-error transition-colors disabled:opacity-50"
                  >
                    {removing === factor.id ? <i className="fa-solid fa-spinner fa-spin" /> : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Passkeys */}
          {passkeys.length > 0 && (
            <div className="space-y-2">
              {passkeys.map(pk => (
                <div key={pk.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-low/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                      <i className="fa-solid fa-fingerprint text-tertiary text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{pk.deviceName || "Passkey"}</p>
                      <p className="text-[10px] text-on-surface-variant/50">
                        Added {new Date(pk.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removePasskey(pk.id)}
                    disabled={removing === pk.id}
                    className="text-[10px] font-bold uppercase tracking-wider text-error/60 hover:text-error transition-colors disabled:opacity-50"
                  >
                    {removing === pk.id ? <i className="fa-solid fa-spinner fa-spin" /> : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new method */}
          <Link
            href="/auth/mfa/setup?next=/dashboard/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:bg-primary/[0.03] transition-all"
          >
            <i className="fa-solid fa-plus text-[10px]" />
            Add MFA method
          </Link>

          {!hasMfa && (
            <p className="text-xs text-on-surface-variant/50">
              No MFA methods configured. MFA is required for all accounts.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
