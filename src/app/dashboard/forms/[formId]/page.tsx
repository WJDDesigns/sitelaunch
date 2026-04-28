import { notFound } from "next/navigation";
import { requireSession, getCurrentAccount, getVisiblePartners } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormSchema } from "@/lib/forms";
import FormEditorShell from "../FormEditorShell";
import FormSettingsPanel from "./FormSettingsPanel";
import FormSendToPanel from "../FormSendToPanel";
import type { NotificationCondition } from "../notification-actions";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormEditorPage({ params }: PageProps) {
  const { formId } = await params;
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Form editor</h1>
        <p className="text-sm text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  // Use admin client for form query — auth is already enforced by
  // requireSession() + getCurrentAccount(), and the .eq("partner_id", account.id)
  // filter ensures the user can only see their own forms. The user-scoped client's
  // RLS can silently fail when the Supabase session token isn't propagated correctly
  // through Next.js middleware → server component boundary.
  const admin = createAdminClient();

  // Load this specific form + template
  const { data: pf, error: pfError } = await admin
    .from("partner_forms")
    .select(
      `id, name, slug, template_id, is_default, is_active,
       notification_emails, notification_bcc,
       confirm_page_heading, confirm_page_body, redirect_url, layout_style,
       success_heading, success_message, success_redirect_url,
       partner_email_subject, partner_email_body,
       client_email_subject, client_email_body,
       start_button_text, start_description, skip_start_page,
       form_templates ( id, schema )`,
    )
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!pf) {
    // Debug: try query WITHOUT partner_id filter to see if form exists at all
    const { data: debugForm } = await admin
      .from("partner_forms")
      .select("id, name, partner_id")
      .eq("id", formId)
      .maybeSingle();
    console.error(
      `[form-editor] 404 — formId=${formId} accountId=${account.id} accountName=${account.name} userId=${session.userId} ` +
      `error=${pfError?.message ?? "no error, just no row"} ` +
      `formExists=${!!debugForm} formPartnerId=${debugForm?.partner_id ?? "N/A"} ` +
      `partnerMatch=${debugForm?.partner_id === account.id}`
    );
    return notFound();
  }

  const tpl = pf.form_templates && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema: FormSchema | null = (tpl?.schema as FormSchema) ?? null;
  const hasForm = !!schema;

  // Get partner details for public link
  const { data: partner } = await admin
    .from("partners")
    .select("slug, custom_domain, primary_color, theme_mode")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(/:\d+$/, "");
  const storefrontHost = partner?.custom_domain || `${partner?.slug ?? account.slug}.${rootHost}`;
  const formPath = pf.is_default ? "" : `/f/${pf.slug}`;
  const publicUrl = hasForm ? `https://${storefrontHost}${formPath}` : null;
  const primaryColor = partner?.primary_color || "#c0c1ff";

  // Get sub-partners for assignment
  const allPartners = await getVisiblePartners();
  const subPartners = allPartners
    .filter((p) => p.id !== account.id)
    .map((p) => ({ id: p.id, name: p.name }));

  // Get current assignments
  const { data: assignments } = await admin
    .from("form_partner_assignments")
    .select("partner_id")
    .eq("partner_form_id", formId);

  const assignedPartnerIds = (assignments ?? []).map((a) => a.partner_id);

  // Check if partner has any AI integration connected
  const { data: aiIntegrations } = await admin
    .from("ai_integrations")
    .select("id")
    .eq("partner_id", account.id)
    .limit(1);
  const hasAI = (aiIntegrations ?? []).length > 0;

  // Check if partner has any payment gateway connected
  const { data: paymentIntegrations } = await admin
    .from("payment_integrations")
    .select("id")
    .eq("partner_id", account.id)
    .limit(1);
  const hasPaymentGateway = (paymentIntegrations ?? []).length > 0;

  // Load webhooks for this form
  const { data: webhookRows } = await admin
    .from("form_webhooks")
    .select("id, name, provider, webhook_url, is_enabled, field_map, signing_secret, created_at")
    .eq("partner_form_id", formId)
    .eq("partner_id", account.id)
    .order("created_at", { ascending: true });
  const webhooks = (webhookRows ?? []) as {
    id: string; name: string; provider: string; webhook_url: string;
    is_enabled: boolean; field_map: { fieldId: string; key: string }[] | null;
    signing_secret: string | null; created_at: string;
  }[];

  // Load Google Sheets feeds + connection status (check both sheets_connections and cloud google_drive)
  const [{ data: sheetsFeedRows }, { count: sheetsConnCount }, { count: driveConnCount }] = await Promise.all([
    admin
      .from("sheets_feeds")
      .select("id, spreadsheet_id, spreadsheet_name, sheet_name, field_map, is_enabled")
      .eq("partner_form_id", formId)
      .eq("partner_id", account.id)
      .order("created_at", { ascending: true }),
    admin
      .from("sheets_connections")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", account.id),
    admin
      .from("cloud_integrations")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", account.id)
      .eq("provider", "google_drive"),
  ]);
  const sheetsFeeds = (sheetsFeedRows ?? []) as {
    id: string; spreadsheet_id: string; spreadsheet_name: string;
    sheet_name: string; field_map: { fieldId: string; column: string }[] | null;
    is_enabled: boolean;
  }[];
  const hasSheetsConnection = (sheetsConnCount ?? 0) > 0 || (driveConnCount ?? 0) > 0;

  // Load form notifications
  const { data: notifRows } = await admin
    .from("form_notifications")
    .select("id, name, is_enabled, to_emails, bcc_emails, reply_to, email_subject, email_body, conditions, sort_order")
    .eq("partner_form_id", formId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const notifications = (notifRows ?? []) as {
    id: string; name: string; is_enabled: boolean;
    to_emails: string[]; bcc_emails: string[];
    reply_to: string | null; email_subject: string | null; email_body: string | null;
    conditions: NotificationCondition | null; sort_order: number;
  }[];

  return (
    <div className="flex flex-col h-screen">
      <FormEditorShell
        initialSchema={schema}
        hasForm={hasForm}
        publicUrl={publicUrl}
        primaryColor={primaryColor}
        formId={formId}
        formName={pf.name}
        isActive={pf.is_active ?? true}
        hasAI={hasAI}
        hasPaymentGateway={hasPaymentGateway}
        sendToSlot={
          schema ? (
            <FormSendToPanel
              formId={formId}
              schema={schema}
              initialWebhooks={webhooks}
              initialSheetsFeeds={sheetsFeeds}
              hasSheetsConnection={hasSheetsConnection}
              initialNotifications={notifications}
              confirmPageHeading={(pf.confirm_page_heading as string) ?? ""}
              confirmPageBody={(pf.confirm_page_body as string) ?? ""}
              redirectUrl={(pf.redirect_url as string) ?? ""}
            />
          ) : undefined
        }
        settingsSlot={
          <FormSettingsPanel
            formId={formId}
            formName={pf.name}
            formSlug={pf.slug}
            isDefault={pf.is_default}
            partners={subPartners}
            assignedPartnerIds={assignedPartnerIds}
            storefrontHost={storefrontHost}
            themeMode={(partner?.theme_mode as "dark" | "light" | "auto") ?? "dark"}
            layoutStyle={(pf.layout_style as "default" | "top-nav" | "no-nav" | "conversation") ?? "default"}
            startButtonText={(pf.start_button_text as string) ?? null}
            startDescription={(pf.start_description as string) ?? null}
            skipStartPage={pf.skip_start_page ?? false}
            successHeading={(pf.success_heading as string) ?? null}
            successMessage={(pf.success_message as string) ?? null}
            successRedirectUrl={(pf.success_redirect_url as string) ?? null}
          />
        }
      />
    </div>
  );
}
