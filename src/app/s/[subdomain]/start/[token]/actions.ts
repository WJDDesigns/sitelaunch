"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";
import type { FormSchema } from "@/lib/forms";
import { validateStepData } from "@/lib/forms";

async function loadSubmissionByToken(token: string) {
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, status, data, partner_id, partner_form_id,
       partner_forms ( id, template_id, overrides,
         form_templates ( id, schema )
       )`,
    )
    .eq("access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sub) throw new Error("Submission not found");
  return sub;
}

function resolveSchema(sub: Awaited<ReturnType<typeof loadSubmissionByToken>>): FormSchema {
  // Supabase returns nested relations as either object or array depending on the
  // FK direction — we handle both.
  const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  if (!tpl?.schema) throw new Error("Form schema missing");
  return tpl.schema as FormSchema;
}

export async function saveStepAction(
  token: string,
  stepId: string,
  formData: FormData,
): Promise<{ errors?: Record<string, string>; nextStepId?: string; done?: boolean }> {
  if (!token) throw new Error("Missing token");

  const sub = await loadSubmissionByToken(token);
  if (sub.status !== "draft") {
    return { done: true };
  }

  const schema = resolveSchema(sub);
  const step = schema.steps.find((s) => s.id === stepId);
  if (!step) throw new Error("Unknown step");

  // Collect all field values for this step
  const stepData: Record<string, unknown> = {};
  for (const f of step.fields) {
    const raw = formData.get(f.id);
    if (raw === null) continue;
    stepData[f.id] = typeof raw === "string" ? raw : raw;
  }

  const validation = validateStepData(step, stepData);
  if (!validation.ok) return { errors: validation.errors };

  const merged = {
    ...(sub.data as Record<string, unknown>),
    ...stepData,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ data: merged })
    .eq("id", sub.id);
  if (error) throw new Error(error.message);

  const idx = schema.steps.findIndex((s) => s.id === stepId);
  const next = schema.steps[idx + 1];
  return next ? { nextStepId: next.id } : { done: true };
}

export async function submitSubmissionAction(token: string) {
  if (!token) throw new Error("Missing token");
  const sub = await loadSubmissionByToken(token);
  if (sub.status !== "draft") {
    redirect(await absoluteUrl(`/thanks/${token}`));
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      client_email:
        (sub.data as Record<string, unknown>).contact_email?.toString() ?? null,
      client_name:
        (sub.data as Record<string, unknown>).contact_name?.toString() ?? null,
    })
    .eq("id", sub.id);
  if (error) throw new Error(error.message);
  redirect(await absoluteUrl(`/thanks/${token}`));
}
