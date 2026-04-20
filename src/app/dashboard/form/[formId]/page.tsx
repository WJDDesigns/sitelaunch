import { notFound } from "next/navigation";
import { requireSession, getCurrentAccount, getVisiblePartners } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormSchema } from "@/lib/forms";
import FormEditorShell from "../FormEditorShell";
import FormSettingsPanel from "./FormSettingsPanel";
import FormSendToPanel from "../FormSendToPanel";

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

  const supabase = await createClient();

  // Load this specific form + template
  const { data: pf } = await supabase
    .from("partner_forms")
    .select(
      `id, name, slug, template_id, is_default, is_active,
       notification_emails, notification_bcc,
       confirm_page_heading, confirm_page_body, redirect_url, layout_style,
       form_templates ( id, schema )`,
    )
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!pf) return notFound();

  const tpl = pf.form_templates && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema: FormSchema | null = (tpl?.schema as FormSchema) ?? null;
  const hasForm = !!schema;

  // Get partner details for public link
  const { data: partner } = await supabase
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
  const admin = createAdminClient();
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
              notificationEmails={(pf.notification_emails as string[]) ?? []}
              notificationBcc={(pf.notification_bcc as string[]) ?? []}
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
          />
        }
      />
    </div>
  );
}
