"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";
import type { FormSchema } from "@/lib/forms";
import { validateStepData } from "@/lib/forms";
import { notifyPartnerOfSubmission } from "@/lib/notifications";
import { syncFilesToCloud } from "@/lib/cloud/sync";
import { fireWebhooks } from "@/lib/webhooks";
import { fireSheetsSync } from "@/lib/sheets/sync";

async function loadSubmissionByToken(token: string) {
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, status, data, partner_id, partner_form_id, form_slug,
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
    let raw = formData.get(f.id);
    if (raw === null) continue;
    // Normalize consent/checkbox: browsers send "on" by default, we need "yes"
    if ((f.type === "consent" || f.type === "checkbox") && raw === "on") raw = "yes";
    // Complex fields (timeline, approval, budget_allocator, etc.) send their
    // data as JSON strings. Try to parse them back into structured objects so
    // the JSONB column stores real objects instead of stringified JSON.
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          stepData[f.id] = JSON.parse(trimmed);
          continue;
        } catch {
          // Not valid JSON -- store as plain string
        }
      }
      stepData[f.id] = raw;
    } else {
      stepData[f.id] = raw;
    }
  }

  // Merge with existing data for condition evaluation
  const allData = {
    ...(sub.data as Record<string, unknown>),
    ...stepData,
  };

  const validation = validateStepData(step, stepData, allData);
  if (!validation.ok) return { errors: validation.errors };

  const merged = allData;

  // Guard against excessively large payloads (1 MB limit)
  const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB
  const serialized = JSON.stringify(merged);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) {
    return { errors: { _form: "Submission data is too large. Please reduce the size of your inputs." } };
  }

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

  // Record form completion event for analytics (fire-and-forget)
  admin.from("form_events").insert({
    partner_id: sub.partner_id,
    form_slug: sub.form_slug ?? undefined,
    submission_id: sub.id,
    event_type: "complete",
  }).then(() => {}, (err) => {
    console.error("[submission] form_events complete insert failed:", err);
  });

  // Fire-and-log notifications. We never throw from here -- a failed email
  // shouldn't block the client's happy-path.
  try {
    await notifyPartnerOfSubmission(sub.id);
  } catch (err) {
    console.error("[notify] failed:", err);
  }

  // Sync uploaded files to cloud storage (fire-and-forget)
  try {
    await syncFilesToCloud(sub.id);
  } catch (err) {
    console.error("[cloud-sync] failed:", err);
  }

  // Fire webhooks (Zapier, Make, custom) -- fire-and-forget
  try {
    await fireWebhooks(sub.id);
  } catch (err) {
    console.error("[webhooks] failed:", err);
  }

  // Sync to Google Sheets -- fire-and-forget
  try {
    await fireSheetsSync(sub.id);
  } catch (err) {
    console.error("[sheets-sync] failed:", err);
  }

  redirect(await absoluteUrl(`/thanks/${token}`));
}
