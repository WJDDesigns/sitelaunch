"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface ChartDay { date: string; label: string; views: number; unique: number }
interface GrowthRow { month: string; total: number; cumulative: number }
interface PlanRow { tier: string; count: number }
interface TopPartner { name: string; views: number }

interface Stats {
  totalViews: number;
  uniqueViews: number;
  totalSubs: number;
  completedSubs: number;
  totalPartners: number;
  conversionRate: number;
  viewsTrend: number;
  subsTrend: number;
}

interface Props {
  chartData: ChartDay[];
  growthData: GrowthRow[];
  planData: PlanRow[];
  topPartners: TopPartner[];
  stats: Stats;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[10px] text-on-surface-variant/40 ml-1">—</span>;
  const positive = value > 0;
  return (
    <span className={`text-[10px] font-bold ml-1.5 ${positive ? "text-tertiary" : "text-error"}`}>
      <i className={`fa-solid fa-arrow-${positive ? "up" : "down"} text-[8px] mr-0.5`} />
      {Math.abs(value)}%
    </span>
  );
}

function StatCard({ label, value, trend, icon }: { label: string; value: string | number; trend?: number; icon: string }) {
  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</span>
        <i className={`fa-solid ${icon} text-xs text-on-surface-variant/30`} />
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-extrabold text-on-surface font-headline">{value}</span>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container border border-outline-variant/15 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-on-surface mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-on-surface-variant" style={{ color: p.color }}>
          {p.name}: <span className="font-bold text-on-surface">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const PLAN_COLORS: Record<string, string> = {
  free: "rgb(var(--color-on-surface-variant) / 0.3)",
  paid: "rgb(var(--color-primary))",
  enterprise: "rgb(var(--color-tertiary))",
  unlimited: "rgb(var(--color-secondary))",
};

export default function AdminAnalyticsCharts({ chartData, growthData, planData, topPartners, stats }: Props) {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total views" value={stats.totalViews.toLocaleString()} trend={stats.viewsTrend} icon="fa-eye" />
        <StatCard label="Unique visitors" value={stats.uniqueViews.toLocaleString()} icon="fa-user" />
        <StatCard label="Submissions" value={stats.totalSubs.toLocaleString()} trend={stats.subsTrend} icon="fa-inbox" />
        <StatCard label="Completed" value={stats.completedSubs.toLocaleString()} icon="fa-circle-check" />
        <StatCard label="Partners" value={stats.totalPartners} icon="fa-users" />
        <StatCard label="Conversion" value={`${stats.conversionRate}%`} icon="fa-funnel-dollar" />
      </div>

      {/* Platform views chart */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-sm font-bold text-on-surface mb-4">Platform page views (last 30 days)</h2>
        {stats.totalViews > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="adminViewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="rgb(var(--color-primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-on-surface) / 0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(chartData.length / 7) - 1, 0)} />
              <YAxis tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="views" name="Total views" stroke="rgb(var(--color-primary))" strokeWidth={2} fill="url(#adminViewsGrad)" />
              <Area type="monotone" dataKey="unique" name="Unique" stroke="rgb(var(--color-tertiary))" strokeWidth={2} fill="transparent" strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant/40">
            <i className="fa-solid fa-chart-area text-3xl mb-3" />
            <p className="text-sm">No platform view data yet.</p>
          </div>
        )}
      </div>

      {/* Partner growth + plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Partner growth */}
        <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-4">Partner growth</h2>
          {growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-on-surface) / 0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="cumulative" name="Total partners" stroke="rgb(var(--color-primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Bar dataKey="total" name="New" fill="rgb(var(--color-primary) / 0.2)" radius={4} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
              <p className="text-xs">No partner data yet.</p>
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-4">Plan distribution</h2>
          {planData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={planData} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                    {planData.map((entry) => (
                      <Cell key={entry.tier} fill={PLAN_COLORS[entry.tier] ?? "rgb(var(--color-on-surface-variant) / 0.2)"} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {planData.map((p) => (
                  <div key={p.tier} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.tier] ?? "rgb(var(--color-on-surface-variant) / 0.2)" }} />
                    <span className="text-xs text-on-surface capitalize flex-1">{p.tier}</span>
                    <span className="text-xs font-bold text-on-surface">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
              <p className="text-xs">No plan data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top partners by views */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-sm font-bold text-on-surface mb-4">Top partners by page views</h2>
        {topPartners.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(topPartners.length * 40, 160)}>
            <BarChart data={topPartners} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-on-surface) / 0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "rgb(var(--color-on-surface-variant) / 0.7)" }} tickLine={false} axisLine={false} width={120} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="views" name="Views" fill="rgb(var(--color-primary))" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
            <p className="text-xs">No partner view data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
