/**
 * Send an email verification link after signup.
 * Uses the admin API to generate a Supabase magic link (type: "magiclink")
 * and sends it via Resend so we control the template.
 */
export async function sendVerificationEmail(args: {
  to: string;
  companyName: string;
  redirectTo: string;
}): Promise<void> {
  const admin = createAdminClient();

  // Generate a Supabase sign-up confirmation link.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: args.to,
    options: { redirectTo: args.redirectTo },
  });

  if (linkErr || !linkData) {
    console.error("[notifications] generateLink failed:", linkErr?.message);
    throw new Error(linkErr?.message ?? "Failed to generate verification link");
  }

  // The generated link contains hashed_token + verification_type params.
  // We use the full action link Supabase provides.
  const verifyUrl = linkData.properties?.action_link;
  if (!verifyUrl) {
    throw new Error("Supabase did not return an action_link");
  }

  // Try DB template first, fall back to hardcoded
  const dbEmail = await getRenderedEmail("verification", {
    name: args.companyName,
    verify_url: verifyUrl,
  });

  const html = dbEmail?.html ?? emailTemplate({
    heading: "Verify your email",
    body: `
      <p style="margin: 0 0 8px;">
        Hi ${escapeHtml(args.companyName)}, thanks for signing up for SiteLaunch!
      </p>
      <p style="margin: 0 0 0;">
        Click the button below to verify your email address and get started.
        This link will expire in 24 hours.
      </p>
    `,
    cta: { label: "Verify email address", url: verifyUrl },
  });

  await sendMail({
    to: args.to,
    subject: dbEmail?.subject ?? "Verify your email — SiteLaunch",
    html,
  });
}

/**
 * Resend the verification email for a user who hasn't confirmed yet.
 */
export async function resendVerificationEmail(args: {
  email: string;
  redirectTo: string;
}): Promise<void> {
  const admin = createAdminClient();

  // Look up the user to get their name for the email template.
  const { data: listData } = await admin.auth.admin.listUsers();
  const user = listData?.users?.find(
    (u) => u.email?.toLowerCase() === args.email.toLowerCase(),
  );

  const companyName = user?.user_metadata?.full_name ?? "there";

  // Generate a new magic link.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: args.email,
    options: { redirectTo: args.redirectTo },
  });

  if (linkErr || !linkData) {
    throw new Error(linkErr?.message ?? "Failed to generate verification link");
  }

  const verifyUrl = linkData.properties?.action_link;
  if (!verifyUrl) {
    throw new Error("Supabase did not return an action_link");
  }

  // Try DB template first, fall back to hardcoded
  const dbEmail = await getRenderedEmail("verification_resend", {
    name: companyName,
    verify_url: verifyUrl,
  });

  const html = dbEmail?.html ?? emailTemplate({
    heading: "Verify your email",
    body: `
      <p style="margin: 0 0 8px;">
        Hi ${escapeHtml(companyName)}, here's a new verification link for your SiteLaunch account.
      </p>
      <p style="margin: 0 0 0;">
        Click the button below to verify your email address. This link will expire in 24 hours.
      </p>
    `,
    cta: { label: "Verify email address", url: verifyUrl },
  });

  await sendMail({
    to: args.email,
    subject: dbEmail?.subject ?? "Verify your email — SiteLaunch",
    html,
  });
}

/**
 * Send a welcome email when someone completes signup.
 */
export async function sendWelcomeEmail(args: {
  to: string;
  companyName: string;
  slug: string;
  planType: "agency" | "agency_plus_partners";
}): Promise<void> {
  const appUrlRoot =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mysitelaunch.com";
  const storefrontRoot = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com"
  ).replace(/:\d+$/, "");
  const storefrontUrl =
    process.env.NODE_ENV === "production"
      ? `https://${args.slug}.${storefrontRoot}`
      : `http://${args.slug}.${storefrontRoot}${process.env.NEXT_PUBLIC_ROOT_DOMAIN?.match(/:(\d+)$/)?.[0] ?? ""}`;
  const dashboardUrl = `${appUrlRoot.replace(/\/$/, "")}/dashboard`;

  const planLine =
    args.planType === "agency_plus_partners"
      ? "Your Agency + Partners workspace is ready — you can spin up sub-partners whenever you want."
      : "Your Agency workspace is ready.";

  // Try DB template first, fall back to hardcoded
  const dbEmail = await getRenderedEmail("welcome", {
    company_name: args.companyName,
    plan_line: planLine,
    storefront_url: storefrontUrl,
    dashboard_url: dashboardUrl,
  });

  const html = dbEmail?.html ?? emailTemplate({
    heading: `Welcome to SiteLaunch, ${args.companyName}!`,
    body: `
      <p style="margin: 0 0 8px;">${escapeHtml(planLine)}</p>
      <p style="margin: 0 0 0;">
        Your client-facing storefront lives at
        <a href="${storefrontUrl}" style="color: #696cf8; font-weight: 600;">${storefrontUrl.replace(/^https?:\/\//, "")}</a>.
      </p>
    `,
    cta: { label: "Open dashboard →", url: dashboardUrl },
  });

  await sendMail({
    to: args.to,
    subject: dbEmail?.subject ?? "Welcome to SiteLaunch",
    html,
  });
}

/**
 * Create an in-app notification for a user.
 * Uses the admin client (service role) so it can be called from any server context.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
  });
  if (error) {
    console.error("[notifications] createNotification failed:", error.message);
  }
}

/**
 * Higher-level notification helpers that compose data + email templates.
 *
 * These use the service-role client because they run from contexts where
 * RLS would otherwise block access to another user's rows (e.g. the
 * anonymous client submitting a form).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { emailTemplate, escapeHtml, getRenderedEmail } from "@/lib/email-templates";

function appUrl(path: string): string {
  const root = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mysitelaunch.com";
  return `${root.replace(/\/$/, "")}${path}`;
}

/**
 * Resolve the email address to notify for a given partner.
 * Priority: partner.support_email → first partner_owner's profile email.
 */
async function resolvePartnerNotifyEmails(
  partnerId: string,
): Promise<string[]> {
  const admin = createAdminClient();

  const { data: partner } = await admin
    .from("partners")
    .select("support_email")
    .eq("id", partnerId)
    .maybeSingle();

  if (partner?.support_email) return [partner.support_email];

  // Fallback: all partner_owners on this partner
  const { data: owners } = await admin
    .from("partner_members")
    .select("user_id")
    .eq("partner_id", partnerId)
    .eq("role", "partner_owner");

  if (!owners || owners.length === 0) return [];

  const userIds = owners.map((o) => o.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .in("id", userIds);

  return (profiles ?? [])
    .map((p) => p.email)
    .filter((e): e is string => !!e);
}

/**
 * Called when a client finalizes (submits) their onboarding.
 * Sends a notification email to the partner's team + a confirmation to the client.
 */
export async function notifyPartnerOfSubmission(submissionId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("id, client_name, client_email, data, partner_id, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return;

  const { data: partner } = await admin
    .from("partners")
    .select("id, name, slug, support_email")
    .eq("id", sub.partner_id)
    .maybeSingle();
  if (!partner) return;

  const partnerEmails = await resolvePartnerNotifyEmails(sub.partner_id);

  const clientName = sub.client_name || "A client";
  const clientEmail = sub.client_email || "(no email provided)";
  const dashboardLink = appUrl(`/dashboard/submissions/${sub.id}`);

  // --- Partner notification ------------------------------------------------
  if (partnerEmails.length > 0) {
    const dbPartnerEmail = await getRenderedEmail("submission_partner", {
      partner_name: partner.name,
      client_name: clientName,
      client_email: clientEmail,
      dashboard_link: dashboardLink,
    });

    const html = dbPartnerEmail?.html ?? emailTemplate({
      heading: `New submission for ${partner.name}`,
      body: `
        <p style="margin: 0 0 8px;">
          <strong>${escapeHtml(clientName)}</strong> just submitted their onboarding form.
        </p>
        <p style="margin: 0 0 0;">Client email: <a href="mailto:${escapeHtml(clientEmail)}" style="color: #696cf8;">${escapeHtml(clientEmail)}</a></p>
      `,
      cta: { label: "View submission →", url: dashboardLink },
      partnerName: partner.name,
    });
    await sendMail({
      to: partnerEmails,
      subject: dbPartnerEmail?.subject ?? `New submission · ${clientName} · ${partner.name}`,
      html,
      replyTo: sub.client_email || undefined,
    });
  }

  // --- Client confirmation -------------------------------------------------
  if (sub.client_email) {
    const dbClientEmail = await getRenderedEmail("submission_client", {
      client_name: clientName,
      partner_name: partner.name,
    });

    const html = dbClientEmail?.html ?? emailTemplate({
      heading: `Thanks, ${clientName} — we got it!`,
      body: `
        <p style="margin: 0 0 0;">
          Your onboarding info has been received by <strong>${escapeHtml(partner.name)}</strong>.
          They&rsquo;ll reach out with next steps shortly.
        </p>
      `,
      partnerName: partner.name,
    });
    await sendMail({
      to: sub.client_email,
      subject: dbClientEmail?.subject ?? `We received your onboarding info · ${partner.name}`,
      html,
      replyTo: partner.support_email || undefined,
    });
  }
}
