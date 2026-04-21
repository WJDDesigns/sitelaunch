"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPartnerAI, aiComplete } from "@/lib/ai";
import { formatFieldValue } from "@/lib/format-field-value";
import type { FormSchema, FieldDef } from "@/lib/forms";

export async function generateSmartOverview(formId: string) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account");

  const admin = createAdminClient();

  // Check smart_overview_enabled in partner settings
  const { data: partner } = await admin
    .from("partners")
    .select("settings")
    .eq("id", account.id)
    .maybeSingle();

  const settings = (partner?.settings as Record<string, unknown>) ?? {};
  if (settings.smart_overview_enabled !== true) {
    throw new Error("Smart Overview is not enabled");
  }

  // Load partner AI integration
  const ai = await getPartnerAI(account.id);
  if (!ai) throw new Error("No AI provider connected");

  // Load the form and its schema
  const { data: pf } = await admin
    .from("partner_forms")
    .select(
      `id, name, partner_id,
       form_templates ( id, schema )`,
    )
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!pf) throw new Error("Form not found");

  const tpl =
    pf.form_templates &&
    (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema: FormSchema | null = (tpl?.schema as FormSchema) ?? null;

  // Build field map for labels
  const fieldDefs: FieldDef[] = [];
  if (schema) {
    for (const step of schema.steps) {
      for (const field of step.fields) {
        if (field.type !== "heading") {
          fieldDefs.push(field);
        }
      }
    }
  }

  const fieldMap = new Map(fieldDefs.map((f) => [f.id, f]));

  // Load recent submissions
  const { data: submissions } = await admin
    .from("submissions")
    .select("id, data, submitted_at, created_at")
    .eq("partner_form_id", formId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = submissions ?? [];
  if (rows.length === 0) {
    throw new Error("No entries to analyze");
  }

  // Build the user prompt with entry data
  const entryLines = rows.map((s, i) => {
    const data = (s.data as Record<string, unknown>) ?? {};
    const fields = Object.entries(data)
      .map(([key, val]) => {
        const def = fieldMap.get(key);
        const label = def?.label ?? key;
        const formatted = def ? formatFieldValue(val, def) : String(val ?? "");
        return `${label}: ${formatted}`;
      })
      .filter((line) => line.length > 0)
      .join("; ");
    return `Entry ${i + 1} (${s.submitted_at ?? s.created_at}): ${fields}`;
  });

  const userPrompt = `Form: "${pf.name}"\nTotal entries: ${rows.length}\n\n${entryLines.join("\n")}`;

  const systemPrompt =
    "You are an analytics assistant for a form management platform. Analyze the submitted form entries and provide a brief overview (2-4 sentences) highlighting: common patterns or trends, any items that may need attention, and overall sentiment if applicable. Be specific and reference actual data. Do not use markdown formatting -- write plain sentences. Do not use emdashes -- use double hyphens instead.";

  const result = await aiComplete(ai, systemPrompt, userPrompt);
  if (!result) throw new Error("AI generation failed");

  // Upsert into smart_overview_cache
  await admin.from("smart_overview_cache").upsert(
    {
      partner_id: account.id,
      partner_form_id: formId,
      overview_html: result,
      entry_count: rows.length,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "partner_id,partner_form_id" },
  );

  return result;
}

export async function getSmartOverview(formId: string) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { overview: null, generatedAt: null, entryCount: 0 };

  const admin = createAdminClient();
  const { data } = await admin
    .from("smart_overview_cache")
    .select("overview_html, generated_at, entry_count")
    .eq("partner_id", account.id)
    .eq("partner_form_id", formId)
    .maybeSingle();

  if (!data) return { overview: null, generatedAt: null, entryCount: 0 };

  return {
    overview: data.overview_html,
    generatedAt: data.generated_at,
    entryCount: data.entry_count,
  };
}
