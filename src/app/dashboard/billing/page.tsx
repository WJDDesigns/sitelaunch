import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";
import { PLANS, mapLegacyTier, type BillingTier } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import TestEmailButton from "./TestEmailButton";
import UpgradeButton from "./UpgradeButton";
import ManageSubscriptionButton from "./ManageSubscriptionButton";

interface TierCard {
  tier: BillingTier;
  name: string;
  price: string;
  submissions: string;
  features: string[];
  highlight?: boolean;
}

const TIER_CARDS: TierCard[] = [
  {
    tier: "free",
    name: PLANS.free.name,
    price: "Free",
    submissions: "1 submission / month",
    features: PLANS.free.features,
  },
  {
    tier: "pro",
    name: PLANS.pro.name,
    price: `$${PLANS.pro.priceMonthly / 100}/mo`,
    submissions: "Unlimited submissions",
    features: PLANS.pro.features,
    highlight: true,
  },
  {
    tier: "enterprise",
    name: PLANS.enterprise.name,
    price: `$${PLANS.enterprise.priceMonthly / 100}/mo`,
    submissions: "Unlimited submissions",
    features: PLANS.enterprise.features,
  },
];

export default async function BillingPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  const usage = await getAccountUsage(account.id);
  const currentTier = mapLegacyTier(account.planTier);

  // Fetch active subscription and recent invoices
  const admin = createAdminClient();
  const { data: activeSub } = await admin
    .from("subscriptions")
    .select("id, plan_tier, status, current_period_end, cancel_at_period_end")
    .eq("partner_id", account.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentInvoices } = await admin
    .from("invoices")
    .select("id, status, amount_paid, currency, invoice_url, invoice_pdf, paid_at, period_start, period_end")
    .eq("partner_id", account.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const hasSubscription = !!activeSub;
  const isPastDue = activeSub?.status === "past_due";
  const isCanceling = activeSub?.cancel_at_period_end;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Settings &amp; Plan</h1>
        <p className="text-on-surface-variant mt-1">
          Manage your subscription, billing, and workspace settings.
        </p>
      </header>

      {/* Current plan summary */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">
              Current plan
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xl font-bold text-on-surface font-headline">
                {PLANS[currentTier].name}
              </span>
              {isPastDue && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-error/10 text-error border border-error/20">
                  Past Due
                </span>
              )}
              {isCanceling && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Canceling
                </span>
              )}
            </div>
            <div className="text-sm text-on-surface-variant mt-0.5">
              {usage}
              {account.submissionsMonthlyLimit !== null
                ? ` / ${account.submissionsMonthlyLimit}`
                : ""}{" "}
              submissions used this month
            </div>
            {activeSub?.current_period_end && (
              <div className="text-xs text-on-surface-variant/60 mt-1">
                {isCanceling ? "Access until" : "Next billing date"}:{" "}
                {new Date(activeSub.current_period_end).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
          <ManageSubscriptionButton hasSubscription={hasSubscription} />
        </div>
      </section>

      {/* Plan cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIER_CARDS.map((t) => {
          const isCurrent = t.tier === currentTier;
          const isDowngrade = t.tier === "free" && currentTier !== "free";
          const isUpgrade = !isCurrent && !isDowngrade;

          return (
            <div
              key={t.tier}
              className={`rounded-2xl p-6 flex flex-col ${
                t.highlight
                  ? "glass-panel border-2 border-primary relative scale-105 z-10 shadow-2xl"
                  : "bg-surface-container-low border border-outline-variant/10"
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] uppercase font-bold tracking-widest px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">
                {t.name}
              </div>
              <div className={`mt-1 text-3xl font-bold font-headline ${t.highlight ? "text-primary" : ""}`}>
                {t.price}
              </div>
              <div className="text-sm mt-1 text-on-surface-variant">{t.submissions}</div>
              <ul className="mt-4 space-y-2 text-sm flex-grow">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <i className="fa-solid fa-check text-tertiary text-xs" />
                    <span className="text-on-surface-variant">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="text-xs font-medium text-on-surface-variant/60 text-center py-2.5">
                    Your current plan
                  </div>
                ) : isDowngrade ? (
                  hasSubscription ? (
                    <p className="text-xs text-on-surface-variant/60 text-center py-2.5">
                      Manage subscription to downgrade
                    </p>
                  ) : (
                    <div className="text-xs font-medium text-on-surface-variant/60 text-center py-2.5">
                      Free tier
                    </div>
                  )
                ) : isUpgrade && t.tier !== "free" ? (
                  <UpgradeButton
                    tier={t.tier}
                    label={currentTier === "free" ? "Upgrade" : `Switch to ${t.name}`}
                    highlight={t.highlight}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      {/* Recent invoices */}
      {(recentInvoices ?? []).length > 0 && (
        <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
            Recent Invoices
          </h2>
          <div className="divide-y divide-outline-variant/10">
            {(recentInvoices ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-on-surface font-medium">
                    ${(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                  </p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">
                    {inv.paid_at
                      ? `Paid ${new Date(inv.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : `Status: ${inv.status}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                      inv.status === "paid"
                        ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                        : inv.status === "open"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-surface-container-high text-on-surface-variant/60 border-outline-variant/15"
                    }`}
                  >
                    {inv.status}
                  </span>
                  {inv.invoice_url && (
                    <a
                      href={inv.invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                  )}
                  {inv.invoice_pdf && (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-on-surface-variant/60 hover:text-primary"
                    >
                      <i className="fa-solid fa-download text-[10px]" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Email notifications */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
          Email notifications
        </h2>
        <p className="text-xs text-on-surface-variant/60 mb-3">
          We use Resend to notify you when a client submits. Send a test
          message to confirm your setup.
        </p>
        <TestEmailButton />
      </section>
    </div>
  );
}
