import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";
import type { FormSchema, UploadedFile } from "@/lib/forms";
import SubmissionForm from "./SubmissionForm";
import { saveStepAction, submitSubmissionAction } from "./actions";
import { uploadFileAction, deleteFileAction } from "./files-actions";

interface Props {
  params: Promise<{ subdomain: string; token: string }>;
  searchParams: Promise<{ embed?: string; chromeless?: string }>;
}

export default async function SubmissionPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";
  const isChromeless = sp.chromeless === "1";
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, status, data, access_token,
       partners ( id, slug, name, custom_domain, logo_url, primary_color, support_email, plan_tier, hide_branding, custom_footer_text, logo_size ),
       partner_forms ( id, overrides, layout_style,
         form_templates ( id, schema )
       )`,
    )
    .eq("access_token", token)
    .maybeSingle();

  if (error || !sub) notFound();

  const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
  if (!partner) notFound();

  if (sub.status !== "draft") {
    redirect(await absoluteUrl(`/thanks/${token}`));
  }

  const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema = tpl?.schema as FormSchema | undefined;
  if (!schema) notFound();

  const primary = partner.primary_color || "#c0c1ff";
  const layoutStyle = ((pf as Record<string, unknown>)?.layout_style as string) || "default";
  const isPaid = (partner as Record<string, unknown>).plan_tier !== "free";
  const hideBranding = isPaid && (partner as Record<string, unknown>).hide_branding;
  const footerText = isPaid && (partner as Record<string, unknown>).custom_footer_text
    ? String((partner as Record<string, unknown>).custom_footer_text)
    : null;

  // Check if the partner has a payment gateway connected (needed for payment field warning)
  const hasPaymentField = schema.steps.some((s) => s.fields.some((f) => f.type === "payment"));
  let hasPaymentGateway = true; // default true so no warning when there's no payment field
  if (hasPaymentField) {
    const { data: payGw } = await admin
      .from("payment_integrations")
      .select("id")
      .eq("partner_id", partner.id)
      .limit(1);
    hasPaymentGateway = (payGw ?? []).length > 0;
  }

  // Fetch captcha integration site key (needed for bot protection field)
  const hasCaptchaField = schema.steps.some((s) => s.fields.some((f) => f.type === "captcha"));
  let captchaSiteKey: string | null = null;
  let captchaProvider: "recaptcha" | "turnstile" | null = null;
  if (hasCaptchaField) {
    const captchaField = schema.steps.flatMap((s) => s.fields).find((f) => f.type === "captcha");
    const preferredProvider = captchaField?.captchaConfig?.provider ?? "recaptcha";
    const { data: captchaInt } = await admin
      .from("captcha_integrations")
      .select("provider, site_key")
      .eq("partner_id", partner.id)
      .eq("provider", preferredProvider)
      .maybeSingle();
    if (captchaInt) {
      captchaSiteKey = captchaInt.site_key;
      captchaProvider = captchaInt.provider as "recaptcha" | "turnstile";
    }
  }

  // Fetch geocoding provider + API key for address autocomplete
  const hasAutocompleteAddress = schema.steps.some((s) => s.fields.some((f) => f.type === "address" && f.addressConfig?.mode === "autocomplete"));
  let googleMapsApiKey: string | null = null;
  let geocodingProvider: "google" | "openstreetmap" | null = null;
  if (hasAutocompleteAddress) {
    // Read the workspace default geocoding provider
    const { data: partnerRow } = await admin
      .from("partners")
      .select("default_geocoding_provider")
      .eq("id", partner.id)
      .maybeSingle();
    const workspaceDefault = (partnerRow?.default_geocoding_provider as "google" | "openstreetmap") ?? "openstreetmap";

    // Check which autocomplete providers the partner has connected
    try {
      const { data: geoRows } = await admin
        .from("geocoding_integrations")
        .select("provider, api_key_encrypted")
        .eq("partner_id", partner.id);

      const googleRow = geoRows?.find((r) => r.provider === "google") ?? null;
      const osmRow = geoRows?.find((r) => r.provider === "openstreetmap") ?? null;

      // Use the workspace default if that provider is connected, otherwise fall back
      if (workspaceDefault === "google" && googleRow) {
        geocodingProvider = "google";
        if (googleRow.api_key_encrypted) {
          const { decryptToken } = await import("@/lib/cloud/encryption");
          googleMapsApiKey = decryptToken(googleRow.api_key_encrypted);
        }
      } else if (workspaceDefault === "openstreetmap") {
        geocodingProvider = "openstreetmap";
      } else if (googleRow) {
        // workspace default was google but not connected -- try google anyway with key
        geocodingProvider = "google";
        if (googleRow.api_key_encrypted) {
          const { decryptToken } = await import("@/lib/cloud/encryption");
          googleMapsApiKey = decryptToken(googleRow.api_key_encrypted);
        }
      } else if (osmRow) {
        geocodingProvider = "openstreetmap";
      }
    } catch { /* table may not exist yet */ }

    // Fall back to OSM (works with zero config) or platform env var for Google
    if (!geocodingProvider) {
      if (process.env.GOOGLE_MAPS_API_KEY) {
        geocodingProvider = "google";
        googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      } else {
        geocodingProvider = "openstreetmap";
      }
    }
  }

  const { data: existingFiles } = await admin
    .from("submission_files")
    .select("id, filename, mime_type, size_bytes, storage_path, field_key")
    .eq("submission_id", sub.id)
    .order("created_at", { ascending: true });

  const initialFiles: Record<string, UploadedFile[]> = {};
  for (const f of existingFiles ?? []) {
    (initialFiles[f.field_key] ||= []).push({
      id: f.id,
      filename: f.filename,
      mime_type: f.mime_type,
      size_bytes: f.size_bytes,
      storage_path: f.storage_path,
    });
  }

  const boundSave = saveStepAction.bind(null, token);
  const boundSubmit = submitSubmissionAction.bind(null, token);
  const boundUpload = uploadFileAction.bind(null, token);
  const boundDelete = deleteFileAction.bind(null, token);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <SubmissionForm
        schema={schema}
        initialData={(sub.data as Record<string, unknown>) ?? {}}
        initialFiles={initialFiles}
        primaryColor={primary}
        partnerName={partner.name}
        partnerLogoUrl={partner.logo_url}
        saveStep={boundSave}
        submit={boundSubmit}
        uploadFile={boundUpload}
        deleteFile={boundDelete}
        partnerId={partner.id}
        layoutStyle={layoutStyle as "default" | "top-nav" | "no-nav" | "conversation"}
        hasPaymentGateway={hasPaymentGateway}
        captchaSiteKey={captchaSiteKey}
        captchaProvider={captchaProvider}
        googleMapsApiKey={googleMapsApiKey}
        geocodingProvider={geocodingProvider}
        embedMode={isEmbed ? (isChromeless ? "chromeless" : "branded") : undefined}
      />

      {/* Footer — hidden in chromeless embed mode */}
      <footer className={`w-full py-8 px-8 flex flex-col items-center gap-3 border-t border-on-surface/10 md:hidden${isEmbed && isChromeless ? " hidden" : ""}`}>
        {hideBranding ? (
          footerText ? (
            <p className="text-xs text-on-surface/40">{footerText}</p>
          ) : null
        ) : (
          <>
            {footerText ? (
              <p className="text-xs text-on-surface/60">{footerText}</p>
            ) : null}
            <span className="text-sm font-bold text-on-surface font-headline">linqme</span>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40">
              &copy; {new Date().getFullYear()} linqme &middot; WJD Designs
            </p>
          </>
        )}
      </footer>
    </main>
  );
}
