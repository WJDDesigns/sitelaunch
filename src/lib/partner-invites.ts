"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { getRenderedEmail } from "@/lib/email-templates";
import crypto from "crypto";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appUrl(path: string): string {
  const root = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mysitelaunch.com";
  return `${root.replace(/\/$/, "")}${path}`;
}

/**
 * Create a partner invite and send a styled email.
 */
export async function createPartnerInvite(args: {
  email: string;
  partnerId: string;
  partnerName: string;
  invitedByUserId: string;
  invitedByName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  // Check for existing account
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", args.email)
    .maybeSingle();

  if (existing) {
    // Check if already a member of this partner
    const { data: membership } = await admin
      .from("partner_members")
      .select("partner_id")
      .eq("partner_id", args.partnerId)
      .eq("user_id", existing.id)
      .maybeSingle();

    if (membership) {
      return { ok: false, error: "This user is already a member of this partner." };
    }
  }

  // Check for pending invite to this partner
  const { data: pendingInvite } = await admin
    .from("invites")
    .select("id")
    .eq("email", args.email)
    .eq("partner_id", args.partnerId)
    .is("accepted_at", null)
    .maybeSingle();

  if (pendingInvite) {
    return { ok: false, error: "An invite is already pending for this email." };
  }

  // Create the invite
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("invites").insert({
    email: args.email,
    partner_id: args.partnerId,
    role: "partner_member",
    token,
    invited_by: args.invitedByUserId,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: error.message };

  // Send invite email
  const inviteUrl = appUrl(`/invite/${token}`);

  // Try DB template first, fall back to hardcoded
  const dbEmail = await getRenderedEmail("partner_invite", {
    inviter_name: args.invitedByName,
    partner_name: args.partnerName,
    invite_url: inviteUrl,
    role: "partner_member",
  });

  const fallbackHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0b1326 0%, #1a1f3a 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
        <img src="https://mysitelaunch.com/email-logo.png" alt="SiteLaunch" width="60" height="77" style="display: block; margin: 0 auto 8px; border: 0;" />
        <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
          SiteLaunch
        </div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">
          Partner Invitation
        </div>
      </div>

      <!-- Body -->
      <div style="background: #ffffff; padding: 40px 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 8px; color: #0f172a; font-size: 22px; font-weight: 700;">
          You&rsquo;re invited to join ${escapeHtml(args.partnerName)}
        </h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">
          <strong style="color: #0f172a;">${escapeHtml(args.invitedByName)}</strong> has invited you to
          manage <strong style="color: #0f172a;">${escapeHtml(args.partnerName)}</strong> on SiteLaunch,
          the client onboarding platform for agencies.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 600; margin-bottom: 12px;">
            What you&rsquo;ll be able to do
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 1.8;">
            &#10003;&nbsp; Update your brand logo, colors &amp; display name<br/>
            &#10003;&nbsp; View client onboarding submissions<br/>
            &#10003;&nbsp; Edit your business profile &amp; contact info<br/>
            &#10003;&nbsp; Customize your intake form (if enabled)
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${inviteUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #696cf8 0%, #8b5cf6 100%);
                    color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px;
                    font-weight: 700; font-size: 15px; letter-spacing: 0.3px;
                    box-shadow: 0 4px 14px rgba(105, 108, 248, 0.4);">
            Accept Invitation &rarr;
          </a>
        </div>

        <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
          This invitation expires in 14 days.<br/>
          If you didn&rsquo;t expect this, you can safely ignore it.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;
                  border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Sent from SiteLaunch &middot; Client onboarding for agencies
        </p>
      </div>
    </div>
  `;

  await sendMail({
    to: args.email,
    subject: dbEmail?.subject ?? `You're invited to join ${args.partnerName} on SiteLaunch`,
    html: dbEmail?.html ?? fallbackHtml,
  });

  return { ok: true };
}

/**
 * Look up an invite by token. Returns null if not found or expired.
 */
export async function getInviteByToken(token: string) {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("id, email, partner_id, role, token, invited_by, accepted_at, expires_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return null;

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) return null;

  // Already accepted
  if (invite.accepted_at) return null;

  return invite;
}

/**
 * Accept an invite: create user account, add as partner_member, mark invite accepted.
 */
export async function acceptPartnerInvite(args: {
  token: string;
  fullName: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const invite = await getInviteByToken(args.token);
  if (!invite) return { ok: false, error: "This invite is invalid or has expired." };
  if (!invite.partner_id) return { ok: false, error: "Invalid partner invite." };

  // Check if user already exists with this email
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", invite.email)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    // Existing user — just add them to the partner.
    // Do NOT overwrite their profile role; they may already be a partner_owner
    // of their own account. The partner_members row is what grants access.
    userId = existingProfile.id;
  } else {
    // Create new user account
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: invite.email,
      password: args.password,
      email_confirm: true,
      user_metadata: { full_name: args.fullName },
    });

    if (createError || !newUser.user) {
      return { ok: false, error: createError?.message ?? "Failed to create account." };
    }

    userId = newUser.user.id;

    // Update profile with name and role — only for brand-new users
    await admin
      .from("profiles")
      .update({ full_name: args.fullName, role: "partner_member" })
      .eq("id", userId);
  }

  // Add as partner member
  const { error: memberError } = await admin
    .from("partner_members")
    .upsert({
      partner_id: invite.partner_id,
      user_id: userId,
      role: "partner_member",
    });

  if (memberError) return { ok: false, error: memberError.message };

  // Mark invite as accepted
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Log event
  await admin.from("events").insert({
    partner_id: invite.partner_id,
    actor_id: userId,
    name: "partner_invite_accepted",
    props: { invite_id: invite.id, email: invite.email },
  });

  return { ok: true };
}
