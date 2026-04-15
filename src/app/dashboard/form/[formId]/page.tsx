import { notFound } from "next/navigation";
import { requireSession, getCurrentAccount, getVisiblePartners } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormSchema } from "@/lib/forms";
import FormEditorShell from "../FormEditorShell";
import FormSettingsPanel from "./FormSettingsPanel";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormEditorPage({ params }: PageProps) {
  const { formId } = await params;
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
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
      `id, name, slug, template_id, is_default,
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
    .select("slug, custom_domain, primary_color")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");
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

  return (
    <div className="flex flex-col h-screen">
      <FormEditorShell
        initialSchema={schema}
        hasForm={hasForm}
        publicUrl={publicUrl}
        primaryColor={primaryColor}
        formId={formId}
        formName={pf.name}
        settingsSlot={
          <FormSettingsPanel
            formId={formId}
            formName={pf.name}
            formSlug={pf.slug}
            isDefault={pf.is_default}
            partners={subPartners}
            assignedPartnerIds={assignedPartnerIds}
            storefrontHost={storefrontHost}
          />
        }
      />
    </div>
  );
}
