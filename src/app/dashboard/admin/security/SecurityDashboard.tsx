"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeSessionAction, type SecurityOverview, type SessionRow } from "./actions";

interface Props {
  overview: SecurityOverview;
  sessions: SessionRow[];
}

const DEVICE_ICONS: Record<string, string> = {
  mobile: "fa-mobile-screen",
  tablet: "fa-tablet-screen-button",
  desktop: "fa-display",
};

export default function SecurityDashboard({ overview, sessions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  function handleRevoke(sessionId: string) {
    if (!confirm("Revoke this session? The user will be signed out.")) return;
    setMsg(null);
    startTransition(async () => {
      const result = await revokeSessionAction(sessionId);
      setMsg(result.ok ? "Session revoked." : (result.error ?? "Failed."));
      router.refresh();
      if (result.ok) setTimeout(() => setMsg(null), 3000);
    });
  }

  const mfaPercent = Math.round(overview.mfaRate * 100);
  const displayedSessions = showAllSessions ? sessions : sessions.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Status message */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
          msg.includes("revoked") ? "bg-tertiary/10 text-tertiary border border-tertiary/20" : "bg-error/10 text-error border border-error/20"
        }`}>
          {msg}
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="fa-users" label="Total users" value={overview.totalUsers} />
        <StatCard
          icon="fa-shield-halved"
          label="MFA enabled"
          value={`${overview.mfaEnabledUsers} (${mfaPercent}%)`}
          color={mfaPercent >= 80 ? "tertiary" : mfaPercent >= 40 ? "amber-400" : "error"}
        />
        <StatCard icon="fa-key" label="Passkeys" value={overview.passkeysRegistered} />
        <StatCard icon="fa-user-shield" label="Superadmins" value={overview.superadminCount} />
      </div>

      {/* Security features */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          Security features
        </h2>
        <div className="space-y-3">
          <Feature
            icon="fa-fingerprint"
            title="Passkey / WebAuthn MFA"
            description="Phishing-resistant passwordless authentication with device-bound credentials."
            enabled
          />
          <Feature
            icon="fa-lock"
            title="MFA enforcement"
            description="Middleware-level MFA gate redirects users without MFA to setup before accessing the dashboard."
            enabled
          />
          <Feature
            icon="fa-gauge"
            title="Login rate limiting"
            description="5 attempts per 60 seconds per IP address on the login endpoint."
            enabled
          />
          <Feature
            icon="fa-database"
            title="Row-Level Security (RLS)"
            description="Supabase RLS policies ensure users can only access data they're authorized to see."
            enabled={overview.rlsPoliciesActive}
          />
          <Feature
            icon="fa-user-shield"
            title="Platform owner restriction"
            description="Only the platform owner (via SUPERADMIN_EMAILS) can grant superadmin roles."
            enabled
          />
          <Feature
            icon="fa-right-from-bracket"
            title="Session management"
            description="Users can view, name, and revoke individual sessions. Admins can revoke any session."
            enabled
          />
          <Feature
            icon="fa-trash-can"
            title="Account deletion safeguard"
            description="Users must type their workspace name to confirm permanent account deletion."
            enabled
          />
          <Feature
            icon="fa-eye-slash"
            title="Impersonation audit trail"
            description="Superadmin impersonation is visible via a banner and can be ended at any time."
            enabled
          />
        </div>
      </section>

      {/* Security headers */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          Security headers
        </h2>
        <div className="space-y-2">
          {overview.securityHeaders.map((h) => (
            <div key={h.name} className="flex items-center gap-3 py-2">
              <i className={`fa-solid ${h.status === "ok" ? "fa-circle-check text-tertiary" : "fa-triangle-exclamation text-amber-400"} text-xs shrink-0`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-on-surface">{h.name}</span>
                <p className="text-[10px] text-on-surface-variant/50 font-mono truncate">{h.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active sessions */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Active sessions <span className="text-on-surface-variant/40">(last 24h)</span>
          </h2>
          <span className="text-xs text-on-surface-variant/50">{overview.activeSessions} active</span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-on-surface-variant/60 text-center py-6">No active sessions.</p>
        ) : (
          <>
            <div className="space-y-2">
              {displayedSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-surface-container-high/30 transition-colors">
                  <i className={`fa-solid ${DEVICE_ICONS[s.device_type] ?? "fa-display"} text-sm text-on-surface-variant/40 w-5 text-center`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface truncate">
                        {s.user_name || s.user_email || "Unknown user"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/40">{s.device_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {s.ip_address && (
                        <span className="text-[10px] text-on-surface-variant/40 font-mono">{s.ip_address}</span>
                      )}
                      <span className="text-[10px] text-on-surface-variant/40">
                        {getTimeAgo(new Date(s.last_active_at))}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={pending}
                    className="px-2.5 py-1 text-[10px] font-bold text-error/60 hover:text-error border border-error/15 hover:border-error/30 rounded-lg transition-all disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
            {sessions.length > 10 && !showAllSessions && (
              <button
                onClick={() => setShowAllSessions(true)}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Show all {sessions.length} sessions
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/15 p-4">
      <div className="flex items-center gap-2 mb-2">
        <i className={`fa-solid ${icon} text-xs text-primary`} />
        <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <span className={`text-xl font-bold ${color ? `text-${color}` : "text-on-surface"}`}>{value}</span>
    </div>
  );
}

function Feature({ icon, title, description, enabled }: { icon: string; title: string; description: string; enabled: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        enabled ? "bg-tertiary/10" : "bg-error/10"
      }`}>
        <i className={`fa-solid ${icon} text-[10px] ${enabled ? "text-tertiary" : "text-error"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface">{title}</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
            enabled ? "bg-tertiary/10 text-tertiary" : "bg-error/10 text-error"
          }`}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant/60 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}
