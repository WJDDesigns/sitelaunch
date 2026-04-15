import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";
import { mapLegacyTier } from "@/lib/stripe";
import { getPlans } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import TestEmailButton from "../billing/TestEmailButton";
import UpgradeButton from "../billing/UpgradeButton";
import ManageSubscriptionButton from "../billing/ManageSubscriptionButton";
import LogoUploadForm from "../partners/[id]/LogoUploadForm";
import DomainSetup from "../partners/[id]/DomainSetup";
import WhiteLabelSection from "../partners/[id]/WhiteLabelSection";
import WorkspaceBrandingForm from "./WorkspaceBrandingForm";
import {
  uploadWorkspaceLogoAction,
  updateWorkspaceWhiteLabelAction,
  saveWorkspaceDomainAction,
} from "./actions";

export default async function SettingsPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Settings
        </h1>
        <p className="text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  // Fetch full partner record for all branding sections
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("*")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");

  // Billing data
  const usage = await getAccountUsage(account.id);
  const currentTier = mapLegacyTier(account.planTier);
  const plans = await getPlans();
  const currentPlan = plans.find((p) => p.slug === currentTier) ?? plans[0];

  const { data: activeSub } = await admin
    .from("subscriptions")
    .select(
      "id, plan_tier, status, current_period_end, cancel_at_period_end"
    )
    .eq("partner_id", account.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentInvoices } = await admin
    .from("invoices")
    .select(
      "id, status, amount_paid, currency, invoice_url, invoice_pdf, paid_at, period_start, period_end"
    )
    .eq("partner_id", account.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const hasSubscription = !!activeSub;
  const isPastDue = activeSub?.status === "past_due";
  const isCanceling = activeSub?.cancel_at_period_end;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Settings
          </h1>
          <p className="text-on-surface-variant mt-1">
            Manage your workspace branding, domain, and subscription.
          </p>
        </header>

        {/* ─── Logo ─── */}
        {partner && (
          <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Logo
            </h2>
            <LogoUploadForm
              currentLogoUrl={partner.logo_url ?? null}
              uploadAction={uploadWorkspaceLogoAction}
            />
          </section>
        )}

        {/* ─── Workspace Branding ─── */}
        {partner && (
          <WorkspaceBrandingForm workspace={partner} rootHost={rootHost} isSuperadmin={session.role === "superadmin"} />
        )}

        {/* ─── Custom Domain ─── */}
        {partner && (
          <DomainSetup
            partnerId={account.id}
            currentDomain={partner.custom_domain ?? null}
            saveAction={saveWorkspaceDomainAction}
          />
        )}

        {/* ─── White-Label Branding ─── */}
        {partner && (
          <WhiteLabelSection
            partner={partner}
            canEdit={true}
            updateAction={updateWorkspaceWhiteLabelAction}
          />
        )}

        {/* ─── Current Plan ─── */}
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
                  {new Date(activeSub.current_period_end).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </div>
              )}
            </div>
            <ManageSubscriptionButton hasSubscription={hasSubscription} />
          </div>
        </section>

        {/* ─── Plan Cards ─── */}
        <section
          className={`grid grid-cols-1 ${
            plans.length <= 3
              ? "md:grid-cols-3"
              : plans.length === 4
              ? "md:grid-cols-4"
              : "md:grid-cols-3"
          } gap-6`}
        >
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentTier;
            const currentOrder = currentPlan?.sortOrder ?? 0;
            const isDowngrade = plan.sortOrder < currentOrder;
            const isUpgrade = plan.sortOrder > currentOrder;
            const priceLabel =
              plan.priceMonthly === 0
                ? "Free"
                : `$${(plan.priceMonthly / 100).toFixed(0)}/mo`;
            const submissionsLabel =
              plan.submissionsMonthlyLimit === null
                ? "Unlimited submissions"
                : `${plan.submissionsMonthlyLimit} submission${
                    plan.submissionsMonthlyLimit !== 1 ? "s" : ""
                  } / month`;

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
                <div
                  className={`mt-1 text-3xl font-bold font-headline ${
                    plan.highlight ? "text-primary" : ""
                  }`}
                >
                  {priceLabel}
                </div>
                <div className="text-sm mt-1 text-on-surface-variant">
                  {submissionsLabel}
                </div>
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
                    hasSubscription ? (
                      <p className="text-xs text-on-surface-variant/60 text-center py-2.5">
                        Manage subscription to downgrade
                      </p>
                    ) : (
                      <div className="text-xs font-medium text-on-surface-variant/60 text-center py-2.5">
                        Free tier
                      </div>
                    )
                  ) : isUpgrade && plan.priceMonthly > 0 ? (
                    <UpgradeButton
                      tier={plan.slug as "pro" | "enterprise"}
                      label={
                        currentTier === "free"
                          ? "Upgrade"
                          : `Switch to ${plan.name}`
                      }
                      highlight={plan.highlight}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>

        {/* ─── Recent Invoices ─── */}
        {(recentInvoices ?? []).length > 0 && (
          <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Recent Invoices
            </h2>
            <div className="divide-y divide-outline-variant/10">
              {(recentInvoices ?? []).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface font-medium">
                      ${(inv.amount_paid / 100).toFixed(2)}{" "}
                      {inv.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-on-surface-variant/60 mt-0.5">
                      {inv.paid_at
                        ? `Paid ${new Date(inv.paid_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}`
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

        {/* ─── Email Notifications ─── */}
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
    </div>
  );
}
