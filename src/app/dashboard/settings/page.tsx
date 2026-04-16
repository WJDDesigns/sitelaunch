import { requireSession, getCurrentAccount } from "@/lib/auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackSession } from "@/lib/session-tracker";
import TestEmailButton from "../billing/TestEmailButton";
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
import IntegrationsSection from "./IntegrationsSection";
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

  // Track session for the sessions management section
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const currentSessionId = await trackSession(session.userId, ip, userAgent);

  // Fetch user profile for the profile section
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", session.userId)
    .maybeSingle();

  // Fetch full partner record for all branding sections
  const { data: partner } = await admin
    .from("partners")
    .select("*")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");

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
     Tab: Integrations - Cloud storage connections
     ───────────────────────────────────────────── */
  const { data: cloudIntegrations } = await admin
    .from("cloud_integrations")
    .select("id, provider, account_email, connected_at")
    .eq("partner_id", account.id);

  const integrationsContent = (
    <IntegrationsSection integrations={cloudIntegrations ?? []} />
  );

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
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
          integrationsContent={integrationsContent}
          advancedContent={advancedContent}
        />
      </div>
    </div>
  );
}
