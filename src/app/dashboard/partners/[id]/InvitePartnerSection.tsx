"use client";

import { useState } from "react";

interface Invite {
  id: string;
  email: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface Props {
  partnerId: string;
  partnerName: string;
  invites: Invite[];
  members: Member[];
  sendInviteAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  revokeInviteAction: (inviteId: string) => Promise<{ ok: boolean; error?: string }>;
  removeMemberAction: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleFormEditingAction: (enabled: boolean) => Promise<{ ok: boolean; error?: string }>;
  allowFormEditing: boolean;
}

export default function InvitePartnerSection({
  partnerId,
  partnerName,
  invites,
  members,
  sendInviteAction,
  revokeInviteAction,
  removeMemberAction,
  toggleFormEditingAction,
  allowFormEditing,
}: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [formEditing, setFormEditing] = useState(allowFormEditing);
  const [togglingForm, setTogglingForm] = useState(false);

  const pendingInvites = invites.filter((i) => !i.accepted_at && new Date(i.expires_at) > new Date());

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage(null);

    const fd = new FormData();
    fd.set("email", email.trim());

    const result = await sendInviteAction(fd);

    if (result.ok) {
      setMessage({ type: "ok", text: `Invite sent to ${email}` });
      setEmail("");
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to send invite." });
    }
    setSending(false);
  }

  async function handleRevoke(inviteId: string) {
    const result = await revokeInviteAction(inviteId);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to revoke." });
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this partner member? They will lose access.")) return;
    const result = await removeMemberAction(userId);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Failed to remove." });
    }
  }

  async function handleToggleFormEditing() {
    setTogglingForm(true);
    const newVal = !formEditing;
    const result = await toggleFormEditingAction(newVal);
    if (result.ok) {
      setFormEditing(newVal);
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to update." });
    }
    setTogglingForm(false);
  }

  const INPUT_CLS =
    "w-full rounded-xl border border-outline-variant/20 bg-surface-container-low/50 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  return (
    <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-6">
      <div>
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
          Partner Members
        </h2>
        <p className="text-xs text-on-surface-variant/50">
          Invite people to manage {partnerName}&rsquo;s branding, submissions, and profile.
        </p>
      </div>

      {/* Send invite form */}
      <form onSubmit={handleSendInvite} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@example.com"
          required
          className={`${INPUT_CLS} flex-1`}
        />
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] transition-all duration-300 disabled:opacity-50 shrink-0"
        >
          {sending ? (
            <i className="fa-solid fa-spinner animate-spin" />
          ) : (
            <>
              <i className="fa-solid fa-paper-plane text-xs mr-2" />
              Send Invite
            </>
          )}
        </button>
      </form>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-tertiary/10 border border-tertiary/20 text-tertiary"
              : "bg-error/10 border border-error/20 text-error"
          }`}
        >
          <i
            className={`fa-solid ${
              message.type === "ok" ? "fa-check-circle" : "fa-circle-exclamation"
            } mr-2`}
          />
          {message.text}
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-2">
            Pending Invites
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                    <i className="fa-solid fa-clock text-[10px] text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{inv.email}</p>
                    <p className="text-[10px] text-on-surface-variant/40">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="text-xs text-on-surface-variant/40 hover:text-error transition-colors"
                  title="Revoke invite"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      {members.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-2">
            Active Members
          </h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">
                      {(m.full_name || m.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {m.full_name || m.email}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/40">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded-full">
                    {m.role === "partner_member" ? "Member" : m.role === "partner_owner" ? "Owner" : m.role}
                  </span>
                  {m.role === "partner_member" && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="text-xs text-on-surface-variant/40 hover:text-error transition-colors"
                      title="Remove member"
                    >
                      <i className="fa-solid fa-user-minus text-[10px]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form editing toggle */}
      <div className="border-t border-outline-variant/10 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-on-surface mb-0.5">Allow form editing</h3>
            <p className="text-[10px] text-on-surface-variant/50">
              Let partner members propose changes to the intake form. Changes require your approval.
            </p>
          </div>
          <button
            onClick={handleToggleFormEditing}
            disabled={togglingForm}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              formEditing ? "bg-primary" : "bg-surface-container-highest"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                formEditing ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
