import Link from "next/link";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const isAdmin = session.role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col min-h-screen">
          <div className="px-6 py-6 border-b border-slate-200">
            <div className="text-xl font-bold tracking-tight">SiteLaunch</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isAdmin ? "Master dashboard" : "Partner dashboard"}
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/partners"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Partners
            </Link>
            <Link
              href="/dashboard/submissions"
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Submissions
            </Link>
            <Link
              href="/dashboard/settings"
              className="block px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed"
              aria-disabled="true"
            >
              Settings <span className="text-[10px] uppercase ml-1">soon</span>
            </Link>
          </nav>

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
