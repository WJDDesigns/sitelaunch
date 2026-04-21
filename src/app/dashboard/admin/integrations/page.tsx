import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

interface LeaderboardRow {
  integration_name: string;
  request_count: number;
  latest_request: string;
  partners: string[];
  sample_descriptions: string[];
}

export default async function AdminIntegrationRequestsPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  // Load all requests with partner info
  const { data: requests } = await admin
    .from("integration_requests")
    .select("integration_name, description, created_at, partners ( name )")
    .order("created_at", { ascending: false });

  // Aggregate into leaderboard
  const map = new Map<string, LeaderboardRow>();

  for (const r of requests ?? []) {
    const name = r.integration_name as string;
    const partner = Array.isArray(r.partners) ? r.partners[0] : r.partners;
    const partnerName = (partner as { name: string } | null)?.name ?? "Unknown";
    const desc = r.description as string | null;

    if (!map.has(name)) {
      map.set(name, {
        integration_name: name,
        request_count: 0,
        latest_request: r.created_at as string,
        partners: [],
        sample_descriptions: [],
      });
    }

    const entry = map.get(name)!;
    entry.request_count += 1;
    if (!entry.partners.includes(partnerName)) {
      entry.partners.push(partnerName);
    }
    if (desc && entry.sample_descriptions.length < 3) {
      entry.sample_descriptions.push(desc);
    }
  }

  // Sort by request count descending
  const leaderboard = Array.from(map.values()).sort(
    (a, b) => b.request_count - a.request_count,
  );

  const totalRequests = requests?.length ?? 0;
  const uniqueIntegrations = leaderboard.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard/admin"
            className="text-xs text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            Admin
          </Link>
          <i className="fa-solid fa-chevron-right text-[8px] text-on-surface-variant/30" />
          <span className="text-xs text-on-surface-variant">
            Integration Requests
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Integration Requests
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          See which integrations your customers want most.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total Requests
          </span>
          <p className="text-2xl font-extrabold text-on-surface font-headline">
            {totalRequests}
          </p>
        </div>
        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Unique Integrations
          </span>
          <p className="text-2xl font-extrabold text-on-surface font-headline">
            {uniqueIntegrations}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-10 text-center">
          <i className="fa-solid fa-plug text-3xl text-on-surface-variant/20 mb-3" />
          <p className="text-sm text-on-surface-variant/60">
            No integration requests yet. Customers can submit requests from the
            Integrations page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((item, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const rankColors = [
              "bg-amber-500/15 text-amber-600 border-amber-500/20",
              "bg-slate-400/15 text-slate-500 border-slate-400/20",
              "bg-orange-400/15 text-orange-500 border-orange-400/20",
            ];

            return (
              <div
                key={item.integration_name}
                className={`glass-panel rounded-2xl border p-5 transition-all ${
                  isTop3
                    ? "border-primary/20 bg-primary/[0.02]"
                    : "border-outline-variant/15"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 border ${
                      isTop3
                        ? rankColors[idx]
                        : "bg-surface-container-highest/50 text-on-surface-variant/50 border-outline-variant/10"
                    }`}
                  >
                    {rank}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold text-on-surface capitalize">
                        {item.integration_name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        <i className="fa-solid fa-arrow-up text-[8px]" />
                        {item.request_count}{" "}
                        {item.request_count === 1 ? "request" : "requests"}
                      </span>
                    </div>

                    {/* Partner names */}
                    <p className="text-xs text-on-surface-variant/60 mb-1">
                      Requested by:{" "}
                      <span className="text-on-surface-variant">
                        {item.partners.slice(0, 5).join(", ")}
                        {item.partners.length > 5 &&
                          ` +${item.partners.length - 5} more`}
                      </span>
                    </p>

                    {/* Sample descriptions */}
                    {item.sample_descriptions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.sample_descriptions.map((desc, i) => (
                          <p
                            key={i}
                            className="text-xs text-on-surface-variant/50 italic pl-3 border-l-2 border-outline-variant/10"
                          >
                            &ldquo;{desc}&rdquo;
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-on-surface-variant/40 shrink-0 hidden sm:block">
                    Latest:{" "}
                    {new Date(item.latest_request).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
