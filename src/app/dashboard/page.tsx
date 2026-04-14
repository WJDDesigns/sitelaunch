import Link from "next/link";
import { requireSession, getVisiblePartners } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardOverview() {
  const session = await requireSession();
  const partners = await getVisiblePartners();

  // Some aggregate metrics for superadmin
  const supabase = await createClient();
  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {session.role === "superadmin" ? "Overview" : "Your dashboard"}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {session.role === "superadmin"
            ? "Platform-wide view. Manage partners, track submissions, configure settings."
            : "Manage your brand, form, and client submissions."}
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Partners" value={partners.length.toString()} />
        <StatCard label="Submissions" value={(submissionCount ?? 0).toString()} />
        <StatCard label="Role" value={session.role} />
      </div>

      {/* Recent partners */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Partners</h2>
          {session.role === "superadmin" && (
            <Link
              href="/dashboard/partners/new"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              + New partner
            </Link>
          )}
        </div>

        {partners.length === 0 ? (
          <p className="text-sm text-slate-500">
            No partners yet. {session.role === "superadmin" && "Create one to get started."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {partners.slice(0, 5).map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: p.primary_color || "#2563eb" }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.custom_domain || `${p.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/partners/${p.id}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Manage →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
