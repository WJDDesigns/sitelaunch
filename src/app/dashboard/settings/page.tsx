import { requireSession, getCurrentAccount, getAccountUsage } from "@/lib/auth";
import { mapLegacyTier } from "@/lib/stripe";
import { getPlans } from "@/lib/plans";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackSession } from "@/lib/session-tracker";
import TestEmailButton from "../billing/TestEmailButton";
import UpgradeButton from "../billing/UpgradeButton";
import SwitchPlanButton from "../billing/SwitchPlanButton";
import CancelPlanButton from "../billing/CancelPlanButton";
import ManageSubscriptionButton from "../billing/ManageSubscriptionButton";
import InvoicesTable from "../billing/InvoicesTable";
import LogoUploadForm from "../partners/[id]/LogoUploadForm";
import DomainSetup from "../partners/[id]/DomainSetup";
import WhiteLabelSection from "../partners/[id]/WhiteLabelSection";
import WorkspaceBrandingForm from "./WorkspaceBrandingForm";
import DataExportSection from "./DataExportSection";
import DeleteAccountSection from "./DeleteAccountSection";
import MfaSettingsSection from "./MfaSettingsSection";
import SessionsSection from "./SessionsSection";
import ProfileSection from "./ProfileSection";
import SettingsTabs from "./SettingsTabs";
import DashboardPaletteSection from "./DashboardPaletteSection";
import SmartOverviewSection from "./SmartOverviewSection";
import ChangelogSection from "./ChangelogSection";
import SupportForm from "../../support/SupportForm";
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Settings
        </h1>
        <p className="text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  // Track session for the sessions management section
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const currentSessionId = await trackSession(session.userId, ip, userAgent);

  // Fetch user profile and partner record in parallel
  const admin = createAdminClient();
  const [{ data: profile }, { data: partner }, { data: aiIntegrations }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", session.userId)
      .maybeSingle(),
    admin
      .from("partners")
      .select("*")
      .eq("id", account.id)
      .maybeSingle(),
    admin
      .from("ai_integrations")
      .select("id")
      .eq("partner_id", account.id)
      .limit(1),
  ]);

  const hasAiProvider = (aiIntegrations ?? []).length > 0;
  const partnerSettings = (partner?.settings as Record<string, unknown>) ?? {};
  const smartOverviewEnabled = partnerSettings.smart_overview_enabled === true;

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(/:\d+$/, "");

  /* ─────────────────────────────────────────────
     Tab: General — Profile, MFA, Sessions, Email
     ───────────────────────────────────────────── */
  const generalContent = (
    <>
      <ProfileSection
        fullName={profile?.full_name ?? session.fullName}
        email={session.email}
        avatarUrl={profile?.avatar_url ?? null}
      />

      <DashboardPaletteSection />

      <SmartOverviewSection enabled={smartOverviewEnabled} hasAiProvider={hasAiProvider} />

      <MfaSettingsSection />

      <SessionsSection currentSessionId={currentSessionId} />

      <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
        <h2 className="text-lg font-bold font-headline text-on-surface mb-1">
          Email Notifications
        </h2>
        <p className="text-sm text-on-surface-variant/60 mb-4">
          We use Resend to notify you when a client submits. Send a test
          message to confirm your setup.
        </p>
        <TestEmailButton />
      </section>
    </>
  );

  /* ─────────────────────────────────────────────
     Tab: Branding — Logo, Colors, Domain, White-label
     ───────────────────────────────────────────── */
  const brandingContent = (
    <>
      {partner && (
        <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
          <h2 className="text-lg font-bold font-headline text-on-surface mb-4">
            Logo
          </h2>
          <LogoUploadForm
            currentLogoUrl={partner.logo_url ?? null}
            uploadAction={uploadWorkspaceLogoAction}
          />
        </section>
      )}

      {partner && (
        <WorkspaceBrandingForm workspace={partner} rootHost={rootHost} isSuperadmin={session.role === "superadmin"} />
      )}

      {partner && (
        <DomainSetup
          partnerId={account.id}
          currentDomain={partner.custom_domain ?? null}
          saveAction={saveWorkspaceDomainAction}
        />
      )}

      {partner && (
        <WhiteLabelSection
          partner={partner}
          canEdit={true}
          updateAction={updateWorkspaceWhiteLabelAction}
        />
      )}
    </>
  );

  /* ─────────────────────────────────────────────
     Tab: Advanced — Support, Data Export, Danger Zone
     ───────────────────────────────────────────── */
  const advancedContent = (
    <>
      <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8">
        <h2 className="text-lg font-bold font-headline text-on-surface mb-1">
          Contact Support
        </h2>
        <p className="text-sm text-on-surface-variant/60 mb-5">
          Have a question or issue? Send us a message and we&apos;ll get back to you within 24 hours.
        </p>
        <SupportForm defaultEmail={session.email} defaultName={profile?.full_name ?? session.fullName} />
      </section>

      <DataExportSection />

      <DeleteAccountSection workspaceName={account.name} />
    </>
  );

  /* ─────────────────────────────────────────────
     Tab: Billing -- Plan, subscription, invoices
     ───────────────────────────────────────────── */
  const usage = await getAccountUsage(account.id);
  const plans = await getPlans();

  const isAdminUser = session.role === "superadmin";
  const highestPlan = plans.length > 0 ? plans[plans.length - 1] : null;
  const currentTier = isAdminUser ? (highestPlan?.slug ?? "supernova") : mapLegacyTier(account.planTier);
  const currentPlan = plans.find((p) => p.slug === currentTier) ?? plans[0];

  const [{ data: activeSub }, { data: recentInvoices }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, plan_tier, status, current_period_end, cancel_at_period_end")
      .eq("partner_id", account.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("invoices")
      .select("id, status, amount_paid, currency, invoice_url, invoice_pdf, paid_at, period_start, period_end")
      .eq("partner_id", account.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const hasSubscription = !!activeSub;
  const isPastDue = activeSub?.status === "past_due";
  const isCanceling = activeSub?.cancel_at_period_end;

  const billingContent = (
    <>
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

      {/* Plan cards */}
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
                    <CancelPlanButton isCanceling={!!isCanceling} />
                  ) : plan.priceMonthly > 0 && hasSubscription ? (
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
                    <SwitchPlanButton
                      targetSlug={plan.slug}
                      label={`Upgrade to ${plan.name}`}
                      highlight={plan.highlight}
                    />
                  ) : (
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

      {/* Invoices */}
      <InvoicesTable invoices={recentInvoices ?? []} />
    </>
  );

  /* ─────────────────────────────────────────────
     Tab: Changelog -- Release notes
     ───────────────────────────────────────────── */
  const changelogContent = (
    <ChangelogSection />
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8">
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Settings
          </h1>
          <p className="text-on-surface-variant mt-1">
            Manage your profile, workspace branding, and account.
          </p>
        </header>

        <SettingsTabs
          generalContent={generalContent}
          brandingContent={brandingContent}
          billingContent={billingContent}
          advancedContent={advancedContent}
          changelogContent={changelogContent}
        />
      </div>
    </div>
  );
}
