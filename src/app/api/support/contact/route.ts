import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { emailTemplate, escapeHtml, getRenderedEmail } from "@/lib/email-templates";
import { rateLimiter } from "@/lib/rate-limit";

const VALID_SUBJECTS = [
  "Bug Report",
  "Feature Request",
  "Account Issue",
  "Billing Question",
  "Other",
];

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`support-contact:${ip}`, 5, 60);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "Please select a valid subject." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: "Message is too long (max 5000 characters)." }, { status: 400 });
    }

    // Try DB template first, fall back to hardcoded
    const dbEmail = await getRenderedEmail("support_contact", {
      sender_name: name.trim(),
      sender_email: email.trim(),
      subject,
      message: message.trim(),
    });

    const html = dbEmail?.html ?? emailTemplate({
      heading: `[Support] ${subject}`,
      body: `
        <p style="margin: 0 0 8px;">
          <strong>From:</strong> ${escapeHtml(name.trim())} &lt;${escapeHtml(email.trim())}&gt;
        </p>
        <p style="margin: 0 0 8px;">
          <strong>Subject:</strong> ${escapeHtml(subject)}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message.trim())}</p>
      `,
    });

    const result = await sendMail({
      to: "support@wjddesigns.com",
      subject: dbEmail?.subject ?? `[linqme Support] ${subject} - ${name.trim()}`,
      html,
      replyTo: email.trim(),
    });

    if (!result.ok) {
      console.error("[support/contact] Failed to send:", result.error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[support/contact] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
