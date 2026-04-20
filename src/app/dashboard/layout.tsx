import { requireSession, getCurrentAccount, getAccountUsage, getImpersonatingPartnerId, getPartnerMemberContext, getAllAccountContexts } from "@/lib/auth";
import type { AccountSwitchContext } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackSession } from "@/lib/session-tracker";
import { getActiveAnnouncements } from "./admin/announce/actions";
import ImpersonationBanner from "./ImpersonationBanner";
import UpgradeBanner from "./UpgradeBanner";
import DashboardShell from "./DashboardShell";
import { ToastProvider } from "@/components/Toast";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  paid: "Starter",
  unlimited: "Agency",
  enterprise: "Agency",
};

const WORKSPACE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "fa-table-cells" },
  { href: "/dashboard/form", label: "Forms", icon: "fa-pen-ruler" },
  { href: "/dashboard/entries", label: "Entries", icon: "fa-inbox" },
  { href: "/dashboard/accounts", label: "Accounts", icon: "fa-users" },
  { href: "/dashboard/insights", label: "Insights", icon: "fa-lightbulb" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "fa-chart-pie" },
  { href: "/dashboard/billing", label: "Billing", icon: "fa-credit-card" },
  { href: "/dashboard/settings", label: "Settings", icon: "fa-gear" },
  { href: "/dashboard/docs", label: "Docs", icon: "fa-book" },
];

const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Platform", icon: "fa-chart-line" },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: "fa-chart-pie" },
  { href: "/dashboard/admin/billing", label: "Billing", icon: "fa-credit-card" },
  { href: "/dashboard/admin/team", label: "Team", icon: "fa-user-shield" },
  { href: "/dashboard/admin/partners", label: "Accounts", icon: "fa-sitemap" },
  { href: "/dashboard/admin/activity", label: "Activity Log", icon: "fa-timeline" },
  { href: "/dashboard/admin/emails", label: "Emails", icon: "fa-envelope" },
  { href: "/dashboard/admin/announce", label: "Announce", icon: "fa-bullhorn" },
  { href: "/dashboard/admin/speed", label: "Speed", icon: "fa-gauge-high" },
  { href: "/dashboard/admin/security", label: "Security", icon: "fa-shield-halved" },
];

/** Scoped nav for partner_member users — they only see their own partner's stuff */
function getPartnerMemberNav(partnerId: string, allowFormEditing: boolean) {
  const formsLink = allowFormEditing
    ? { href: "/dashboard/form", label: "Forms", icon: "fa-pen-ruler" }
    : { href: "/dashboard/forms", label: "Forms", icon: "fa-file-lines" };
  return [
    { href: "/dashboard", label: "Dashboard", icon: "fa-table-cells" },
    formsLink,
    { href: "/dashboard/entries", label: "Entries", icon: "fa-inbox" },
    { href: "/dashboard/insights", label: "Insights", icon: "fa-lightbulb" },
    { href: `/dashboard/partners/${partnerId}`, label: "Branding", icon: "fa-palette" },
    { href: "/dashboard/team", label: "Team", icon: "fa-user-group" },
    { href: "/dashboard/settings", label: "Settings", icon: "fa-gear" },
    { href: "/dashboard/docs", label: "Docs", icon: "fa-book" },
  ];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Track session (non-blocking — fire and forget to avoid slowing page loads)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = headersList.get("user-agent") ?? null;
  trackSession(session.userId, ip, ua).catch(() => {});

  const isAdmin = session.role === "superadmin";
  const account = await getCurrentAccount(session.userId);
  const isPaid = account?.planTier !== "free";
  const showPartners = isAdmin || isPaid;

  // Fetch all account contexts for context switching
  const accountContexts: AccountSwitchContext[] = isAdmin
    ? []
    : await getAllAccountContexts(session.userId);

  // Determine if the user is currently in a partner_member context.
  // If the user has multiple contexts, the active context cookie decides;
  // otherwise fall back to checking their profile role.
  const partnerCtx = await getPartnerMemberContext(session.userId);
  const isPartnerMember = !!partnerCtx;
  const partnerMemberNav = partnerCtx
    ? getPartnerMemberNav(partnerCtx.partnerId, partnerCtx.allowFormEditing)
    : null;

  // Check for active impersonation
  let impersonatingName: string | null = null;
  if (isAdmin) {
    const impersonateId = await getImpersonatingPartnerId();
    if (impersonateId) {
      const admin = createAdminClient();
      const { data: imp } = await admin
        .from("partners")
        .select("name")
        .eq("id", impersonateId)
        .maybeSingle();
      impersonatingName = imp?.name ?? null;
    }
  }

  let usageLine: string | null = null;
  let usageRatio = 0;
  let usageUsed = 0;
  const usageLimit = account?.submissionsMonthlyLimit ?? null;
  if (account) {
    usageUsed = await getAccountUsage(account.id);
    const limit = usageLimit;
    if (limit === null) {
      usageLine = `${usageUsed} submissions this month`;
      usageRatio = 0;
    } else {
      usageLine = `${usageUsed} / ${limit} submissions`;
      usageRatio = limit > 0 ? Math.min(1, usageUsed / limit) : 1;
    }
  }

  // Fetch active announcements for this user
  const activeAnnouncements = await getActiveAnnouncements(session.userId, session.role);

  // Sidebar display name
  const sidebarName = isPartnerMember && partnerCtx
    ? partnerCtx.partnerName
    : impersonatingName ?? (isAdmin ? "linqme" : (account?.name ?? "linqme"));

  const sidebarLabel = isPartnerMember
    ? "Partner"
    : account ? (TIER_LABELS[account.planTier] ?? account.planTier) : "Platform";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface flex flex-col">
        {/* Impersonation banner */}
        {impersonatingName && <ImpersonationBanner partnerName={impersonatingName} />}

        <DashboardShell
          sidebarName={sidebarName}
          sidebarLabel={sidebarLabel}
          isAdmin={isAdmin}
          isPartnerMember={isPartnerMember}
          showPartners={showPartners}
          accountName={account?.name ?? null}
          workspaceItems={partnerMemberNav ?? WORKSPACE_NAV}
          adminItems={ADMIN_NAV}
          userName={session.fullName || session.email}
          userEmail={session.email}
          userAvatarUrl={session.avatarUrl}
          usageLine={usageLine}
          usageRatio={usageRatio}
          showUsageBar={account?.submissionsMonthlyLimit !== null}
          hasImpersonation={!!impersonatingName}
          accountContexts={accountContexts}
          activePartnerId={partnerCtx?.partnerId ?? accountContexts.find((c) => c.isOwnAccount)?.partnerId ?? accountContexts[0]?.partnerId ?? null}
          announcements={activeAnnouncements}
        >          {/* Upgrade banner for free-tier users near their limit */}
          {account && usageLimit !== null && account.planTier === "free" && (
            <UpgradeBanner
              used={usageUsed}
              limit={usageLimit}
              planName={TIER_LABELS[account.planTier] ?? "Free"}
            />
          )}
          {children}
        </DashboardShell>
      </div>
    </ToastProvider>
  );
}
