"use server";

import { requireSession } from "@/lib/auth";
import { sendMail } from "@/lib/email";

export interface TestEmailResult {
  ok: boolean;
  message: string;
  skipped?: boolean;
}

export async function sendTestEmailAction(): Promise<TestEmailResult> {
  const session = await requireSession();

  // Only superadmins and partner owners can send test emails
  if (session.role !== "superadmin" && session.role !== "partner_owner") {
    return { ok: false, message: "Only admins can send test emails." };
  }
  if (!session.email) {
    return { ok: false, message: "No email on your profile." };
  }

  const result = await sendMail({
    to: session.email,
    subject: "SiteLaunch test email",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Your Resend setup works!</h2>
        <p style="margin: 0; color: #475569;">
          If you're reading this, SiteLaunch can deliver email to ${session.email}.
        </p>
      </div>
    `,
  });

  if (result.skipped) {
    return {
      ok: true,
      skipped: true,
      message:
        "RESEND_API_KEY not set. Email was logged to your server console but not sent.",
    };
  }
  if (!result.ok) {
    return { ok: false, message: result.error ?? "Unknown error" };
  }
  return { ok: true, message: `Sent to ${session.email} (id: ${result.id}).` };
}
