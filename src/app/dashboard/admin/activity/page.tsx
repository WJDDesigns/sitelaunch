import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 30;

const EVENT_ICONS: Record<string, string> = {
  submission_created: "fa-plus-circle",
  submission_submitted: "fa-paper-plane",
  submission_reviewed: "fa-eye",
  partner_created: "fa-users",
  partner_updated: "fa-pen",
  partner_deleted: "fa-trash",
  form_saved: "fa-pen-ruler",
  invite_sent: "fa-envelope",
  invite_accepted: "fa-check-circle",
  user_signed_in: "fa-right-to-bracket",
  user_signed_up: "fa-user-plus",
};

export default async function ActivityLogPage({ searchParams }: PageProps) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: events, count } = await admin
    .from("events")
    .select(
      "id, name, props, created_at, actor_id, profiles ( full_name, email ), partners ( name, slug )",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
      <header>
        <Link href="/dashboard/admin" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mt-2">
          Activity Log
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Audit trail of all platform events. {count ?? 0} total events.
        </p>
      </header>

      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="divide-y divide-outline-variant/5">
          {(events ?? []).length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-on-surface-variant/60">
              <i className="fa-solid fa-timeline text-3xl text-on-surface-variant/20 mb-3 block" />
              No activity recorded yet.
            </div>
          )}
          {(events ?? []).map((ev) => {
            const actor = Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles;
            const partner = Array.isArray(ev.partners) ? ev.partners[0] : ev.partners;
            const icon = EVENT_ICONS[ev.name] ?? "fa-circle";
            const props = (ev.props ?? {}) as Record<string, unknown>;

            return (
              <div key={ev.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
                  <i className={`fa-solid ${icon} text-xs text-primary/60`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface">
                    <span className="font-semibold">{actor?.full_name || actor?.email || "System"}</span>
                    {" "}
                    <span className="text-on-surface-variant">{ev.name.replace(/_/g, " ")}</span>
                    {partner && (
                      <span className="text-on-surface-variant/60"> on <span className="text-on-surface">{partner.name}</span></span>
                    )}
                  </p>
                  {Object.keys(props).length > 0 && (
                    <p className="text-xs text-on-surface-variant/40 font-mono mt-0.5 truncate">
                      {Object.entries(props).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-on-surface-variant/60">{new Date(ev.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px] text-on-surface-variant/40">{new Date(ev.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant/60">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/admin/activity?page=${page - 1}`}
                  className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                >
                  <i className="fa-solid fa-chevron-left text-[10px] mr-1" /> Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/dashboard/admin/activity?page=${page + 1}`}
                  className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                >
                  Next <i className="fa-solid fa-chevron-right text-[10px] ml-1" />
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
