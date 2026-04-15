"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDomainToVercel, removeDomainFromVercel, isVercelConfigured } from "@/lib/vercel-domains";

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
  const theme_mode = String(formData.get("theme_mode") ?? "dark");

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
  let cnameTarget: string | null = null;
  if (isVercelConfigured()) {
    if (oldDomain && oldDomain !== custom_domain) {
      await removeDomainFromVercel(oldDomain);
    }
    if (custom_domain) {
      const result = await addDomainToVercel(custom_domain);
      if (!result.ok) {
        throw new Error(result.error ?? "Failed to register domain with hosting provider.");
      }
      cnameTarget = result.cnameTarget ?? null;
    }
  }

  const updatePayload: Record<string, unknown> = { custom_domain };
  if (cnameTarget) updatePayload.cname_target = cnameTarget;

  const { error } = await admin
    .from("partners")
    .update(updatePayload)
    .eq("id", account.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/form");
  revalidatePath("/dashboard");
}
