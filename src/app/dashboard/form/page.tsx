import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";
import FormEditor from "./FormEditor";

export default async function FormEditorPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Form editor</h1>
        <p className="text-sm text-slate-600 mt-2">
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
  const schema: FormSchema = (tpl?.schema as FormSchema) ?? { steps: [] };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Form editor</h1>
        <p className="text-sm text-slate-600 mt-1">
          Customize the onboarding form your clients fill out. Changes apply
          to new submissions immediately.
        </p>
      </header>

      {!pf ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          No active form found. Visit your partner settings to create one.
        </div>
      ) : (
        <FormEditor initialSchema={schema} />
      )}
    </div>
  );
}
