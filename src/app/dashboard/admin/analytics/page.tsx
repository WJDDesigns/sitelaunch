import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminAnalyticsCharts from "./AdminAnalyticsChartsLazy";

export default async function AdminAnalyticsPage() {
  const session = await requireSession();
  if (session.role !== "superadmin") redirect("/dashboard");

  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const prior7Start = new Date(now.getTime() - 14 * 86400000).toISOString();

  // Platform-wide page views
  const { data: pageViews } = await admin
    .from("page_views")
    .select("created_at, partner_id, is_unique")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: true })
    .limit(10000);

  // Platform-wide submissions
  const { data: submissions } = await admin
    .from("submissions")
    .select("id, status, created_at, partner_id")
    .gte("created_at", thirtyDaysAgo)
    .limit(10000);

  // All partners (for growth chart)
  const { data: partners } = await admin
    .from("partners")
    .select("id, name, plan_tier, created_at")
    .order("created_at", { ascending: true })
    .limit(10000);

  // Form events
  const { data: formEvents } = await admin
    .from("form_events")
    .select("event_type, created_at")
    .gte("created_at", thirtyDaysAgo)
    .limit(10000);

  // Build daily views chart
  const dailyViews: Record<string, { total: number; unique: number }> = {};
  for (const pv of pageViews ?? []) {
    const day = pv.created_at.slice(0, 10);
    if (!dailyViews[day]) dailyViews[day] = { total: 0, unique: 0 };
    dailyViews[day].total++;
    if (pv.is_unique) dailyViews[day].unique++;
  }

  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    chartData.push({
      date: key,
      label,
      views: dailyViews[key]?.total ?? 0,
      unique: dailyViews[key]?.unique ?? 0,
    });
  }

  // Partner growth (cumulative per month)
  const allPartners = partners ?? [];
  const monthlyGrowth: Record<string, number> = {};
  for (const p of allPartners) {
    const month = p.created_at.slice(0, 7);
    monthlyGrowth[month] = (monthlyGrowth[month] ?? 0) + 1;
  }
  const growthData = Object.entries(monthlyGrowth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce<{ month: string; total: number; cumulative: number }[]>((acc, [month, count]) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({ month, total: count, cumulative: prev + count });
      return acc;
    }, []);

  // Plan distribution
  const planDist: Record<string, number> = {};
  for (const p of allPartners) {
    const tier = p.plan_tier || "free";
    planDist[tier] = (planDist[tier] ?? 0) + 1;
  }
  const planData = Object.entries(planDist).map(([tier, count]) => ({ tier, count }));

  // Top partners by views
  const partnerViewCounts: Record<string, number> = {};
  for (const pv of pageViews ?? []) {
    partnerViewCounts[pv.partner_id] = (partnerViewCounts[pv.partner_id] ?? 0) + 1;
  }
  const partnerNameMap: Record<string, string> = {};
  for (const p of allPartners) partnerNameMap[p.id] = p.name;

  const topPartners = Object.entries(partnerViewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, views]) => ({ name: partnerNameMap[id] ?? id.slice(0, 8), views }));

  // Stats
  const subs = submissions ?? [];
  const totalViews = (pageViews ?? []).length;
  const uniqueViews = (pageViews ?? []).filter((pv) => pv.is_unique).length;
  const totalSubs = subs.length;
  const completedSubs = subs.filter((s) => s.status === "submitted").length;
  const totalPartners = allPartners.length;
  const totalStarts = (formEvents ?? []).filter((e) => e.event_type === "start").length;
  const totalCompletes = (formEvents ?? []).filter((e) => e.event_type === "complete").length;

  const last7Views = (pageViews ?? []).filter((pv) => pv.created_at >= sevenDaysAgo).length;
  const prior7Views = (pageViews ?? []).filter((pv) => pv.created_at >= prior7Start && pv.created_at < sevenDaysAgo).length;
  const viewsTrend = prior7Views > 0 ? Math.round(((last7Views - prior7Views) / prior7Views) * 100) : 0;

  const last7Subs = subs.filter((s) => s.created_at >= sevenDaysAgo).length;
  const prior7Subs = subs.filter((s) => s.created_at >= prior7Start && s.created_at < sevenDaysAgo).length;
  const subsTrend = prior7Subs > 0 ? Math.round(((last7Subs - prior7Subs) / prior7Subs) * 100) : 0;

  const conversionRate = totalStarts > 0 ? Math.round((totalCompletes / totalStarts) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Platform Analytics</h1>
        <p className="text-on-surface-variant mt-1">
          Platform-wide performance across all partners over the last 30 days.
        </p>
      </header>

      <AdminAnalyticsCharts
        chartData={chartData}
        growthData={growthData}
        planData={planData}
        topPartners={topPartners}
        stats={{
          totalViews,
          uniqueViews,
          totalSubs,
          completedSubs,
          totalPartners,
          conversionRate,
          viewsTrend,
          subsTrend,
        }}
      />
    </div>
  );
}
