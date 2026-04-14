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

const LOGO_DIMS: Record<string, { wrapper: string; img: string; fallback: string }> = {
  default: { wrapper: "h-10 rounded-xl", img: "h-8 w-auto", fallback: "w-10 h-10 rounded-xl" },
  large: { wrapper: "h-16 rounded-2xl", img: "h-14 w-auto", fallback: "w-16 h-16 rounded-2xl" },
  "full-width": { wrapper: "h-14 rounded-2xl", img: "h-12 w-auto", fallback: "h-14 px-4 rounded-2xl" },
};

export default async function SubmissionPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, status, data, access_token,
       partners ( id, slug, name, custom_domain, logo_url, primary_color, support_email, plan_tier, hide_branding, custom_footer_text, logo_size ),
       partner_forms ( id, overrides,
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
  const isPaid = (partner as Record<string, unknown>).plan_tier !== "free";
  const hideBranding = isPaid && (partner as Record<string, unknown>).hide_branding;
  const footerText = isPaid && (partner as Record<string, unknown>).custom_footer_text
    ? String((partner as Record<string, unknown>).custom_footer_text)
    : null;
  const dims = LOGO_DIMS[String((partner as Record<string, unknown>).logo_size ?? "default")] ?? LOGO_DIMS.default;

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
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {partner.logo_url ? (
            <div className={`${dims.wrapper} flex items-center justify-center`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={partner.logo_url} alt={partner.name} className={`${dims.img} object-contain`} />
            </div>
          ) : (
            <div className={`${dims.fallback} flex items-center justify-center`} style={{ backgroundColor: primary }}>
              <span className="text-on-primary font-bold text-lg">{partner.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-on-surface font-headline tracking-tight">{partner.name}</span>
            {!hideBranding && (
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: `${primary}99` }}>Client Onboarding Portal</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 pt-24">
        <SubmissionForm
          schema={schema}
          initialData={(sub.data as Record<string, unknown>) ?? {}}
          initialFiles={initialFiles}
          primaryColor={primary}
          saveStep={boundSave}
          submit={boundSubmit}
          uploadFile={boundUpload}
          deleteFile={boundDelete}
        />
      </div>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col items-center gap-4 border-t border-on-surface/10">
        {hideBranding ? (
          footerText ? (
            <p className="text-xs text-on-surface/40">{footerText}</p>
          ) : null
        ) : (
          <>
            {footerText ? (
              <p className="text-xs text-on-surface/60">{footerText}</p>
            ) : null}
            <span className="text-sm font-bold text-on-surface font-headline">SiteLaunch</span>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40">
              &copy; {new Date().getFullYear()} SiteLaunch &middot; WJD Designs
            </p>
          </>
        )}
      </footer>
    </main>
  );
}
