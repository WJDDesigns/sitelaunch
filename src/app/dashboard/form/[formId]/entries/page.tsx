import { notFound } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { FormSchema } from "@/lib/forms";
import EntriesTable from "./EntriesTable";
import SmartOverviewBox from "./SmartOverviewBox";
import { getSmartOverview } from "./actions";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormEntriesPage({ params }: PageProps) {
  const { formId } = await params;
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) return notFound();

  const supabase = await createClient();

  // Load the form
  const { data: pf } = await supabase
    .from("partner_forms")
    .select(
      `id, name, slug, template_id,
       form_templates ( id, schema )`,
    )
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!pf) return notFound();

  const tpl = pf.form_templates && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema: FormSchema | null = (tpl?.schema as FormSchema) ?? null;

  // Get all field labels for CSV headers
  const fieldMap: { key: string; label: string }[] = [];
  if (schema) {
    for (const step of schema.steps) {
      for (const field of step.fields) {
        if (field.type !== "heading") {
          fieldMap.push({ key: field.id, label: field.label });
        }
      }
    }
  }

  // Load submissions for this form
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, client_name, client_email, data, submitted_at, created_at")
    .eq("partner_form_id", formId)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (submissions ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    client_name: s.client_name,
    client_email: s.client_email,
    data: (s.data as Record<string, unknown>) ?? {},
    submitted_at: s.submitted_at,
    created_at: s.created_at,
  }));

  // Get partner details and smart overview data
  const adminClient = createAdminClient();
  const [{ data: partner }, { data: aiIntegrations }, cachedOverview] =
    await Promise.all([
      supabase
        .from("partners")
        .select("primary_color, settings")
        .eq("id", account.id)
        .maybeSingle(),
      adminClient
        .from("ai_integrations")
        .select("id")
        .eq("partner_id", account.id)
        .limit(1),
      getSmartOverview(formId),
    ]);

  const primaryColor = partner?.primary_color || "#c0c1ff";
  const partnerSettings = (partner?.settings as Record<string, unknown>) ?? {};
  const smartOverviewEnabled = partnerSettings.smart_overview_enabled === true;
  const hasAiProvider = (aiIntegrations ?? []).length > 0;
  const showSmartOverview = smartOverviewEnabled && hasAiProvider;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-6">
      <header className="flex items-center gap-4 flex-wrap">
        <Link
          href={`/dashboard/form/${formId}`}
          className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant/60 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <i className="fa-solid fa-arrow-left text-xs" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">
            {pf.name} — Entries
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {rows.length} submission{rows.length !== 1 ? "s" : ""} received
          </p>
        </div>
      </header>

      {showSmartOverview && (
        <SmartOverviewBox
          formId={formId}
          currentEntryCount={rows.length}
          cachedOverview={
            cachedOverview.overview
              ? {
                  overview: cachedOverview.overview,
                  generatedAt: cachedOverview.generatedAt!,
                  entryCount: cachedOverview.entryCount,
                }
              : null
          }
        />
      )}

      <EntriesTable
        entries={rows}
        fieldMap={fieldMap}
        formName={pf.name}
        primaryColor={primaryColor}
      />
    </div>
  );
}
