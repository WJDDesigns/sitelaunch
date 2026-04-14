import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";
import FormEditorShell from "./FormEditorShell";

export default async function FormEditorPage() {
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

  // Load the active form + template
  const { data: pf } = await supabase
    .from("partner_forms")
    .select(
      `id, template_id,
       form_templates ( id, schema )`,
    )
    .eq("partner_id", account.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema: FormSchema | null = (tpl?.schema as FormSchema) ?? null;
  const hasForm = !!pf && !!schema;

  // Get partner details for public link
  const { data: partner } = await supabase
    .from("partners")
    .select("slug, custom_domain, primary_color")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com";
  const storefrontHost = partner?.custom_domain || `${partner?.slug ?? account.slug}.${rootHost}`;
  const publicUrl = hasForm ? `https://${storefrontHost}` : null;
  const primaryColor = partner?.primary_color || "#c0c1ff";

  return (
    <FormEditorShell
      initialSchema={schema}
      hasForm={hasForm}
      publicUrl={publicUrl}
      primaryColor={primaryColor}
    />
  );
}
