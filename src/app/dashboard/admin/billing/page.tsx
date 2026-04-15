import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllPlans } from "@/lib/plans";
import AdminPlanChanger from "./AdminPlanChanger";
import RefundButton from "./RefundButton";
import SetupStripeButton from "./SetupStripeButton";
import PlanManager from "./PlanManager";

const TIER_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free: { label: "Free", color: "text-on-surface-variant/60", bg: "bg-surface-container-high", border: "border-outline-variant/15" },
  paid: { label: "Pro", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  unlimited: { label: "Pro", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  enterprise: { label: "Enterprise", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

export default async function AdminBillingPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  // ── Metrics ──
  const { count: totalPartners } = await admin
    .from("partners")
    .select("id", { count: "exact", head: true });

  const { data: activeSubs } = await admin
    .from("subscriptions")
    .select("id, plan_tier, stripe_price_id, status")
    .in("status", ["active", "trialing"]);

  // Fetch plans from DB
  const dbPlans = await getAllPlans();
  const planPriceMap: Record<string, number> = {};
  for (const p of dbPlans) {
    planPriceMap[p.slug] = p.priceMonthly;
  }

  // Calculate MRR
  let mrr = 0;
  for (const sub of activeSubs ?? []) {
    mrr += planPriceMap[sub.plan_tier] ?? 0;
  }

  // Tier breakdown
  const tierCounts: Record<string, number> = { free: 0, paid: 0, unlimited: 0, enterprise: 0 };
  const { data: allPartners } = await admin
    .from("partners")
    .select("plan_tier")
    .is("parent_partner_id", null);

  for (const p of allPartners ?? []) {
    tierCounts[p.plan_tier ?? "free"] = (tierCounts[p.plan_tier ?? "free"] ?? 0) + 1;
  }

  // Canceled this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count: canceledThisMonth } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "canceled")
    .gte("canceled_at", monthStart);

  // ── All subscriptions with partner info ──
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("id, plan_tier, status, current_period_end, cancel_at_period_end, partner_id")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get partner names for subscriptions
  const partnerIds = [...new Set((subscriptions ?? []).map(s => s.partner_id))];
  let partnerMap: Record<string, { name: string; slug: string; plan_tier: string }> = {};
  if (partnerIds.length > 0) {
    const { data: partners } = await admin
      .from("partners")
      .select("id, name, slug, plan_tier")
      .in("id", partnerIds);
    for (const p of partners ?? []) {
      partnerMap[p.id] = { name: p.name, slug: p.slug, plan_tier: p.plan_tier };
    }
  }

  // ── All partners for plan management ──
  const { data: manageable } = await admin
    .from("partners")
    .select("id, name, slug, plan_tier, stripe_customer_id")
    .is("parent_partner_id", null)
    .order("name");

  // ── Recent invoices (all partners) ──
  const { data: recentInvoices } = await admin
    .from("invoices")
    .select("id, partner_id, status, amount_paid, amount_due, currency, invoice_url, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get partner names for invoices
  const invoicePartnerIds = [...new Set((recentInvoices ?? []).map(i => i.partner_id))];
  let invoicePartnerMap: Record<string, string> = {};
  if (invoicePartnerIds.length > 0) {
    const { data: ips } = await admin
      .from("partners")
      .select("id, name")
      .in("id", invoicePartnerIds);
    for (const p of ips ?? []) {
      invoicePartnerMap[p.id] = p.name;
    }
  }

  // ── Recent billing events ──
  const { data: recentEvents } = await admin
    .from("billing_events")
    .select("id, partner_id, event_type, description, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(15);

  const eventPartnerIds = [...new Set((recentEvents ?? []).map(e => e.partner_id))];
  let eventPartnerMap: Record<string, string> = {};
  if (eventPartnerIds.length > 0) {
    const { data: eps } = await admin
      .from("partners")
      .select("id, name")
      .in("id", eventPartnerIds);
    for (const p of eps ?? []) {
      eventPartnerMap[p.id] = p.name;
    }
  }

  const EVENT_ICONS: Record<string, string> = {
    subscription_created: "fa-plus-circle text-tertiary",
    subscription_updated: "fa-rotate text-primary",
    subscription_canceled: "fa-circle-xmark text-error",
    payment_succeeded: "fa-circle-check text-tertiary",
    payment_failed: "fa-triangle-exclamation text-error",
    refund_issued: "fa-rotate-left text-amber-400",
    manual_change: "fa-user-shield text-primary",
    plan_changed: "fa-arrow-right-arrow-left text-primary",
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <Link href="/dashboard/admin" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Billing &amp; Subscriptions
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage customer plans, view revenue metrics, and handle refunds.
        </p>
      </header>

      {/* ── Quick Links ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin/billing/coupons"
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface hover:border-primary/30 hover:text-primary transition-all"
        >
          <i className="fa-solid fa-ticket text-xs text-primary" />
          Manage Coupons
        </Link>
      </div>

      {/* ── Revenue Metrics ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={`$${(mrr / 100).toLocaleString()}`} icon="fa-chart-line" />
        <MetricCard label="Active Subscriptions" value={String((activeSubs ?? []).length)} icon="fa-credit-card" />
        <MetricCard label="Total Customers" value={String(totalPartners ?? 0)} icon="fa-building" />
        <MetricCard label="Churned (this mo.)" value={String(canceledThisMonth ?? 0)} icon="fa-arrow-trend-down" />
      </section>

      {/* ── Tier Breakdown ── */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          Plan Distribution
        </h2>
        <div className="flex items-end gap-3 h-24">
          {Object.entries(tierCounts).map(([tier, count]) => {
            const total = Object.values(tierCounts).reduce((a, b) => a + b, 0) || 1;
            const pct = Math.round((count / total) * 100);
            const badge = TIER_BADGES[tier] ?? TIER_BADGES.free;
            return (
              <div key={tier} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface">{count}</span>
                <div
                  className={`w-full rounded-t-lg ${badge.bg} transition-all`}
                  style={{ height: `${Math.max(8, pct)}%` }}
                />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Customer Plan Management ── */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Manage Customer Plans
          </h2>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            Manually upgrade or downgrade any customer. Changes take effect immediately.
          </p>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {(manageable ?? []).map((p) => {
            const badge = TIER_BADGES[p.plan_tier] ?? TIER_BADGES.free;
            return (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/partners/${p.id}`} className="text-sm font-bold text-on-surface hover:text-primary transition-colors">
                      {p.name}
                    </Link>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badge.bg} ${badge.color} ${badge.border}`}>
                      {badge.label}
                    </span>
                    {p.stripe_customer_id && (
                      <span className="text-[10px] text-on-surface-variant/40">
                        <i className="fa-brands fa-stripe text-sm" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant/60">{p.slug}</p>
                </div>
                <AdminPlanChanger
                  partnerId={p.id}
                  partnerName={p.name}
                  currentTier={p.plan_tier ?? "free"}
                  plans={dbPlans.map(pl => ({ slug: pl.slug, name: pl.name, priceMonthly: pl.priceMonthly }))}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Active Subscriptions ── */}
      {(subscriptions ?? []).length > 0 && (
        <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Subscriptions
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {(subscriptions ?? []).map((sub) => {
              const partner = partnerMap[sub.partner_id];
              const statusColors: Record<string, string> = {
                active: "text-tertiary bg-tertiary/10 border-tertiary/20",
                trialing: "text-primary bg-primary/10 border-primary/20",
                past_due: "text-error bg-error/10 border-error/20",
                canceled: "text-on-surface-variant/60 bg-surface-container-high border-outline-variant/15",
                unpaid: "text-error bg-error/10 border-error/20",
              };
              return (
                <div key={sub.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface">{partner?.name ?? "Unknown"}</p>
                    <p className="text-xs text-on-surface-variant/60 font-mono">{sub.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {sub.current_period_end && (
                      <p className="text-xs text-on-surface-variant/60">
                        {sub.cancel_at_period_end ? "Ends" : "Renews"}{" "}
                        {new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${statusColors[sub.status] ?? statusColors.canceled}`}>
                    {sub.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent Invoices ── */}
      {(recentInvoices ?? []).length > 0 && (
        <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Recent Invoices
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {(recentInvoices ?? []).map((inv) => (
              <div key={inv.id} className="px-6 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface font-medium">
                    {invoicePartnerMap[inv.partner_id] ?? "Unknown"}
                  </p>
                  <p className="text-xs text-on-surface-variant/60">
                    ${(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    {inv.paid_at && ` — ${new Date(inv.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${
                  inv.status === "paid"
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : inv.status === "open"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-surface-container-high text-on-surface-variant/60 border-outline-variant/15"
                }`}>
                  {inv.status}
                </span>
                {inv.status === "paid" && (
                  <RefundButton invoiceId={inv.id} amount={inv.amount_paid} />
                )}
                {inv.invoice_url && (
                  <a href={inv.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline shrink-0">
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Billing Activity Log ── */}
      {(recentEvents ?? []).length > 0 && (
        <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              Billing Activity
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/5">
            {(recentEvents ?? []).map((evt) => (
              <div key={evt.id} className="px-6 py-3 flex items-center gap-3">
                <i className={`fa-solid ${EVENT_ICONS[evt.event_type] ?? "fa-circle text-on-surface-variant/30"} text-sm w-5 text-center shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface">
                    <span className="font-medium">{eventPartnerMap[evt.partner_id] ?? "Unknown"}</span>
                    {" — "}
                    {evt.description}
                  </p>
                  <p className="text-xs text-on-surface-variant/60">
                    {new Date(evt.created_at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                    {evt.created_by && " (manual)"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Plan Management ── */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Manage Plans
          </h2>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            Add, edit, or remove plans. Changes auto-sync with Stripe (creates products/prices, archives old prices).
          </p>
        </div>
        <PlanManager plans={dbPlans} />
      </section>

      {/* ── Stripe Setup ── */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
          Stripe Configuration
        </h2>
        <p className="text-xs text-on-surface-variant/60 mb-4">
          Initialize Stripe products and prices. Run this once per Stripe account to create the SiteLaunch subscription products.
        </p>
        <SetupStripeButton />
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/15 p-5">
      <div className="flex items-center gap-2 mb-2">
        <i className={`fa-solid ${icon} text-primary text-sm`} />
        <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-bold font-headline text-on-surface">{value}</p>
    </div>
  );
}
