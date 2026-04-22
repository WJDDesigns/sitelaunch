"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";

export interface SaveFormResult {
  ok: boolean;
  error?: string;
}

export async function saveFormSchemaAction(
  schemaJson: string,
  formId?: string,
): Promise<SaveFormResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  let schema: FormSchema;
  try {
    schema = JSON.parse(schemaJson);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  // Basic validation
  if (!schema.steps || !Array.isArray(schema.steps) || schema.steps.length === 0) {
    return { ok: false, error: "Form must have at least one step." };
  }
  for (const step of schema.steps) {
    if (!step.id || !step.title) {
      return { ok: false, error: "Every step needs an ID and title." };
    }
    if (!step.fields || !Array.isArray(step.fields)) {
      return { ok: false, error: `Step "${step.title}" has no fields array.` };
    }
    for (const field of step.fields) {
      if (!field.id || !field.label || !field.type) {
        return {
          ok: false,
          error: `Every field in "${step.title}" needs an ID, label, and type.`,
        };
      }
    }
  }

  const supabase = await createClient();

  // Get the specific form or the partner's active form → its template
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
    return { ok: false, error: "No form found for your account." };
  }

  // Update the template schema
  const { error } = await supabase
    .from("form_templates")
    .update({ schema })
    .eq("id", pf.template_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  if (formId) revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}
