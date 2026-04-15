import { requireSession, getCurrentAccount, getAccountUsage, getImpersonatingPartnerId, getPartnerMemberContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import SidebarNav from "./SidebarNav";
import ImpersonationBanner from "./ImpersonationBanner";
import ThemeToggle from "@/components/ThemeToggle";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import Link from "next/link";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  paid: "Paid",
  unlimited: "Unlimited",
  enterprise: "Enterprise",
};

const WORKSPACE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "fa-table-cells" },
  { href: "/dashboard/form", label: "Form Builder", icon: "fa-pen-ruler" },
  { href: "/dashboard/submissions", label: "Submissions", icon: "fa-inbox" },
  { href: "/dashboard/settings", label: "Settings", icon: "fa-gear" },
];

const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Platform", icon: "fa-chart-line" },
  { href: "/dashboard/admin/billing", label: "Billing", icon: "fa-credit-card" },
  { href: "/dashboard/admin/team", label: "Team", icon: "fa-user-shield" },
  { href: "/dashboard/admin/partners", label: "Customers", icon: "fa-sitemap" },
  { href: "/dashboard/admin/activity", label: "Activity Log", icon: "fa-timeline" },
];

/** Scoped nav for partner_member users — they only see their own partner's stuff */
function getPartnerMemberNav(partnerId: string, allowFormEditing: boolean) {
  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: "fa-table-cells" },
    { href: `/dashboard/partners/${partnerId}`, label: "Branding", icon: "fa-palette" },
    { href: "/dashboard/submissions", label: "Submissions", icon: "fa-inbox" },
    { href: "/dashboard/settings", label: "Profile", icon: "fa-user" },
  ];
  if (allowFormEditing) {
    nav.splice(2, 0, { href: "/dashboard/form", label: "Form Builder", icon: "fa-pen-ruler" });
  }
  return nav;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.role === "superadmin";
  const isPartnerMember = session.role === "partner_member";
  const account = await getCurrentAccount(session.userId);
  const showPartners = isAdmin || account?.planType === "agency_plus_partners";

  // Partner member scoped context
  const partnerCtx = isPartnerMember ? await getPartnerMemberContext(session.userId) : null;
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
  if (account) {
    const used = await getAccountUsage(account.id);
    const limit = account.submissionsMonthlyLimit;
    if (limit === null) {
      usageLine = `${used} submissions this month`;
      usageRatio = 0;
    } else {
      usageLine = `${used} / ${limit} submissions`;
      usageRatio = limit > 0 ? Math.min(1, used / limit) : 1;
    }
  }

  // Sidebar display name
  const sidebarName = isPartnerMember && partnerCtx
    ? partnerCtx.partnerName
    : impersonatingName ?? (isAdmin ? "SiteLaunch" : (account?.name ?? "SiteLaunch"));

  const sidebarLabel = isPartnerMember
    ? "Partner"
    : account ? (TIER_LABELS[account.planTier] ?? account.planTier) : "Platform";

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Impersonation banner */}
      {impersonatingName && <ImpersonationBanner partnerName={impersonatingName} />}

      <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-screen fixed left-0 border-r border-on-surface/[0.06] bg-background/80 backdrop-blur-xl z-40" style={impersonatingName ? { top: "40px", height: "calc(100vh - 40px)" } : undefined}>
        {/* Logo */}
        <div className="px-6 py-6 mb-2">
          <Link href="/" className="flex items-center gap-3">
            <SiteLaunchLogo className="h-10 w-auto text-primary" ringClassName="text-on-surface/60" />
            <div>
              <h2 className="text-lg font-bold text-on-surface font-headline tracking-tight">
                {sidebarName}
              </h2>
              <p className="text-[10px] text-primary/60 uppercase tracking-widest font-semibold">
                {sidebarLabel}
              </p>
            </div>
          </Link>
        </div>

        {/* Nav with mode toggle */}
        <SidebarNav
          isAdmin={isAdmin}
          isPartnerMember={isPartnerMember}
          showPartners={showPartners}
          accountName={account?.name ?? null}
          workspaceItems={partnerMemberNav ?? WORKSPACE_NAV}
          adminItems={ADMIN_NAV}
        />

        {/* Usage meter — workspace context */}
        {usageLine && (
          <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.06]">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-1 font-label">
              Usage
            </div>
            <div className="text-xs text-on-surface">{usageLine}</div>
            {account?.submissionsMonthlyLimit !== null && (
              <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-primary to-inverse-primary transition-all rounded-full"
                  style={{ width: `${Math.round(usageRatio * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <div className="px-3 mb-2">
          <ThemeToggle />
        </div>

        {/* User footer */}
        <div className="border-t border-on-surface/[0.06] px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-tertiary/10 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/10">
              {(session.fullName || session.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">
                {session.fullName || session.email}
              </p>
              <p className="text-[10px] text-on-surface-variant/50 truncate">{session.email}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="px-3 mt-1">
            <button className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors duration-300 uppercase tracking-widest">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {children}
      </main>
      </div>
    </div>
  );
}
