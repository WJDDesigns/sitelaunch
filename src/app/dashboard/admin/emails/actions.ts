"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";

export async function updateEmailTemplateAction(
  templateId: string,
  subject: string,
  htmlBody: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperadmin();

  if (!templateId) return { ok: false, error: "Template ID is required." };
  if (!subject.trim()) return { ok: false, error: "Subject is required." };
  if (!htmlBody.trim()) return { ok: false, error: "HTML body is required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_templates")
    .update({
      subject: subject.trim(),
      html_body: htmlBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/emails");
  return { ok: true };
}

/** Sample data for each template slug, used for test emails and preview. */
const SAMPLE_DATA: Record<string, Record<string, string>> = {
  verification: {
    name: "Jane Doe",
    verify_url: "https://mysitelaunch.com/verify?token=sample-token-123",
  },
  verification_resend: {
    name: "Jane Doe",
    verify_url: "https://mysitelaunch.com/verify?token=sample-token-456",
  },
  welcome: {
    company_name: "Acme Agency",
    plan_line: "You're on the Paid plan with unlimited submissions.",
    storefront_url: "https://acme.mysitelaunch.com",
    dashboard_url: "https://mysitelaunch.com/dashboard",
  },
  submission_partner: {
    partner_name: "Acme Agency",
    client_name: "John Smith",
    client_email: "john@example.com",
    dashboard_link: "https://mysitelaunch.com/dashboard/submissions",
  },
  submission_client: {
    client_name: "John Smith",
    partner_name: "Acme Agency",
  },
  partner_invite: {
    inviter_name: "Wayne",
    partner_name: "New Partner",
    invite_url: "https://mysitelaunch.com/invite?token=sample-invite-789",
    role: "Partner Owner",
  },
  support_contact: {
    sender_name: "John Smith",
    sender_email: "john@example.com",
    subject: "Question about onboarding",
    message: "Hi, I had a question about setting up my client onboarding form. Could you help me configure the fields?",
  },
};

function fillTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function sendTestTemplateAction(
  templateId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperadmin();

  const admin = createAdminClient();
  const { data: template, error: fetchError } = await admin
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (fetchError || !template) {
    return { ok: false, error: "Template not found." };
  }

  const sampleVars = SAMPLE_DATA[template.slug] ?? {};
  const filledSubject = fillTemplate(template.subject, sampleVars);
  const filledHtml = fillTemplate(template.html_body, sampleVars);

  const result = await sendMail({
    to: session.email,
    subject: `[TEST] ${filledSubject}`,
    html: filledHtml,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Failed to send test email." };
  }

  if (result.skipped) {
    return { ok: true, error: "RESEND_API_KEY not configured. Email logged to console." };
  }

  return { ok: true };
}
