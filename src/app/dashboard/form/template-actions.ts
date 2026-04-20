"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";

/* ── Types ─────────────────────────────────────────────────── */

export interface TemplateInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  is_predefined: boolean;
  owner_partner_id: string | null;
  schema: FormSchema;
}

export interface TemplateResult {
  ok: boolean;
  error?: string;
}

/* ── List available templates ──────────────────────────────── */

export async function listTemplatesAction(): Promise<TemplateInfo[]> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return [];

  const supabase = await createClient();

  // Show all predefined templates + user's own saved templates
  const { data, error } = await supabase
    .from("form_templates")
    .select("id, slug, name, description, category, icon, is_predefined, owner_partner_id, schema")
    .or(`is_predefined.eq.true,owner_partner_id.eq.${account.id}`)
    .order("is_predefined", { ascending: false })
    .order("name");

  if (error) {
    console.error("[templates] listTemplatesAction error:", error.message);
    return [];
  }

  return (data ?? []) as TemplateInfo[];
}

/* ── Apply a template to the current partner's form ────────── */

export async function applyTemplateAction(templateId: string, formId?: string): Promise<TemplateResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const supabase = await createClient();

  // Fetch the template schema
  const { data: tpl, error: tplErr } = await supabase
    .from("form_templates")
    .select("id, schema")
    .eq("id", templateId)
    .single();

  if (tplErr || !tpl) return { ok: false, error: "Template not found." };

  // Find the specific form or the partner's active form
  let pf;
  if (formId) {
    const { data } = await supabase
      .from("partner_forms")
      .select("id, template_id")
      .eq("id", formId)
      .eq("partner_id", account.id)
      .maybeSingle();
    pf = data;
  } else {
    const { data } = await supabase
      .from("partner_forms")
      .select("id, template_id")
      .eq("partner_id", account.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    pf = data;
  }

  if (!pf) {
    // No active form yet — create a new template + partner_form
    const { data: newTpl, error: newErr } = await supabase
      .from("form_templates")
      .insert({
        slug: `custom-${account.id.slice(0, 8)}-${Date.now()}`,
        name: `${account.name} Form`,
        version: 1,
        schema: tpl.schema,
        owner_partner_id: account.id,
      })
      .select("id")
      .single();

    if (newErr || !newTpl) return { ok: false, error: newErr?.message ?? "Failed to create form." };

    const { error: pfErr } = await supabase
      .from("partner_forms")
      .insert({ partner_id: account.id, template_id: newTpl.id, is_active: true, name: `${account.name} Form`, slug: `default`, is_default: true });

    if (pfErr) return { ok: false, error: pfErr.message };
  } else {
    // Update existing template schema
    const { error: upErr } = await supabase
      .from("form_templates")
      .update({ schema: tpl.schema })
      .eq("id", pf.template_id);

    if (upErr) return { ok: false, error: upErr.message };
  }

  revalidatePath("/dashboard/form");
  return { ok: true };
}

/* ── Start with a blank form ───────────────────────────────── */

export async function startBlankFormAction(): Promise<TemplateResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const blankSchema: FormSchema = {
    steps: [
      { id: "step_1", title: "Step 1", description: "", fields: [] },
    ],
  };

  const supabase = await createClient();

  const { data: pf } = await supabase
    .from("partner_forms")
    .select("id, template_id")
    .eq("partner_id", account.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!pf) {
    const { data: newTpl, error: newErr } = await supabase
      .from("form_templates")
      .insert({
        slug: `blank-${account.id.slice(0, 8)}-${Date.now()}`,
        name: `${account.name} Form`,
        version: 1,
        schema: blankSchema,
        owner_partner_id: account.id,
      })
      .select("id")
      .single();

    if (newErr || !newTpl) return { ok: false, error: newErr?.message ?? "Failed." };

    await supabase
      .from("partner_forms")
      .insert({ partner_id: account.id, template_id: newTpl.id, is_active: true, name: `${account.name} Form`, slug: `default`, is_default: true });
  } else {
    await supabase
      .from("form_templates")
      .update({ schema: blankSchema })
      .eq("id", pf.template_id);
  }

  revalidatePath("/dashboard/form");
  return { ok: true };
}

/* ── Save current form as a reusable template ──────────────── */

export async function saveAsTemplateAction(
  name: string,
  description: string,
  category: string,
): Promise<TemplateResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  if (!name.trim()) return { ok: false, error: "Template name is required." };

  const supabase = await createClient();

  // Get current form schema
  const { data: pf } = await supabase
    .from("partner_forms")
    .select("id, template_id, form_templates ( schema )")
    .eq("partner_id", account.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!pf) return { ok: false, error: "No active form to save." };

  const tpl = Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates;
  if (!tpl?.schema) return { ok: false, error: "No schema found." };

  const slug = `user-${account.id.slice(0, 8)}-${Date.now()}`;

  const { error } = await supabase
    .from("form_templates")
    .insert({
      slug,
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || "general",
      version: 1,
      schema: tpl.schema,
      owner_partner_id: account.id,
      is_predefined: false,
    });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/form");
  return { ok: true };
}
