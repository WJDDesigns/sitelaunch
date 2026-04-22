"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/* ── Types ─────────────────────────────────────────────────────────── */

interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface NotificationCondition {
  fieldId: string;
  operator: "equals" | "not_equals" | "contains" | "not_empty" | "is_empty" | "greater_than" | "less_than";
  value?: string;
  extraConditions?: { fieldId: string; operator: string; value?: string }[];
  combinator?: "and" | "or";
}

export interface FormNotification {
  id: string;
  name: string;
  is_enabled: boolean;
  to_emails: string[];
  bcc_emails: string[];
  reply_to: string | null;
  email_subject: string | null;
  email_body: string | null;
  conditions: NotificationCondition | null;
  sort_order: number;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

async function authorizeForm(formId: string): Promise<string> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found.");

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("partner_forms")
    .select("id, partner_id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) throw new Error("Form not found.");
  return account.id;
}

/* ── CRUD ──────────────────────────────────────────────────────────── */

export async function loadFormNotifications(formId: string): Promise<FormNotification[]> {
  await authorizeForm(formId);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("form_notifications")
    .select("id, name, is_enabled, to_emails, bcc_emails, reply_to, email_subject, email_body, conditions, sort_order")
    .eq("partner_form_id", formId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as FormNotification[];
}

export async function createFormNotification(
  formId: string,
  name: string,
): Promise<ActionResult> {
  const partnerId = await authorizeForm(formId);
  const admin = createAdminClient();

  // Get next sort order
  const { data: existing } = await admin
    .from("form_notifications")
    .select("sort_order")
    .eq("partner_form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await admin
    .from("form_notifications")
    .insert({
      partner_id: partnerId,
      partner_form_id: formId,
      name: name.trim() || "New Notification",
      is_enabled: true,
      to_emails: [],
      bcc_emails: [],
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true, id: data.id };
}

export async function updateFormNotification(
  formId: string,
  notificationId: string,
  updates: {
    name?: string;
    is_enabled?: boolean;
    to_emails?: string[];
    bcc_emails?: string[];
    reply_to?: string | null;
    email_subject?: string | null;
    email_body?: string | null;
    conditions?: NotificationCondition | null;
  },
): Promise<ActionResult> {
  await authorizeForm(formId);
  const admin = createAdminClient();

  // Validate emails if provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of [...(updates.to_emails ?? []), ...(updates.bcc_emails ?? [])]) {
    if (!emailRegex.test(email.trim())) {
      return { ok: false, error: `Invalid email: ${email}` };
    }
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name.trim() || "Notification";
  if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
  if (updates.to_emails !== undefined) updateData.to_emails = updates.to_emails.map((e) => e.trim()).filter(Boolean);
  if (updates.bcc_emails !== undefined) updateData.bcc_emails = updates.bcc_emails.map((e) => e.trim()).filter(Boolean);
  if (updates.reply_to !== undefined) updateData.reply_to = updates.reply_to?.trim() || null;
  if (updates.email_subject !== undefined) updateData.email_subject = updates.email_subject?.trim() || null;
  if (updates.email_body !== undefined) updateData.email_body = updates.email_body?.trim() || null;
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions;

  const { error } = await admin
    .from("form_notifications")
    .update(updateData)
    .eq("id", notificationId)
    .eq("partner_form_id", formId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

export async function deleteFormNotification(
  formId: string,
  notificationId: string,
): Promise<ActionResult> {
  await authorizeForm(formId);
  const admin = createAdminClient();

  const { error } = await admin
    .from("form_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("partner_form_id", formId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

export async function duplicateFormNotification(
  formId: string,
  notificationId: string,
): Promise<ActionResult> {
  const partnerId = await authorizeForm(formId);
  const admin = createAdminClient();

  const { data: source } = await admin
    .from("form_notifications")
    .select("*")
    .eq("id", notificationId)
    .eq("partner_form_id", formId)
    .maybeSingle();

  if (!source) return { ok: false, error: "Notification not found." };

  // Get next sort order
  const { data: existing } = await admin
    .from("form_notifications")
    .select("sort_order")
    .eq("partner_form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await admin
    .from("form_notifications")
    .insert({
      partner_id: partnerId,
      partner_form_id: formId,
      name: `${source.name} (copy)`,
      is_enabled: false,
      to_emails: source.to_emails,
      bcc_emails: source.bcc_emails,
      reply_to: source.reply_to,
      email_subject: source.email_subject,
      email_body: source.email_body,
      conditions: source.conditions,
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true, id: data.id };
}
