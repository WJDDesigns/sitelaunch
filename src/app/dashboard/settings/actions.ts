"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDomainToVercel, removeDomainFromVercel, isVercelConfigured } from "@/lib/vercel-domains";
import { stripe } from "@/lib/stripe";

function isHexColor(v: string) {
  return /^#[0-9a-f]{6}$/i.test(v);
}

function sanitizeDomain(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v)) {
    throw new Error("Invalid custom domain");
  }
  return v;
}

function sanitizeSlug(raw: string): string {
  const v = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!v || v.length < 2) throw new Error("Slug must be at least 2 characters");
  if (v.length > 48) throw new Error("Slug must be 48 characters or fewer");
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(v)) {
    throw new Error("Slug must start with a letter and end with a letter or number");
  }
  // Reserved slugs
  const reserved = ["app", "api", "www", "admin", "dashboard", "login", "auth", "static", "assets", "cdn"];
  if (reserved.includes(v)) throw new Error(`"${v}" is a reserved slug`);
  return v;
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) throw new Error("No workspace found");

  // Only workspace owner (superadmin or partner_owner) can update
  // For now, any member with access to the settings page can update.
  // RLS will further protect the row.

  const name = String(formData.get("name") ?? "").trim();
  const slug_raw = String(formData.get("slug") ?? "").trim();
  const primary_color = String(formData.get("primary_color") ?? "#c0c1ff");
  const accent_color = String(formData.get("accent_color") ?? "#3cddc7");
  const support_email =
    String(formData.get("support_email") ?? "").trim() || null;
  const support_phone =
    String(formData.get("support_phone") ?? "").trim() || null;

  if (!name) throw new Error("Name is required");
  if (!isHexColor(primary_color)) throw new Error("Invalid primary color");
  if (!isHexColor(accent_color)) throw new Error("Invalid accent color");

  // Slug can only be changed by superadmin — regular users keep their existing slug
  let slug = account.slug;
  if (session.role === "superadmin" && slug_raw) {
    slug = sanitizeSlug(slug_raw);
    if (slug !== account.slug) {
      const adminCheck = createAdminClient();
      const { data: existing } = await adminCheck
        .from("partners")
        .select("id")
        .eq("slug", slug)
        .neq("id", account.id)
        .maybeSingle();
      if (existing) throw new Error(`The slug "${slug}" is already taken`);
    }
  }

  const updatePayload: Record<string, unknown> = {
    name,
    slug,
    primary_color,
    accent_color,
    support_email,
    support_phone,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update(updatePayload)
    .eq("id", account.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/form");
  revalidatePath("/dashboard");
}

export async function uploadWorkspaceLogoAction(formData: FormData) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No workspace found");

  const file = formData.get("logo") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    throw new Error("No file provided");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo must be 5MB or smaller");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Logo must be an image");
  }

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${account.id}/logo-${Date.now()}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("partners")
    .update({ logo_url: pub.publicUrl })
    .eq("id", account.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateWorkspaceWhiteLabelAction(formData: FormData) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No workspace found");

  const hide_branding = formData.get("hide_branding") === "true";
  const custom_footer_text = String(formData.get("custom_footer_text") ?? "").trim() || null;
  const logo_size = String(formData.get("logo_size") ?? "default");
  const rawThemeMode = String(formData.get("theme_mode") ?? "dark");
  const theme_mode = ["dark", "light", "auto"].includes(rawThemeMode) ? rawThemeMode : "dark";

  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update({ hide_branding, custom_footer_text, logo_size, theme_mode })
    .eq("id", account.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function saveWorkspaceDomainAction(formData: FormData) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No workspace found");

  const custom_domain_raw = String(formData.get("custom_domain") ?? "").trim();
  const custom_domain = custom_domain_raw ? sanitizeDomain(custom_domain_raw) : null;

  const admin = createAdminClient();

  // Get the old domain so we can remove it from Vercel if it changed
  const { data: current } = await admin
    .from("partners")
    .select("custom_domain")
    .eq("id", account.id)
    .maybeSingle();

  const oldDomain = current?.custom_domain ?? null;

  // Register/remove domain with Vercel (SSL + routing)
  if (isVercelConfigured()) {
    if (oldDomain && oldDomain !== custom_domain) {
      await removeDomainFromVercel(oldDomain);
    }
    if (custom_domain) {
      const result = await addDomainToVercel(custom_domain);
      if (!result.ok) {
        throw new Error(result.error ?? "Failed to register domain with hosting provider.");
      }
    }
  }

  const { error } = await admin
    .from("partners")
    .update({ custom_domain })
    .eq("id", account.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/form");
  revalidatePath("/dashboard");
}

/* ─── Smart Overview Toggle ─── */

export async function toggleSmartOverviewAction(enabled: boolean) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account");

  const admin = createAdminClient();
  // Merge into existing settings JSONB
  const { data: partner } = await admin
    .from("partners")
    .select("settings")
    .eq("id", account.id)
    .maybeSingle();

  const currentSettings = (partner?.settings as Record<string, unknown>) ?? {};
  await admin
    .from("partners")
    .update({ settings: { ...currentSettings, smart_overview_enabled: enabled } })
    .eq("id", account.id);

  revalidatePath("/dashboard/settings");
}

/* ─── Profile Actions ─── */

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession();
  const fullName = String(formData.get("full_name") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", session.userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateEmailAction(formData: FormData) {
  const session = await requireSession();
  const newEmail = String(formData.get("new_email") ?? "").trim();

  if (!newEmail) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error("Invalid email address");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(session.userId, {
    email: newEmail,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}

export async function updatePasswordAction(formData: FormData) {
  const session = await requireSession();
  const newPassword = String(formData.get("new_password") ?? "");

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(session.userId, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);
}

export async function uploadAvatarAction(formData: FormData): Promise<string> {
  const session = await requireSession();

  const file = formData.get("avatar") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    throw new Error("No file provided");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Avatar must be 5 MB or smaller");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Avatar must be an image");
  }

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${session.userId}/avatar-${Date.now()}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);

  // Store avatar URL in profiles table
  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: pub.publicUrl })
    .eq("id", session.userId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return pub.publicUrl;
}

/* ─── Session Actions ─── */

export async function revokeSessionAction(
  sessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();

  try {
    const { revokeSession } = await import("@/lib/session-tracker");
    await revokeSession(session.userId, sessionId);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to revoke session",
    };
  }
}

export async function revokeAllOtherSessionsAction(
  currentSessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();

  try {
    const { revokeAllOtherSessions } = await import("@/lib/session-tracker");
    await revokeAllOtherSessions(session.userId, currentSessionId);
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to revoke sessions",
    };
  }
}

/**
 * Permanently delete the user's account, workspace, and all associated data.
 * The confirmation phrase must match exactly to proceed.
 */
export async function deleteAccountAction(
  confirmationPhrase: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) return { ok: false, error: "No account found." };

  // Verify the confirmation phrase
  const expected = `delete ${account.name}`;
  if (confirmationPhrase.trim().toLowerCase() !== expected.toLowerCase()) {
    return { ok: false, error: "Confirmation phrase does not match." };
  }

  const admin = createAdminClient();

  // 1. Cancel active Stripe subscription if any
  try {
    const { data: partner } = await admin
      .from("partners")
      .select("stripe_customer_id")
      .eq("id", account.id)
      .maybeSingle();

    if (partner?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: partner.stripe_customer_id,
        status: "active",
      });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
      const trialSubs = await stripe.subscriptions.list({
        customer: partner.stripe_customer_id,
        status: "trialing",
      });
      for (const sub of trialSubs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch {
    // Stripe errors shouldn't block account deletion
  }

  // 2. Remove custom domain from Vercel if set
  try {
    const { data: partner } = await admin
      .from("partners")
      .select("custom_domain")
      .eq("id", account.id)
      .maybeSingle();

    if (partner?.custom_domain) {
      await removeDomainFromVercel(partner.custom_domain);
    }
  } catch {
    // Domain cleanup errors shouldn't block deletion
  }

  // 3. Delete the partner record — CASCADE handles all child tables:
  //    partner_members, partner_forms, submissions, subscriptions,
  //    invoices, billing_events, invites, page_views, etc.
  const { error: partnerErr } = await admin
    .from("partners")
    .delete()
    .eq("id", account.id);

  if (partnerErr) {
    return { ok: false, error: `Failed to delete workspace: ${partnerErr.message}` };
  }

  // 4. Delete the auth user (cascades to profiles table)
  const { error: authErr } = await admin.auth.admin.deleteUser(session.userId);
  if (authErr) {
    return { ok: false, error: `Workspace deleted but failed to remove auth account: ${authErr.message}` };
  }

  return { ok: true };
}
