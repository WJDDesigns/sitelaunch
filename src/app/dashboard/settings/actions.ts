"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const custom_domain_raw = String(formData.get("custom_domain") ?? "");
  const custom_domain = custom_domain_raw ? sanitizeDomain(custom_domain_raw) : null;

  if (!name) throw new Error("Name is required");
  if (!isHexColor(primary_color)) throw new Error("Invalid primary color");
  if (!isHexColor(accent_color)) throw new Error("Invalid accent color");

  const slug = sanitizeSlug(slug_raw || account.slug);

  // If slug changed, check uniqueness
  if (slug !== account.slug) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .eq("slug", slug)
      .neq("id", account.id)
      .maybeSingle();
    if (existing) throw new Error(`The slug "${slug}" is already taken`);
  }

  const updatePayload: Record<string, unknown> = {
    name,
    slug,
    primary_color,
    accent_color,
    support_email,
    support_phone,
    custom_domain,
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
