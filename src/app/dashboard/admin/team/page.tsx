import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import InviteForm from "./InviteForm";
import TeamMemberRow from "./TeamMemberRow";
import { inviteTeamMemberAction, updateRoleAction, removeTeamMemberAction } from "./actions";

export default async function TeamPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  // Get all internal team members (superadmin, admin, support roles — NOT partner_owner/client)
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .in("role", ["superadmin", "partner_owner", "partner_member"])
    .order("created_at", { ascending: true });

  // Get pending invites
  const { data: invites } = await admin
    .from("invites")
    .select("id, email, role, created_at, expires_at, accepted_at")
    .is("partner_id", null)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <Link href="/dashboard/admin" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mt-2">
          Team Management
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage your SiteLaunch team members and their permissions.
        </p>
      </header>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { role: "superadmin", label: "Super Admin", desc: "Full platform access, can manage team and all partners", icon: "fa-crown", color: "text-amber-400" },
          { role: "partner_owner", label: "Admin", desc: "Can manage partners, billing, and forms", icon: "fa-user-shield", color: "text-primary" },
          { role: "partner_member", label: "Support", desc: "Can view submissions and assist partners", icon: "fa-headset", color: "text-tertiary" },
        ].map((r) => (
          <div key={r.role} className="glass-panel rounded-xl border border-outline-variant/15 p-4">
            <div className="flex items-center gap-2 mb-1">
              <i className={`fa-solid ${r.icon} ${r.color} text-sm`} />
              <span className="text-sm font-bold text-on-surface">{r.label}</span>
            </div>
            <p className="text-xs text-on-surface-variant/60">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Invite */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          <i className="fa-solid fa-paper-plane mr-2 text-primary/60" />
          Invite Team Member
        </h2>
        <InviteForm inviteAction={inviteTeamMemberAction} />
      </section>

      {/* Pending invites */}
      {(invites ?? []).length > 0 && (
        <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Pending Invites
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {(invites ?? []).map((inv) => (
              <div key={inv.id} className="px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <i className="fa-solid fa-envelope text-xs text-on-surface-variant/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-on-surface-variant/60">
                    Invited as {inv.role === "superadmin" ? "Super Admin" : inv.role === "partner_owner" ? "Admin" : "Support"}
                    {" "}&middot; Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Current team */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Team Members ({(profiles ?? []).length})
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {(profiles ?? []).map((p) => (
            <TeamMemberRow
              key={p.id}
              profile={p}
              updateRoleAction={updateRoleAction}
              removeAction={removeTeamMemberAction}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
