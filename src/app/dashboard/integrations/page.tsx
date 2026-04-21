import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import IntegrationsGrid from "./IntegrationsGrid";
import IntegrationRequestSection from "./IntegrationRequestSection";

export default async function IntegrationsPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Integrations
        </h1>
        <p className="text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();

  /* Load all connection rows in parallel */
  const [
    { data: cloudRows },
    { data: aiRows },
    { data: paymentRows },
    { data: captchaRows },
    geocodingResult,
    { data: sheetsRows },
    { data: existingRequests },
  ] = await Promise.all([
    admin
      .from("cloud_integrations")
      .select("id, provider, account_email, connected_at")
      .eq("partner_id", account.id),
    admin
      .from("ai_integrations")
      .select("id, provider, model_preference, connected_at")
      .eq("partner_id", account.id),
    admin
      .from("payment_integrations")
      .select("id, provider, connected_at, account_email, stripe_account_id")
      .eq("partner_id", account.id),
    admin
      .from("captcha_integrations")
      .select("id, provider, connected_at")
      .eq("partner_id", account.id),
    Promise.resolve(
      admin
        .from("geocoding_integrations")
        .select("id, provider, connected_at")
        .eq("partner_id", account.id),
    ).catch(() => ({ data: null })),
    admin
      .from("sheets_connections")
      .select("id, account_email, connected_at")
      .eq("partner_id", account.id),
    admin
      .from("integration_requests")
      .select("integration_name, created_at")
      .eq("partner_id", account.id)
      .order("created_at", { ascending: false }),
  ]);

  /* Normalize all rows into a flat array with their table tag */
  type ConnectedRow = {
    id: string;
    provider: string;
    table: string;
    account_email?: string | null;
    model_preference?: string | null;
    stripe_account_id?: string | null;
    connected_at: string;
  };

  const connected: ConnectedRow[] = [
    ...(cloudRows ?? []).map((r) => ({ ...r, table: "cloud_integrations" as const })),
    ...(aiRows ?? []).map((r) => ({ ...r, table: "ai_integrations" as const })),
    ...(paymentRows ?? []).map((r) => ({ ...r, table: "payment_integrations" as const })),
    ...(captchaRows ?? []).map((r) => ({ ...r, table: "captcha_integrations" as const })),
    ...((geocodingResult?.data ?? []) as { id: string; provider: string; connected_at: string }[]).map(
      (r) => ({ ...r, table: "geocoding_integrations" as const }),
    ),
    ...(sheetsRows ?? []).map((r) => ({
      ...r,
      provider: "google_sheets",
      table: "sheets_connections" as const,
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Integrations
        </h1>
        <p className="text-on-surface-variant mt-1">
          Connect cloud storage, AI, payments, CRM, and more to power your forms.
        </p>
      </header>

      <IntegrationsGrid connected={connected} />

      <IntegrationRequestSection
        existingRequests={(existingRequests ?? []).map((r) => ({
          integration_name: r.integration_name as string,
          created_at: r.created_at as string,
        }))}
      />
    </div>
  );
}
