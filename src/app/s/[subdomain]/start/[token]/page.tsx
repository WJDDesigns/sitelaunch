import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";
import type { FormSchema, UploadedFile } from "@/lib/forms";
import SubmissionForm from "./SubmissionForm";
import { saveStepAction, submitSubmissionAction } from "./actions";
import { uploadFileAction, deleteFileAction } from "./files-actions";

interface Props {
  params: Promise<{ subdomain: string; token: string }>;
}

export default async function SubmissionPage({ params }: Props) {
  const { token } = await params;
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
      />

      {/* Footer — only visible on desktop (mobile footer is less useful with sidebar layout) */}
      <footer className="w-full py-8 px-8 flex flex-col items-center gap-3 border-t border-on-surface/10 md:hidden">
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
