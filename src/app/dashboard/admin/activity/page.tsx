import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ page?: string; logLevel?: string; logCategory?: string }>;
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

  const { page: pageParam, logLevel, logCategory } = await searchParams;
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

  // ── System logs ──
  let logQuery = admin
    .from("system_logs")
    .select("id, level, category, message, metadata, partner_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (logLevel && logLevel !== "all") {
    logQuery = logQuery.eq("level", logLevel);
  }
  if (logCategory && logCategory !== "all") {
    logQuery = logQuery.eq("category", logCategory);
  }

  const { data: systemLogs, count: logCount } = await logQuery.limit(100);

  // Resolve partner names for logs
  const logPartnerIds = [...new Set((systemLogs ?? []).filter(l => l.partner_id).map(l => l.partner_id as string))];
  let logPartnerMap: Record<string, string> = {};
  if (logPartnerIds.length > 0) {
    const { data: lps } = await admin.from("partners").select("id, name").in("id", logPartnerIds);
    for (const p of lps ?? []) {
      logPartnerMap[p.id] = p.name;
    }
  }

  function buildLogUrl(params: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (logLevel && logLevel !== "all") base.logLevel = logLevel;
    if (logCategory && logCategory !== "all") base.logCategory = logCategory;
    const merged = { ...base, ...params };
    for (const [k, v] of Object.entries(merged)) {
      if (!v || v === "all") delete merged[k];
    }
    const qs = new URLSearchParams(merged as Record<string, string>).toString();
    return `/dashboard/admin/activity${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-6">
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

      {/* ── System Log ── */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                System Log
              </h2>
              <p className="text-xs text-on-surface-variant/60 mt-0.5">
                Diagnostics from auth, billing, forms, and integrations. {logCount ?? 0} total entries.
              </p>
            </div>
          </div>
          {/* Filters */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {["all", "error", "warn", "info"].map((lvl) => (
              <Link
                key={lvl}
                href={buildLogUrl({ logLevel: lvl === "all" ? undefined : lvl })}
                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                  (logLevel ?? "all") === lvl
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-surface-container text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                }`}
              >
                {lvl === "error" && <i className="fa-solid fa-circle-exclamation text-error mr-1" />}
                {lvl === "warn" && <i className="fa-solid fa-triangle-exclamation text-amber-400 mr-1" />}
                {lvl === "info" && <i className="fa-solid fa-circle-info text-primary/50 mr-1" />}
                {lvl}
              </Link>
            ))}
            <span className="text-on-surface-variant/20 mx-1">|</span>
            {["all", "auth", "billing", "stripe", "forms", "integrations", "invites"].map((cat) => (
              <Link
                key={cat}
                href={buildLogUrl({ logCategory: cat === "all" ? undefined : cat })}
                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                  (logCategory ?? "all") === cat
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-surface-container text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        {(systemLogs ?? []).length > 0 ? (
          <div className="divide-y divide-outline-variant/5 max-h-[700px] overflow-y-auto">
            {(systemLogs ?? []).map((log) => {
              const levelIcon = log.level === "error"
                ? "fa-circle-exclamation text-error"
                : log.level === "warn"
                ? "fa-triangle-exclamation text-amber-400"
                : "fa-circle-info text-primary/50";
              const levelBg = log.level === "error"
                ? "bg-error/5"
                : log.level === "warn"
                ? "bg-amber-500/5"
                : "";
              const meta = (log.metadata && typeof log.metadata === "object") ? log.metadata as Record<string, unknown> : {};
              const metaKeys = Object.keys(meta);
              return (
                <div key={log.id} className={`px-6 py-3 ${levelBg}`}>
                  <div className="flex items-start gap-3">
                    <i className={`fa-solid ${levelIcon} text-sm w-5 text-center shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 bg-surface-container-high px-1.5 py-0.5 rounded">
                          {log.category}
                        </span>
                        {log.partner_id && (
                          <span className="text-[10px] text-on-surface-variant/50">
                            {logPartnerMap[log.partner_id] ?? log.partner_id.slice(0, 8)}
                          </span>
                        )}
                        <span className="text-[10px] text-on-surface-variant/40 ml-auto shrink-0">
                          {new Date(log.created_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface mt-0.5">{log.message}</p>
                      {metaKeys.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {metaKeys.map((k) => (
                            <span key={k} className="text-[10px] text-on-surface-variant/50 font-mono">
                              {k}={String(meta[k])}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-on-surface-variant/60">
            <i className="fa-solid fa-terminal text-2xl text-on-surface-variant/20 mb-3 block" />
            No system logs yet. Logs will appear as users interact with the platform.
          </div>
        )}
      </section>
    </div>
  );
}
