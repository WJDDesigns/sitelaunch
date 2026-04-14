import Link from "next/link";
import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  paid: "Paid",
  unlimited: "Unlimited",
  enterprise: "Enterprise",
};

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
      usageLine = `${used} submissions this month · Unlimited`;
      usageRatio = 0;
    } else {
      usageLine = `${used} / ${limit} submissions this month`;
      usageRatio = limit > 0 ? Math.min(1, used / limit) : 1;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col min-h-screen">
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="text-xl font-bold tracking-tight">SiteLaunch</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? "Platform superadmin"
                : account?.name ?? "Your workspace"}
            </div>
            {account && (
              <div className="mt-2 inline-block text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {TIER_LABELS[account.planTier] ?? account.planTier}
              </div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Overview
            </Link>
            {showPartners && (
              <Link
                href="/dashboard/partners"
                className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
              >
                {isAdmin ? "Partners" : "Sub-partners"}
              </Link>
            )}
            <Link
              href="/dashboard/form"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Form editor
            </Link>
            <Link
              href="/dashboard/submissions"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Submissions
            </Link>
            <Link
              href="/dashboard/billing"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Billing &amp; plan
            </Link>
          </nav>

          {/* Usage meter */}
          {usageLine && (
            <div className="px-4 py-3 border-t border-slate-200">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Usage
              </div>
              <div className="text-xs text-slate-700">{usageLine}</div>
              {account?.submissionsMonthlyLimit !== null && (
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-slate-900 transition-all"
                    style={{ width: `${Math.round(usageRatio * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-1">Signed in as</div>
            <div className="text-sm font-medium text-slate-900 truncate">
              {session.fullName || session.email}
            </div>
            <div className="text-xs text-slate-500 truncate">{session.email}</div>
            <form action="/auth/signout" method="post" className="mt-3">
              <button className="w-full text-left text-xs text-slate-500 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
