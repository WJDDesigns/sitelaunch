import Link from "next/link";
import { requireSession, getVisiblePartners, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import ImpersonateButton from "./ImpersonateButton";

export default async function PartnersPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const allPartners = await getVisiblePartners();
  // Filter out the user's own root account — only show sub-partners (invited partners)
  const partners = account
    ? allPartners.filter((p) => p.id !== account.id)
    : allPartners;
  const isSuperadmin = session.role === "superadmin";

  // Get pending invites for the account
  const admin = createAdminClient();
  const partnerIds = partners.map((p) => p.id);

  // Fetch pending invite counts per partner
  const { data: inviteData } = partnerIds.length > 0
    ? await admin
        .from("invites")
        .select("id, email, partner_id, accepted_at, expires_at")
        .in("partner_id", partnerIds)
        .is("accepted_at", null)
    : { data: [] };

  const pendingInvites = (inviteData ?? []).filter(
    (i) => new Date(i.expires_at) > new Date(),
  );

  // Fetch member counts per partner
  const { data: memberData } = partnerIds.length > 0
    ? await admin
        .from("partner_members")
        .select("partner_id, role")
        .in("partner_id", partnerIds)
        .eq("role", "partner_member")
    : { data: [] };

  const memberCountMap: Record<string, number> = {};
  for (const m of memberData ?? []) {
    memberCountMap[m.partner_id] = (memberCountMap[m.partner_id] ?? 0) + 1;
  }

  // Fetch submission counts per partner
  const { data: subData } = partnerIds.length > 0
    ? await admin
        .from("submissions")
        .select("partner_id")
        .in("partner_id", partnerIds)
        .neq("status", "draft")
    : { data: [] };

  const subCountMap: Record<string, number> = {};
  for (const s of subData ?? []) {
    subCountMap[s.partner_id] = (subCountMap[s.partner_id] ?? 0) + 1;
  }

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");
  const isPaid = account?.planTier !== "free";

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Partners</h1>
          <p className="text-on-surface-variant mt-1">
            Invite partners to manage their own branded onboarding page and form.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperadmin && (
            <Link
              href="/dashboard/partners/new"
              className="px-5 py-2.5 bg-surface-container text-on-surface font-bold rounded-lg text-sm border border-outline-variant/20 hover:border-primary/30 hover:text-primary transition-all"
            >
              + Create manually
            </Link>
          )}
        </div>
      </header>

      {!isPaid && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <i className="fa-solid fa-lock text-primary text-lg mb-3" />
          <h3 className="text-sm font-bold text-on-surface mb-1">Upgrade to invite partners</h3>
          <p className="text-xs text-on-surface-variant/60 mb-4">
            Partner management is available on paid plans.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-block px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all"
          >
            View plans
          </Link>
        </div>
      )}

      {partners.length === 0 && isPaid ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center shadow-2xl shadow-black/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-users text-xl text-primary" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No partners yet</h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm mx-auto mb-6">
            Invite your first partner to give them their own branded onboarding portal.
            They&rsquo;ll be able to manage their branding, view submissions, and more.
          </p>
          {isSuperadmin && (
            <Link
              href="/dashboard/partners/new"
              className="inline-block px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all"
            >
              + Create a partner
            </Link>
          )}
        </div>
      ) : partners.length > 0 ? (
        <div className="space-y-4">
          {partners.map((p) => {
            const memberCount = memberCountMap[p.id] ?? 0;
            const subCount = subCountMap[p.id] ?? 0;
            const partnerPendingInvites = pendingInvites.filter((i) => i.partner_id === p.id);
            const storefrontHost = p.custom_domain || `${p.slug}.${rootHost}`;

            return (
              <div
                key={p.id}
                className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10 hover:border-primary/20 transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Partner info */}
                    <div className="flex items-center gap-4">
                      {p.logo_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.logo_url} alt="" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-on-primary text-sm font-bold shrink-0"
                          style={{ backgroundColor: p.primary_color || "#696cf8" }}
                        >
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xs text-on-surface-variant/50 font-mono">{storefrontHost}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSuperadmin && <ImpersonateButton partnerId={p.id} />}
                      <a
                        href={`http://${storefrontHost}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-xs font-bold text-on-surface-variant/60 border border-outline-variant/15 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                      </a>
                      <Link
                        href={`/dashboard/partners/${p.id}`}
                        className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-outline-variant/[0.06]">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-users text-[10px] text-on-surface-variant/40" />
                      <span className="text-xs text-on-surface-variant">
                        {memberCount} member{memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-inbox text-[10px] text-on-surface-variant/40" />
                      <span className="text-xs text-on-surface-variant">
                        {subCount} submission{subCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {partnerPendingInvites.length > 0 && (
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-clock text-[10px] text-warning" />
                        <span className="text-xs text-warning">
                          {partnerPendingInvites.length} pending invite{partnerPendingInvites.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
