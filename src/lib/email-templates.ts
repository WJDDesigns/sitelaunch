/**
 * Branded HTML email template wrapper for SiteLaunch emails.
 * Provides consistent styling across all outgoing emails.
 *
 * Also supports DB-stored templates from the `email_templates` table,
 * with in-memory caching (5-minute TTL) and graceful fallback.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { emailTemplateCache } from "@/lib/cache-manager";

/* ------------------------------------------------------------------ */
/*  DB template helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch a template row from `public.email_templates` by slug.
 * Returns null when the slug does not exist.
 * Results are cached via the managed email template cache.
 */
export async function getTemplate(
  slug: string,
): Promise<{ subject: string; html: string } | null> {
  const cached = emailTemplateCache.get(slug);
  if (cached) {
    return { subject: cached.subject, html: cached.html_body };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("email_templates")
      .select("subject, html_body")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;

    emailTemplateCache.set(slug, {
      subject: data.subject,
      html_body: data.html_body,
    });

    return { subject: data.subject, html: data.html_body };
  } catch {
    return null;
  }
}

/**
 * Replace all `{{key}}` placeholders in a string with the corresponding
 * value from `vars`. Unknown keys are replaced with an empty string.
 */
export function renderTemplate(
  htmlBody: string,
  vars: Record<string, string>,
): string {
  return htmlBody.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * High-level helper: fetch a DB template by slug, render it with the
 * supplied variables, and return the final subject + html.
 *
 * If the template does not exist in the DB the function returns `null`
 * so the caller can fall back to the legacy `emailTemplate()` wrapper.
 */
export async function getRenderedEmail(
  slug: string,
  vars: Record<string, string>,
): Promise<{ subject: string; html: string } | null> {
  const tpl = await getTemplate(slug);
  if (!tpl) return null;

  return {
    subject: renderTemplate(tpl.subject, vars),
    html: renderTemplate(tpl.html, vars),
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy branded wrapper (kept as fallback)                          */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface TemplateOptions {
  /** Main heading text */
  heading: string;
  /** Body content (raw HTML) */
  body: string;
  /** Optional CTA button */
  cta?: { label: string; url: string };
  /** Footer text — defaults to SiteLaunch branding */
  footer?: string;
  /** Optional partner name for "on behalf of" line */
  partnerName?: string;
}

/**
 * Wraps email content in a branded, responsive HTML template.
 * Uses inline styles for maximum email client compatibility.
 */
export function emailTemplate(opts: TemplateOptions): string {
  const footerText = opts.partnerName
    ? `Sent from SiteLaunch on behalf of ${escapeHtml(opts.partnerName)}.`
    : opts.footer ?? "Sent from SiteLaunch.";

  const ctaBlock = opts.cta
    ? `
      <tr>
        <td style="padding: 24px 0 0;">
          <a href="${opts.cta.url}"
             style="display: inline-block; background: #696cf8; color: #ffffff; text-decoration: none;
                    padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px;
                    letter-spacing: 0.02em;">
            ${escapeHtml(opts.cta.label)}
          </a>
        </td>
      </tr>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f8;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td style="padding: 0 0 24px; text-align: center;">
              <img src="https://mysitelaunch.com/email-logo.png" alt="SiteLaunch" width="60" height="77" style="display: block; margin: 0 auto 8px; border: 0;" />
              <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">SiteLaunch</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 0 0 16px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                      ${escapeHtml(opts.heading)}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="color: #475569; font-size: 15px; line-height: 1.6;">
                    ${opts.body}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                ${escapeHtml(footerText)}<br />
                Need help? Reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export { escapeHtml };
