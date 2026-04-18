import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";
import { mapLegacyTier } from "@/lib/stripe";
import { getPlans } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import UpgradeButton from "./UpgradeButton";
import SwitchPlanButton from "./SwitchPlanButton";
import CancelPlanButton from "./CancelPlanButton";
import ManageSubscriptionButton from "./ManageSubscriptionButton";
import InvoicesTable from "./InvoicesTable";

export default async function BillingPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  const usage = await getAccountUsage(account.id);
  const plans = await getPlans();

  // Superadmins always get the highest tier
  const isAdminUser = session.role === "superadmin";
  const highestPlan = plans.length > 0 ? plans[plans.length - 1] : null;
  const currentTier = isAdminUser ? (highestPlan?.slug ?? "supernova") : mapLegacyTier(account.planTier);

  // Find the current plan from DB
  const currentPlan = plans.find((p) => p.slug === currentTier) ?? plans[0];

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
    .limit(50);

  const hasSubscription = !!activeSub;
  const isPastDue = activeSub?.status === "past_due";
  const isCanceling = activeSub?.cancel_at_period_end;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Billing</h1>
        <p className="text-on-surface-variant mt-1">
          Manage your subscription, plan, and invoices.
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
                {currentPlan?.name ?? currentTier}
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

      {/* Plan cards — dynamically from DB */}
      <section className={`grid grid-cols-1 ${plans.length <= 3 ? "md:grid-cols-3" : plans.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6`}>
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentTier;
          const currentOrder = currentPlan?.sortOrder ?? 0;
          const isDowngrade = plan.sortOrder < currentOrder;
          const isUpgrade = plan.sortOrder > currentOrder;
          const priceLabel = plan.priceMonthly === 0 ? "Free" : `$${(plan.priceMonthly / 100).toFixed(0)}/mo`;
          const submissionsLabel = plan.submissionsMonthlyLimit === null
            ? "Unlimited submissions"
            : `${plan.submissionsMonthlyLimit} submission${plan.submissionsMonthlyLimit !== 1 ? "s" : ""} / month`;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? "glass-panel border-2 border-primary relative scale-105 z-10 shadow-2xl"
                  : "bg-surface-container-low border border-outline-variant/10"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] uppercase font-bold tracking-widest px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">
                {plan.name}
              </div>
              <div className={`mt-1 text-3xl font-bold font-headline ${plan.highlight ? "text-primary" : ""}`}>
                {priceLabel}
              </div>
              <div className="text-sm mt-1 text-on-surface-variant">{submissionsLabel}</div>
              <ul className="mt-4 space-y-2 text-sm flex-grow">
                {plan.features.map((f) => (
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
                  plan.priceMonthly === 0 && hasSubscription ? (
                    /* Paid → Free: cancel at end of period */
                    <CancelPlanButton isCanceling={!!isCanceling} />
                  ) : plan.priceMonthly > 0 && hasSubscription ? (
                    /* Higher paid → Lower paid: switch with proration credit */
                    <SwitchPlanButton
                      targetSlug={plan.slug}
                      label={`Downgrade to ${plan.name}`}
                      isDowngrade
                    />
                  ) : (
                    <div className="text-xs font-medium text-on-surface-variant/60 text-center py-2.5">
                      Free tier
                    </div>
                  )
                ) : isUpgrade && plan.priceMonthly > 0 ? (
                  hasSubscription ? (
                    /* Lower paid → Higher paid: switch with proration */
                    <SwitchPlanButton
                      targetSlug={plan.slug}
                      label={`Upgrade to ${plan.name}`}
                      highlight={plan.highlight}
                    />
                  ) : (
                    /* Free → Paid: new checkout session */
                    <UpgradeButton
                      tier={plan.slug}
                      label="Upgrade"
                      highlight={plan.highlight}
                    />
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      {/* Invoices table */}
      <InvoicesTable invoices={recentInvoices ?? []} />
    </div>
  );
}
