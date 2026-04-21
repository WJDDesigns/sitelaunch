import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";

export default async function AdminDashboardPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run stats queries in parallel
  const [
    { count: totalPartners },
    { count: totalUsers },
    { count: totalSubmissions },
    { count: monthSubmissions },
    { count: draftSubmissions },
    { count: activeFormsCount },
    recentEvents,
  ] = await Promise.all([
    admin.from("partners").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("submissions").select("*", { count: "exact", head: true }),
    admin
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .gte("submitted_at", monthStart),
    admin
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    admin
      .from("partner_forms")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("events")
      .select("id, name, props, created_at, profiles ( full_name, email, avatar_url ), partners ( name )")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: "Customers", value: totalPartners ?? 0, icon: "fa-users", href: "/dashboard/admin/partners" },
    { label: "Users", value: totalUsers ?? 0, icon: "fa-user-shield", href: "/dashboard/admin/team" },
    { label: "Submissions", value: totalSubmissions ?? 0, icon: "fa-inbox", href: "/dashboard/submissions" },
    { label: "This Month", value: monthSubmissions ?? 0, icon: "fa-calendar-day", href: null },
    { label: "Drafts", value: draftSubmissions ?? 0, icon: "fa-pen-to-square", href: null },
    { label: "Active Forms", value: activeFormsCount ?? 0, icon: "fa-pen-ruler", href: null },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Platform Overview
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          System-wide diagnostics and stats for linqme.
        </p>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => {
          const inner = (
            <div className="glass-panel rounded-2xl border border-outline-variant/15 p-5 space-y-2 group hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                  {s.label}
                </span>
                <i className={`fa-solid ${s.icon} text-primary/40`} />
              </div>
              <p className="text-2xl font-extrabold text-on-surface font-headline">{s.value.toLocaleString()}</p>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>{inner}</Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Manage Team", desc: "Invite admins and support staff", icon: "fa-user-shield", href: "/dashboard/admin/team" },
          { label: "All Customers", desc: "Search and manage every customer", icon: "fa-sitemap", href: "/dashboard/admin/partners" },
          { label: "Storage", desc: "File storage usage per customer", icon: "fa-hard-drive", href: "/dashboard/admin/storage" },
          { label: "Activity Log", desc: "Audit trail of platform events", icon: "fa-timeline", href: "/dashboard/admin/activity" },
          { label: "Integration Requests", desc: "Most-demanded integration requests", icon: "fa-lightbulb", href: "/dashboard/admin/integrations" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="glass-panel rounded-2xl border border-outline-variant/15 p-5 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <i className={`fa-solid ${link.icon} text-primary`} />
              </div>
              <span className="text-sm font-bold text-on-surface">{link.label}</span>
            </div>
            <p className="text-xs text-on-surface-variant/60">{link.desc}</p>
            <span className="text-xs text-primary font-bold mt-3 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
              Open <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
            </span>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Recent Activity</h2>
          <Link href="/dashboard/admin/activity" className="text-xs text-primary font-bold hover:underline">
            View all <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {(recentEvents.data ?? []).length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-on-surface-variant/60">
              No activity recorded yet.
            </div>
          )}
          {(recentEvents.data ?? []).map((ev) => {
            const actor = Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles;
            const partner = Array.isArray(ev.partners) ? ev.partners[0] : ev.partners;
            return (
              <div key={ev.id} className="px-6 py-3 flex items-center gap-3">
                {actor?.avatar_url ? (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                    <Image src={actor.avatar_url} alt="" fill className="object-cover" sizes="28px" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {(actor?.full_name || actor?.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface truncate">
                    <span className="font-semibold">{actor?.full_name || actor?.email || "System"}</span>
                    {" "}<span className="text-on-surface-variant">{ev.name.replace(/_/g, " ")}</span>
                    {partner && <span className="text-on-surface-variant/60"> on {partner.name}</span>}
                  </p>
                </div>
                <span className="text-[10px] text-on-surface-variant/40 shrink-0">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
