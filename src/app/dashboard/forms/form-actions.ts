"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormsLimitForTier } from "@/lib/plans";
import { createNotification } from "@/lib/notifications";
import type { FormSchema } from "@/lib/forms";

interface ActionResult {
  ok: boolean;
  error?: string;
  formId?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "form";
}

/**
 * Create a new form for the current account.
 */
export async function createFormAction(name: string): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  if (!name.trim()) return { ok: false, error: "Form name is required." };

  const admin = createAdminClient();

  // Check form limit
  const { data: existingForms } = await admin
    .from("partner_forms")
    .select("id")
    .eq("partner_id", account.id);

  const currentCount = existingForms?.length ?? 0;
  const limit = getFormsLimitForTier(account.planTier);
  if (limit !== null && currentCount >= limit) {
    return { ok: false, error: `You've reached your plan limit of ${limit} form${limit !== 1 ? "s" : ""}. Upgrade to create more.` };
  }

  // Generate unique slug
  let slug = slugify(name);
  const { data: existing } = await admin
    .from("partner_forms")
    .select("slug")
    .eq("partner_id", account.id)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const blankSchema: FormSchema = {
    steps: [
      { id: "step_1", title: "Step 1", description: "", fields: [] },
    ],
  };

  // Create the template
  const { data: tpl, error: tplErr } = await admin
    .from("form_templates")
    .insert({
      slug: `${account.id.slice(0, 8)}-${slug}-${Date.now()}`,
      name: name.trim(),
      version: 1,
      schema: blankSchema,
      owner_partner_id: account.id,
    })
    .select("id")
    .single();

  if (tplErr || !tpl) return { ok: false, error: tplErr?.message ?? "Failed to create form template." };

  // Determine if this is the first form (make it default)
  const isFirst = currentCount === 0;

  // Create the partner_form link
  const { data: pf, error: pfErr } = await admin
    .from("partner_forms")
    .insert({
      partner_id: account.id,
      template_id: tpl.id,
      is_active: true,
      name: name.trim(),
      slug,
      is_default: isFirst,
    })
    .select("id")
    .single();

  if (pfErr || !pf) return { ok: false, error: pfErr?.message ?? "Failed to create form." };

  revalidatePath("/dashboard/forms");
  return { ok: true, formId: pf.id };
}

/**
 * Delete a form.
 */
export async function deleteFormAction(formId: string): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Verify ownership
  const { data: form } = await admin
    .from("partner_forms")
    .select("id, is_default, template_id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) return { ok: false, error: "Form not found." };
  if (form.is_default) return { ok: false, error: "Cannot delete the default form. Set another form as default first." };

  // Delete the partner_form (cascade will handle form_partner_assignments)
  const { error } = await admin
    .from("partner_forms")
    .delete()
    .eq("id", formId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  return { ok: true };
}

/**
 * Set a form as the default.
 */
export async function setDefaultFormAction(formId: string): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Verify ownership
  const { data: form } = await admin
    .from("partner_forms")
    .select("id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) return { ok: false, error: "Form not found." };

  // Unset all defaults for this partner
  await admin
    .from("partner_forms")
    .update({ is_default: false })
    .eq("partner_id", account.id);

  // Set the new default
  const { error } = await admin
    .from("partner_forms")
    .update({ is_default: true })
    .eq("id", formId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  return { ok: true };
}

/**
 * Rename a form.
 */
export async function renameFormAction(formId: string, name: string): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  if (!name.trim()) return { ok: false, error: "Form name is required." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("partner_forms")
    .update({ name: name.trim() })
    .eq("id", formId)
    .eq("partner_id", account.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  return { ok: true };
}

/**
 * Toggle a form's published (is_active) state.
 */
export async function toggleFormActiveAction(formId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Verify ownership
  const { data: form } = await admin
    .from("partner_forms")
    .select("id, is_default")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) return { ok: false, error: "Form not found." };

  // Don't allow unpublishing the default form
  if (form.is_default && !isActive) {
    return { ok: false, error: "Cannot unpublish the default form. Set another form as default first." };
  }

  // Fetch form name before updating
  const { data: formRow } = await admin
    .from("partner_forms")
    .select("name")
    .eq("id", formId)
    .maybeSingle();

  const { error } = await admin
    .from("partner_forms")
    .update({ is_active: isActive })
    .eq("id", formId);

  if (error) return { ok: false, error: error.message };

  // Notify all partner team members about the status change
  const formName = formRow?.name ?? "Untitled form";
  const { data: members } = await admin
    .from("partner_members")
    .select("user_id")
    .eq("partner_id", account.id);

  if (members) {
    const notifType = isActive ? "form_published" : "form_unpublished";
    const title = isActive
      ? `Form published: ${formName}`
      : `Form unpublished: ${formName}`;
    const message = isActive
      ? `"${formName}" is now live and accepting submissions.`
      : `"${formName}" has been taken offline.`;

    for (const member of members) {
      await createNotification(
        member.user_id,
        notifType,
        title,
        message,
        `/dashboard/forms/${formId}`,
      );
    }
  }

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

/**
 * Update per-form notification settings.
 */
export async function updateFormNotificationSettingsAction(
  formId: string,
  settings: {
    notificationEmails: string[];
    notificationBcc: string[];
    confirmPageHeading: string | null;
    confirmPageBody: string | null;
    redirectUrl: string | null;
    partnerEmailSubject?: string | null;
    partnerEmailBody?: string | null;
    clientEmailSubject?: string | null;
    clientEmailBody?: string | null;
  },
): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Verify ownership
  const { data: form } = await admin
    .from("partner_forms")
    .select("id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) return { ok: false, error: "Form not found." };

  // Validate emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of [...settings.notificationEmails, ...settings.notificationBcc]) {
    if (!emailRegex.test(email.trim())) {
      return { ok: false, error: `Invalid email: ${email}` };
    }
  }

  // Validate redirect URL if provided
  if (settings.redirectUrl) {
    try {
      new URL(settings.redirectUrl);
    } catch {
      return { ok: false, error: "Invalid redirect URL. Must be a full URL (https://...)." };
    }
  }

  const { error } = await admin
    .from("partner_forms")
    .update({
      notification_emails: settings.notificationEmails.map((e) => e.trim()).filter(Boolean),
      notification_bcc: settings.notificationBcc.map((e) => e.trim()).filter(Boolean),
      confirm_page_heading: settings.confirmPageHeading?.trim() || null,
      confirm_page_body: settings.confirmPageBody?.trim() || null,
      redirect_url: settings.redirectUrl?.trim() || null,
      partner_email_subject: settings.partnerEmailSubject?.trim() || null,
      partner_email_body: settings.partnerEmailBody?.trim() || null,
      client_email_subject: settings.clientEmailSubject?.trim() || null,
      client_email_body: settings.clientEmailBody?.trim() || null,
    })
    .eq("id", formId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

/**
 * Duplicate a form.
 */
export async function duplicateFormAction(formId: string): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Check form limit
  const { data: existingForms } = await admin
    .from("partner_forms")
    .select("id")
    .eq("partner_id", account.id);

  const currentCount = existingForms?.length ?? 0;
  const limit = getFormsLimitForTier(account.planTier);
  if (limit !== null && currentCount >= limit) {
    return { ok: false, error: `You've reached your plan limit of ${limit} form${limit !== 1 ? "s" : ""}. Upgrade to create more.` };
  }

  // Get the source form + template
  const { data: source } = await admin
    .from("partner_forms")
    .select("name, slug, template_id, form_templates(schema)")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!source) return { ok: false, error: "Form not found." };

  const tpl = Array.isArray(source.form_templates) ? source.form_templates[0] : source.form_templates;
  const newName = `${source.name} (copy)`;
  const newSlug = `${source.slug}-copy-${Date.now().toString(36).slice(-4)}`;

  // Create new template with copied schema
  const { data: newTpl, error: tplErr } = await admin
    .from("form_templates")
    .insert({
      slug: `${account.id.slice(0, 8)}-${newSlug}-${Date.now()}`,
      name: newName,
      version: 1,
      schema: tpl?.schema ?? { steps: [] },
      owner_partner_id: account.id,
    })
    .select("id")
    .single();

  if (tplErr || !newTpl) return { ok: false, error: tplErr?.message ?? "Failed." };

  const { data: pf, error: pfErr } = await admin
    .from("partner_forms")
    .insert({
      partner_id: account.id,
      template_id: newTpl.id,
      is_active: true,
      name: newName,
      slug: newSlug,
      is_default: false,
    })
    .select("id")
    .single();

  if (pfErr || !pf) return { ok: false, error: pfErr?.message ?? "Failed." };

  revalidatePath("/dashboard/forms");
  return { ok: true, formId: pf.id };
}

/**
 * Update the theme mode for the current partner's storefront.
 * Stored on the partners table and controls Dark/Light/Auto for all client-facing forms.
 */
export async function updateThemeModeAction(
  themeMode: "dark" | "light" | "auto",
): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({ theme_mode: themeMode })
    .eq("id", account.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/forms");
  return { ok: true };
}

export type LayoutStyle = "default" | "top-nav" | "no-nav" | "conversation";

/**
 * Update the layout style for a specific form.
 * Controls how the client-facing form renders (sidebar nav, top nav, no nav, or conversation).
 */
export async function updateLayoutStyleAction(
  formId: string,
  layoutStyle: LayoutStyle,
): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_forms")
    .update({ layout_style: layoutStyle })
    .eq("id", formId)
    .eq("partner_id", account.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  return { ok: true };
}

/**
 * Update start page settings for a form.
 */
export async function updateStartPageSettingsAction(
  formId: string,
  settings: {
    startButtonText?: string;
    startDescription?: string;
    skipStartPage?: boolean;
  },
): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (settings.startButtonText !== undefined) update.start_button_text = settings.startButtonText || null;
  if (settings.startDescription !== undefined) update.start_description = settings.startDescription || null;
  if (settings.skipStartPage !== undefined) update.skip_start_page = settings.skipStartPage;

  const { error } = await supabase
    .from("partner_forms")
    .update(update)
    .eq("id", formId)
    .eq("partner_id", account.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath("/dashboard/forms");
  return { ok: true };
}
