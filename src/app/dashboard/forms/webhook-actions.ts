"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface WebhookFormState {
  ok: boolean;
  error?: string;
  id?: string;
}

interface FieldMapping {
  fieldId: string;
  key: string;
}

const ALLOWED_PROVIDERS = ["zapier", "make", "custom"];
const URL_PATTERN = /^https:\/\/.+/;

export async function saveWebhookAction(
  formId: string,
  data: {
    id?: string;
    name: string;
    provider: string;
    webhookUrl: string;
    isEnabled: boolean;
    fieldMap: FieldMapping[] | null;
    signingSecret?: string;
  },
): Promise<WebhookFormState> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  // Validate
  if (!data.name.trim()) return { ok: false, error: "Name is required." };
  if (!ALLOWED_PROVIDERS.includes(data.provider)) return { ok: false, error: "Invalid provider." };
  if (!URL_PATTERN.test(data.webhookUrl)) return { ok: false, error: "Webhook URL must start with https://." };
  if (data.webhookUrl.length > 2000) return { ok: false, error: "URL is too long." };

  // Verify form belongs to this account
  const supabase = await createClient();
  const { data: pf } = await supabase
    .from("partner_forms")
    .select("id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();
  if (!pf) return { ok: false, error: "Form not found." };

  const admin = createAdminClient();

  if (data.id) {
    // Update existing
    const { error } = await admin
      .from("form_webhooks")
      .update({
        name: data.name.trim(),
        provider: data.provider,
        webhook_url: data.webhookUrl.trim(),
        is_enabled: data.isEnabled,
        field_map: data.fieldMap,
        signing_secret: data.signingSecret?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("partner_id", account.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/forms/${formId}`);
    return { ok: true, id: data.id };
  } else {
    // Create new
    const { data: row, error } = await admin
      .from("form_webhooks")
      .insert({
        partner_id: account.id,
        partner_form_id: formId,
        name: data.name.trim(),
        provider: data.provider,
        webhook_url: data.webhookUrl.trim(),
        is_enabled: data.isEnabled,
        field_map: data.fieldMap,
        signing_secret: data.signingSecret?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/forms/${formId}`);
    return { ok: true, id: row.id };
  }
}

export async function deleteWebhookAction(
  webhookId: string,
  formId: string,
): Promise<WebhookFormState> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("form_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("partner_id", account.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

export async function testWebhookAction(
  webhookId: string,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();
  const { data: wh } = await admin
    .from("form_webhooks")
    .select("webhook_url, signing_secret")
    .eq("id", webhookId)
    .eq("partner_id", account.id)
    .maybeSingle();
  if (!wh) return { ok: false, error: "Webhook not found." };

  // Send a test payload
  const testPayload = {
    event: "test",
    submission_id: "test-000-000",
    form_slug: "test-form",
    client_email: "test@example.com",
    client_name: "Test User",
    submitted_at: new Date().toISOString(),
    data: {
      contact_name: "Test User",
      contact_email: "test@example.com",
      message: "This is a test webhook from linqme.",
    },
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "linqme-webhooks/1.0",
    };

    const bodyStr = JSON.stringify(testPayload);

    if (wh.signing_secret) {
      const crypto = await import("crypto");
      const sig = crypto
        .createHmac("sha256", wh.signing_secret)
        .update(bodyStr)
        .digest("hex");
      headers["X-Linqme-Signature"] = `sha256=${sig}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(wh.webhook_url, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return { ok: res.ok, statusCode: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export async function getWebhookDeliveries(
  webhookId: string,
  limit = 10,
): Promise<{ id: string; status: string; status_code: number | null; error_message: string | null; duration_ms: number | null; created_at: string }[]> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return [];

  const admin = createAdminClient();

  // Verify webhook belongs to this account
  const { data: wh } = await admin
    .from("form_webhooks")
    .select("id")
    .eq("id", webhookId)
    .eq("partner_id", account.id)
    .maybeSingle();
  if (!wh) return [];

  const { data } = await admin
    .from("webhook_deliveries")
    .select("id, status, status_code, error_message, duration_ms, created_at")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as { id: string; status: string; status_code: number | null; error_message: string | null; duration_ms: number | null; created_at: string }[];
}
