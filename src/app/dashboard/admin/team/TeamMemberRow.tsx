"use client";

import { useState, useTransition } from "react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface Props {
  profile: Profile;
  updateRoleAction: (userId: string, newRole: string) => Promise<{ ok: boolean; error?: string }>;
  removeAction: (userId: string) => Promise<{ ok: boolean; error?: string }>;
}

const ROLE_BADGES: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  superadmin: { label: "Super Admin", icon: "fa-crown", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  partner_owner: { label: "Admin", icon: "fa-user-shield", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  partner_member: { label: "Support", icon: "fa-headset", color: "text-tertiary", bg: "bg-tertiary/10", border: "border-tertiary/20" },
};

export default function TeamMemberRow({ profile, updateRoleAction, removeAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const badge = ROLE_BADGES[profile.role] ?? ROLE_BADGES.partner_member;

  function handleRoleChange(newRole: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateRoleAction(profile.id, newRole);
      if (!res.ok) setError(res.error ?? "Update failed");
      setEditing(false);
    });
  }

  function handleRemove() {
    if (!confirm(`Remove ${profile.full_name || profile.email} from the team?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await removeAction(profile.id);
      if (!res.ok) setError(res.error ?? "Remove failed");
    });
  }

  return (
    <div className="px-6 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
        {(profile.full_name || profile.email).slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">
          {profile.full_name || profile.email}
        </p>
        <p className="text-xs text-on-surface-variant/60 truncate">{profile.email}</p>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          {["superadmin", "partner_owner", "partner_member"].map((r) => {
            const b = ROLE_BADGES[r]!;
            return (
              <button
                key={r}
                disabled={pending}
                onClick={() => handleRoleChange(r)}
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border transition-all disabled:opacity-50 ${
                  r === profile.role ? `${b.bg} ${b.color} ${b.border}` : "bg-surface-container text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                }`}
              >
                {b.label}
              </button>
            );
          })}
          <button onClick={() => setEditing(false)} className="text-xs text-on-surface-variant/40 hover:text-on-surface ml-1">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${badge.bg} ${badge.color} ${badge.border}`}>
            <i className={`fa-solid ${badge.icon} mr-1`} />
            {badge.label}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors p-1"
            title="Change role"
          >
            <i className="fa-solid fa-pen text-[10px]" />
          </button>
          <button
            onClick={handleRemove}
            disabled={pending}
            className="text-xs text-on-surface-variant/40 hover:text-error transition-colors p-1 disabled:opacity-50"
            title="Remove member"
          >
            <i className="fa-solid fa-trash text-[10px]" />
          </button>
        </div>
      )}

      {error && <span className="text-xs text-error shrink-0">{error}</span>}
    </div>
  );
}
