import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";
import SidebarNav from "./SidebarNav";
import ThemeToggle from "@/components/ThemeToggle";

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
  { href: "/dashboard/billing", label: "Settings", icon: "fa-gear" },
];

const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Platform", icon: "fa-chart-line" },
  { href: "/dashboard/admin/billing", label: "Billing", icon: "fa-credit-card" },
  { href: "/dashboard/admin/team", label: "Team", icon: "fa-user-shield" },
  { href: "/dashboard/admin/partners", label: "All Partners", icon: "fa-sitemap" },
  { href: "/dashboard/admin/activity", label: "Activity Log", icon: "fa-timeline" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.role === "superadmin";
  const account = await getCurrentAccount(session.userId);
  const showPartners = isAdmin || account?.planType === "agency_plus_partners";

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

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-screen fixed left-0 border-r border-on-surface/10 bg-background z-40">
        {/* Logo */}
        <div className="px-6 py-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-inverse-primary flex items-center justify-center">
              <span className="text-surface text-sm font-bold">S</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface font-headline tracking-tight">
                {isAdmin ? "SiteLaunch" : (account?.name ?? "SiteLaunch")}
              </h2>
              <p className="text-[10px] text-primary/60 uppercase tracking-widest font-semibold">
                {account ? (TIER_LABELS[account.planTier] ?? account.planTier) : "Platform"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav with mode toggle */}
        <SidebarNav
          isAdmin={isAdmin}
          showPartners={showPartners}
          accountName={account?.name ?? null}
          workspaceItems={WORKSPACE_NAV}
          adminItems={ADMIN_NAV}
        />

        {/* Usage meter — workspace context */}
        {usageLine && (
          <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-container-low">
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-1 font-label">
              Usage
            </div>
            <div className="text-xs text-on-surface">{usageLine}</div>
            {account?.submissionsMonthlyLimit !== null && (
              <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-primary transition-all rounded-full"
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
        <div className="border-t border-on-surface/5 px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-primary">
              {(session.fullName || session.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">
                {session.fullName || session.email}
              </p>
              <p className="text-[10px] text-on-surface-variant truncate">{session.email}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="px-3 mt-1">
            <button className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors uppercase tracking-widest">
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
  );
}
