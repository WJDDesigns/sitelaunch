import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilterValue } from "@/lib/utils/sanitize-filter";
import Link from "next/link";
import Image from "next/image";
import TierChanger from "./TierChanger";

interface PageProps {
  searchParams: Promise<{ q?: string; tier?: string; page?: string }>;
}

const PAGE_SIZE = 20;

const TIER_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free: { label: "Free", color: "text-on-surface-variant/60", bg: "bg-surface-container-high", border: "border-outline-variant/15" },
  starter: { label: "Starter", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  paid: { label: "Starter", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  pro: { label: "Pro", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  unlimited: { label: "Agency", color: "text-tertiary", bg: "bg-tertiary/10", border: "border-tertiary/20" },
  enterprise: { label: "Agency", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  agency: { label: "Agency", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { q, tier, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = admin
    .from("partners")
    .select(
      "id, slug, name, custom_domain, logo_url, primary_color, plan_type, plan_tier, parent_partner_id, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (q) {
    const safeQ = sanitizeFilterValue(q);
    query = query.or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%,custom_domain.ilike.%${safeQ}%`);
  }
  if (tier && tier !== "all") {
    query = query.eq("plan_tier", tier);
  }

  const { data: partners, count } = await query.limit(500).range(offset, offset + PAGE_SIZE - 1);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Get submission counts per partner this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const partnerIds = (partners ?? []).map((p) => p.id);

  // Fetch submission counts and last login in parallel
  let subCounts: Record<string, number> = {};
  let lastLogins: Record<string, string | null> = {};

  if (partnerIds.length > 0) {
    const [{ data: subs }, { data: members }] = await Promise.all([
      admin
        .from("submissions")
        .select("partner_id")
        .in("partner_id", partnerIds)
        .gte("submitted_at", monthStart)
        .limit(10000),
      admin
        .from("partner_members")
        .select("partner_id, user_id, profiles ( id )")
        .in("partner_id", partnerIds)
        .eq("role", "partner_owner"),
    ]);

    for (const s of subs ?? []) {
      subCounts[s.partner_id] = (subCounts[s.partner_id] ?? 0) + 1;
    }

    // Get last_sign_in_at from auth.users for each owner
    const ownerUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
    if (ownerUserIds.length > 0) {
      const { data: authUsers } = await admin
        .from("profiles")
        .select("id, updated_at")
        .in("id", ownerUserIds);

      // Map user IDs to last login -- we'll use auth.users directly
      // since profiles doesn't have last_sign_in_at
      const { data: loginData } = await admin.rpc("get_users_last_sign_in", {
        user_ids: ownerUserIds,
      });

      if (loginData && Array.isArray(loginData)) {
        const userLoginMap: Record<string, string> = {};
        for (const u of loginData) {
          userLoginMap[u.id] = u.last_sign_in_at;
        }
        for (const m of members ?? []) {
          if (m.user_id && userLoginMap[m.user_id]) {
            lastLogins[m.partner_id] = userLoginMap[m.user_id];
          }
        }
      } else {
        // Fallback: use profile updated_at as rough proxy
        const profileMap: Record<string, string> = {};
        for (const p of authUsers ?? []) {
          profileMap[p.id] = p.updated_at;
        }
        for (const m of members ?? []) {
          if (m.user_id && profileMap[m.user_id]) {
            lastLogins[m.partner_id] = profileMap[m.user_id];
          }
        }
      }
    }
  }

  function buildUrl(params: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (tier) base.tier = tier;
    const merged: Record<string, string> = { ...base };
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) merged[k] = v;
      else delete merged[k];
    }
    return `/dashboard/admin/customers?${new URLSearchParams(merged).toString()}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-6">
      <header>
        <Link href="/dashboard/admin" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
              Customers
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {count ?? 0} customer{(count ?? 0) !== 1 ? "s" : ""} on the platform.
            </p>
          </div>
          <Link
            href="/dashboard/admin/customers/new"
            className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all whitespace-nowrap"
          >
            <i className="fa-solid fa-plus text-xs mr-2" />New Customer
          </Link>
        </div>
      </header>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1" action="/dashboard/admin/customers" method="get">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass text-xs text-on-surface-variant/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name, slug, or domain..."
              className="block w-full pl-10 pr-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all"
            />
            {tier && <input type="hidden" name="tier" value={tier} />}
          </div>
        </form>
        <div className="flex gap-2">
          {["all", "free", "starter", "pro", "agency"].map((t) => (
            <Link
              key={t}
              href={buildUrl({ tier: t === "all" ? undefined : t, page: undefined })}
              className={`px-3 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl border transition-all ${
                (tier ?? "all") === t
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-surface-container text-on-surface-variant/60 border-outline-variant/15 hover:border-primary/30"
              }`}
            >
              {t === "all" ? "All" : TIER_BADGES[t]?.label ?? t}
            </Link>
          ))}
        </div>
      </div>

      {/* Customer list */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="divide-y divide-outline-variant/5">
          {(partners ?? []).length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-on-surface-variant/60">
              <i className="fa-solid fa-sitemap text-3xl text-on-surface-variant/20 mb-3 block" />
              No customers found.
            </div>
          )}
          {(partners ?? []).map((p) => {
            const monthSubs = subCounts[p.id] ?? 0;
            const lastLogin = lastLogins[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-on-surface/[0.02] transition-colors"
              >
                <Link href={`/dashboard/admin/customers/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  {p.logo_url ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <Image src={p.logo_url} alt="" fill className="object-contain" sizes="40px" />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-on-primary text-sm font-bold shrink-0"
                      style={{ backgroundColor: p.primary_color || "#696cf8" }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface truncate">{p.name}</p>
                      {p.parent_partner_id && (
                        <span className="text-[10px] text-on-surface-variant/40 bg-surface-container-high px-1.5 py-0.5 rounded">sub</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant/60 truncate">
                      {p.custom_domain || `${p.slug}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-on-surface-variant/60">{monthSubs} this mo.</p>
                    <p className="text-[10px] text-on-surface-variant/40">
                      {lastLogin ? (
                        <><i className="fa-solid fa-clock text-[8px] mr-1" />{timeAgo(lastLogin)}</>
                      ) : (
                        <span className="text-on-surface-variant/30">never</span>
                      )}
                    </p>
                  </div>
                </Link>
                <TierChanger partnerId={p.id} currentTier={p.plan_tier} />
                <Link href={`/dashboard/admin/customers/${p.id}`} className="shrink-0">
                  <i className="fa-solid fa-chevron-right text-[10px] text-on-surface-variant/30" />
                </Link>
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
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                >
                  <i className="fa-solid fa-chevron-left text-[10px] mr-1" /> Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
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
