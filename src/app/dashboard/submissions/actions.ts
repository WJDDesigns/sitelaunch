"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification, notifyPartnerOfSubmission } from "@/lib/notifications";
import { fireWebhooks } from "@/lib/webhooks";
import { fireSheetsSync } from "@/lib/sheets/sync";
import { sendMail } from "@/lib/email";
import { emailTemplate, escapeHtml, getRenderedEmail } from "@/lib/email-templates";

type SubmissionStatus = "draft" | "submitted" | "in_review" | "complete" | "archived";

/**
 * Verify the current user owns the given submission(s).
 * Superadmins can access all submissions.
 */
async function authorizeSubmissions(submissionIds: string[]): Promise<void> {
  const session = await requireSession();
  if (session.role === "superadmin") return;

  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submissions")
    .select("id, partner_id")
    .in("id", submissionIds);

  if (error) throw new Error(error.message);
  if (!data || data.length !== submissionIds.length) {
    throw new Error("One or more submissions not found.");
  }

  for (const sub of data) {
    if (sub.partner_id !== account.id) {
      throw new Error("Not authorized to modify this submission.");
    }
  }
}

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  complete: "Complete",
  archived: "Archived",
};

export async function updateSubmissionStatusAction(submissionId: string, status: SubmissionStatus) {
  await authorizeSubmissions([submissionId]);
  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ status })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);

  // Send notification to partner team members
  const { data: sub } = await admin
    .from("submissions")
    .select("client_name, partner_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (sub) {
    const clientName = sub.client_name || "A client";
    const { data: members } = await admin
      .from("partner_members")
      .select("user_id")
      .eq("partner_id", sub.partner_id);

    if (members) {
      for (const member of members) {
        await createNotification(
          member.user_id,
          "entry_status",
          `Entry marked ${STATUS_LABELS[status]}`,
          `${clientName}'s submission was updated to ${STATUS_LABELS[status]}.`,
          `/dashboard/submissions/${submissionId}`,
        );
      }
    }
  }

  revalidatePath("/dashboard/submissions");
  revalidatePath("/dashboard/entries");
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

export async function deleteSubmissionAction(submissionId: string) {
  await authorizeSubmissions([submissionId]);
  const admin = createAdminClient();

  // Delete files from storage first
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path")
    .eq("submission_id", submissionId);

  if (files && files.length > 0) {
    await admin.storage
      .from("submissions")
      .remove(files.map((f) => f.storage_path));
  }

  const { error } = await admin
    .from("submissions")
    .delete()
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
  revalidatePath("/dashboard/entries");
}

export async function bulkDeleteSubmissionsAction(submissionIds: string[]) {
  if (submissionIds.length === 0) return;
  await authorizeSubmissions(submissionIds);

  const admin = createAdminClient();

  // Delete files from storage
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path")
    .in("submission_id", submissionIds);

  if (files && files.length > 0) {
    await admin.storage
      .from("submissions")
      .remove(files.map((f) => f.storage_path));
  }

  const { error } = await admin
    .from("submissions")
    .delete()
    .in("id", submissionIds);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
  revalidatePath("/dashboard/entries");
}

export async function bulkUpdateStatusAction(submissionIds: string[], status: SubmissionStatus) {
  if (submissionIds.length === 0) return;
  await authorizeSubmissions(submissionIds);

  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ status })
    .in("id", submissionIds);
  if (error) throw new Error(error.message);

  // Notify partner team members about the bulk update
  const { data: subs } = await admin
    .from("submissions")
    .select("partner_id")
    .in("id", submissionIds)
    .limit(1);

  if (subs && subs.length > 0) {
    const partnerId = subs[0].partner_id;
    const { data: members } = await admin
      .from("partner_members")
      .select("user_id")
      .eq("partner_id", partnerId);

    if (members) {
      const count = submissionIds.length;
      for (const member of members) {
        await createNotification(
          member.user_id,
          "entry_status",
          `${count} entries marked ${STATUS_LABELS[status]}`,
          `${count} submissions were bulk-updated to ${STATUS_LABELS[status]}.`,
          "/dashboard/entries",
        );
      }
    }
  }

  revalidatePath("/dashboard/submissions");
  revalidatePath("/dashboard/entries");
}

export async function getSubmissionsCsvData() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const admin = createAdminClient();

  let query = admin
    .from("submissions")
    .select(
      `id, status, client_name, client_email, submitted_at, created_at, data,
       partners ( name, slug ),
       partner_forms ( id, form_templates ( schema ) )`
    )
    .order("created_at", { ascending: false });

  // Scope to account if not superadmin
  if (account && session.role !== "superadmin") {
    query = query.eq("partner_id", account.id);
  }

  const { data: submissions, error } = await query;
  if (error) throw new Error(error.message);
  return submissions ?? [];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Resend entry -- re-fire a submission through its notification flows
 * ────────────────────────────────────────────────────────────────────── */

export interface ResendIntegrationInfo {
  defaultEmails: string[];
  webhooks: { id: string; name: string; provider: string }[];
  hasSheets: boolean;
  sheetsFeeds: { id: string; spreadsheetName: string; sheetName: string }[];
}

/**
 * Load available integrations for a submission so the modal can show
 * checkboxes for what to re-fire.
 */
export async function getResendIntegrationInfo(
  submissionId: string,
): Promise<ResendIntegrationInfo> {
  await authorizeSubmissions([submissionId]);
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("partner_id, partner_form_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) throw new Error("Submission not found.");

  // Default notification emails
  const { data: partner } = await admin
    .from("partners")
    .select("support_email")
    .eq("id", sub.partner_id)
    .maybeSingle();

  let defaultEmails: string[] = [];
  if (partner?.support_email) {
    defaultEmails = [partner.support_email];
  } else {
    const { data: owners } = await admin
      .from("partner_members")
      .select("user_id")
      .eq("partner_id", sub.partner_id)
      .eq("role", "partner_owner");
    if (owners && owners.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("email")
        .in("id", owners.map((o) => o.user_id));
      defaultEmails = (profiles ?? []).map((p) => p.email).filter(Boolean) as string[];
    }
  }

  // Form-level notification_emails override default
  const { data: pf } = await admin
    .from("partner_forms")
    .select("notification_emails")
    .eq("id", sub.partner_form_id)
    .maybeSingle();
  const formEmails = (pf?.notification_emails as string[] | null) ?? [];
  if (formEmails.length > 0) {
    defaultEmails = formEmails;
  }

  // Webhooks
  const { data: webhookRows } = await admin
    .from("form_webhooks")
    .select("id, name, provider")
    .eq("partner_form_id", sub.partner_form_id)
    .eq("partner_id", sub.partner_id)
    .eq("is_enabled", true);

  // Google Sheets feeds
  const { data: sheetRows } = await admin
    .from("sheets_feeds")
    .select("id, spreadsheet_name, sheet_name")
    .eq("partner_form_id", sub.partner_form_id)
    .eq("partner_id", sub.partner_id)
    .eq("is_enabled", true);

  return {
    defaultEmails,
    webhooks: (webhookRows ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      provider: w.provider,
    })),
    hasSheets: (sheetRows ?? []).length > 0,
    sheetsFeeds: (sheetRows ?? []).map((s) => ({
      id: s.id,
      spreadsheetName: s.spreadsheet_name,
      sheetName: s.sheet_name,
    })),
  };
}

export interface ResendOptions {
  sendEmail: boolean;
  emailOverride?: string; // if set, send to this instead of default
  sendWebhooks: boolean;
  sendSheets: boolean;
}

export interface ResendResult {
  ok: boolean;
  sent: string[];
  errors: string[];
}

/**
 * Resend a submission through selected flows.
 */
export async function resendSubmissionAction(
  submissionId: string,
  options: ResendOptions,
): Promise<ResendResult> {
  await authorizeSubmissions([submissionId]);

  const sent: string[] = [];
  const errors: string[] = [];

  // Email notification
  if (options.sendEmail) {
    try {
      if (options.emailOverride) {
        // Send to override address instead of defaults
        await sendResendNotificationEmail(submissionId, options.emailOverride);
      } else {
        await notifyPartnerOfSubmission(submissionId);
      }
      sent.push("Email notification");
    } catch (err) {
      console.error("[resend] email failed:", err);
      errors.push(`Email: ${(err as Error).message}`);
    }
  }

  // Webhooks
  if (options.sendWebhooks) {
    try {
      await fireWebhooks(submissionId);
      sent.push("Webhooks");
    } catch (err) {
      console.error("[resend] webhooks failed:", err);
      errors.push(`Webhooks: ${(err as Error).message}`);
    }
  }

  // Google Sheets
  if (options.sendSheets) {
    try {
      await fireSheetsSync(submissionId);
      sent.push("Google Sheets");
    } catch (err) {
      console.error("[resend] sheets failed:", err);
      errors.push(`Sheets: ${(err as Error).message}`);
    }
  }

  return { ok: errors.length === 0, sent, errors };
}

/**
 * Send the partner notification email to a specific override address.
 * Used for testing -- builds the same email as the normal notification
 * with all form fields included.
 */
async function sendResendNotificationEmail(
  submissionId: string,
  toEmail: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("id, client_name, client_email, data, partner_id, partner_form_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) throw new Error("Submission not found.");

  const { data: partner } = await admin
    .from("partners")
    .select("name")
    .eq("id", sub.partner_id)
    .maybeSingle();
  if (!partner) throw new Error("Partner not found.");

  // Load form schema for field labels
  const { data: pf } = await admin
    .from("partner_forms")
    .select("form_templates ( schema )")
    .eq("id", sub.partner_form_id)
    .maybeSingle();

  const tplRaw = pf?.form_templates;
  const tplObj = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
  const formSchema = (tplObj?.schema as {
    steps: Array<{ fields: Array<{ id: string; label: string; type?: string }> }>;
  }) ?? null;

  const allFields = formSchema?.steps?.flatMap((s) => s.fields) ?? [];
  const submissionData = (sub.data ?? {}) as Record<string, unknown>;

  const clientName = sub.client_name || "A client";
  const clientEmail = sub.client_email || "(no email provided)";
  const appRoot = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.linqme.io";
  const dashboardLink = `${appRoot.replace(/\/$/, "")}/dashboard/submissions/${sub.id}`;

  // Build all-fields HTML table
  const rows: string[] = [];
  for (const field of allFields) {
    if (field.type === "heading") continue;
    const value = submissionData[field.id];
    if (value === null || value === undefined || value === "") continue;

    const label = escapeHtml(field.label || field.id);
    let displayValue: string;
    if (typeof value === "boolean") {
      displayValue = value ? "Yes" : "No";
    } else if (Array.isArray(value)) {
      displayValue = escapeHtml(value.join(", "));
    } else if (typeof value === "object") {
      displayValue = escapeHtml(JSON.stringify(value));
    } else {
      displayValue = escapeHtml(String(value));
    }

    rows.push(
      `<tr>` +
      `<td style="padding:8px 12px;border-bottom:1px solid rgba(105,108,248,0.1);color:#94a3b8;font-size:13px;line-height:1.5;vertical-align:top;white-space:nowrap;width:140px;">${label}</td>` +
      `<td style="padding:8px 12px;border-bottom:1px solid rgba(105,108,248,0.1);color:#e2e8f0;font-size:13px;line-height:1.5;vertical-align:top;">${displayValue}</td>` +
      `</tr>`,
    );
  }

  const allFieldsHtml = rows.length > 0
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;margin-top:16px;">` +
      `<tr><td style="padding:16px;">` +
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">` +
      rows.join("") +
      `</table></td></tr></table>`
    : "";

  const html = emailTemplate({
    heading: `New submission for ${partner.name}`,
    body: `
      <p style="margin: 0 0 8px;">
        <strong>${escapeHtml(clientName)}</strong> submitted their onboarding form.
      </p>
      <p style="margin: 0 0 0;">Client email: <a href="mailto:${escapeHtml(clientEmail)}" style="color: #696cf8;">${escapeHtml(clientEmail)}</a></p>
      ${allFieldsHtml}
    `,
    cta: { label: "View submission", url: dashboardLink },
    partnerName: partner.name,
  });

  await sendMail({
    to: toEmail,
    subject: `New submission -- ${clientName} -- ${partner.name}`,
    html,
    replyTo: sub.client_email || undefined,
  });
}
