"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

interface ChartDay {
  date: string;
  label: string;
  views: number;
  unique: number;
}

interface FunnelRow {
  form: string;
  views: number;
  starts: number;
  completions: number;
  conversionRate: number;
}

interface TopPage {
  path: string;
  count: number;
}

interface Stats {
  totalViews: number;
  uniqueViews: number;
  totalSubmissions: number;
  completedSubmissions: number;
  draftSubmissions: number;
  partnerCount: number;
  viewsTrend: number;
  subsTrend: number;
  last7Views: number;
  last7Subs: number;
}

interface Props {
  chartData: ChartDay[];
  funnelData: FunnelRow[];
  topPages: TopPage[];
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

// Custom tooltip for recharts
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

export default function AnalyticsCharts({ chartData, funnelData, topPages, stats }: Props) {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Page views" value={stats.totalViews.toLocaleString()} trend={stats.viewsTrend} icon="fa-eye" />
        <StatCard label="Unique visitors" value={stats.uniqueViews.toLocaleString()} icon="fa-user" />
        <StatCard label="Submissions" value={stats.totalSubmissions.toLocaleString()} trend={stats.subsTrend} icon="fa-inbox" />
        <StatCard label="Completed" value={stats.completedSubmissions.toLocaleString()} icon="fa-circle-check" />
      </div>

      {/* Views chart */}
      <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-sm font-bold text-on-surface mb-4">Page views (last 30 days)</h2>
        {stats.totalViews > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="rgb(var(--color-primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--color-tertiary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="rgb(var(--color-tertiary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-on-surface) / 0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(Math.floor(chartData.length / 7) - 1, 0)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgb(var(--color-on-surface-variant) / 0.5)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="views"
                name="Total views"
                stroke="rgb(var(--color-primary))"
                strokeWidth={2}
                fill="url(#viewsGrad)"
              />
              <Area
                type="monotone"
                dataKey="unique"
                name="Unique"
                stroke="rgb(var(--color-tertiary))"
                strokeWidth={2}
                fill="url(#uniqueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant/40">
            <i className="fa-solid fa-chart-area text-3xl mb-3" />
            <p className="text-sm">No page view data yet</p>
            <p className="text-xs mt-1">Views will appear here once clients visit your storefront.</p>
          </div>
        )}
      </div>

      {/* Form funnel + top pages side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form funnel */}
        <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-4">Form conversion funnel</h2>
          {funnelData.length > 0 ? (
            <div className="space-y-4">
              {funnelData.map((f) => (
                <div key={f.form} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface font-mono">/{f.form}</span>
                    <span className="text-xs font-bold text-primary">{f.conversionRate}% conversion</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    {[
                      { label: "Views", value: f.views, color: "bg-on-surface-variant/20" },
                      { label: "Starts", value: f.starts, color: "bg-primary/40" },
                      { label: "Completed", value: f.completions, color: "bg-tertiary/60" },
                    ].map((bar) => {
                      const max = Math.max(f.views, 1);
                      const pct = Math.max((bar.value / max) * 100, 2);
                      return (
                        <div key={bar.label} className="flex-1 relative group">
                          <div
                            className={`${bar.color} rounded-md h-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-on-surface/70">
                            {bar.value} {bar.label.toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
              <i className="fa-solid fa-filter text-2xl mb-3" />
              <p className="text-xs">No form events recorded yet.</p>
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="bg-surface-container/60 backdrop-blur-md rounded-2xl border border-outline-variant/15 p-6">
          <h2 className="text-sm font-bold text-on-surface mb-4">Top pages</h2>
          {topPages.length > 0 ? (
            <div className="space-y-2">
              {topPages.map((p, i) => {
                const max = topPages[0]?.count ?? 1;
                const pct = (p.count / max) * 100;
                return (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-on-surface-variant/40 w-4 text-right">{i + 1}</span>
                    <div className="flex-1 relative h-8 bg-surface-container-high/30 rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/15 rounded-lg transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between px-3 h-full">
                        <span className="text-xs font-mono text-on-surface truncate">{p.path}</span>
                        <span className="text-xs font-bold text-on-surface-variant shrink-0 ml-2">{p.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
              <i className="fa-solid fa-ranking-star text-2xl mb-3" />
              <p className="text-xs">No page data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Draft submissions" value={stats.draftSubmissions} icon="fa-pen" />
        <StatCard label="Sub-partners" value={stats.partnerCount} icon="fa-users" />
        <StatCard label="7-day views" value={stats.last7Views.toLocaleString()} trend={stats.viewsTrend} icon="fa-chart-line" />
      </div>
    </div>
  );
}
