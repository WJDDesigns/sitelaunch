"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isHexColor(v: string) {
  return /^#[0-9a-f]{6}$/i.test(v);
}

function sanitizeDomain(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  // Basic hostname validation: letters, digits, dots, hyphens
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v)) {
    throw new Error("Invalid custom domain");
  }
  return v;
}

export async function updatePartnerAction(partnerId: string, formData: FormData) {
  const session = await requireSession();
  // Partner owners can update their own partner; superadmin can update any.
  if (session.role !== "superadmin") {
    // Ensure caller is a member of this partner (RLS will also protect us, but
    // we double-check here for a clearer error).
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", partnerId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!membership || membership.role !== "partner_owner") {
      throw new Error("Not authorized");
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  const primary_color = String(formData.get("primary_color") ?? "#2563eb");
  const accent_color = String(formData.get("accent_color") ?? "#f97316");
  const support_email =
    String(formData.get("support_email") ?? "").trim() || null;
  const support_phone =
    String(formData.get("support_phone") ?? "").trim() || null;
  const custom_domain_raw = String(formData.get("custom_domain") ?? "");
  const custom_domain = custom_domain_raw ? sanitizeDomain(custom_domain_raw) : null;

  if (!name) throw new Error("Name is required");
  if (!isHexColor(primary_color)) throw new Error("Invalid primary color");
  if (!isHexColor(accent_color)) throw new Error("Invalid accent color");

  const updatePayload: Record<string, unknown> = {
    name,
    primary_color,
    accent_color,
    support_email,
    support_phone,
    custom_domain,
  };

  // Use admin client — authorization was already verified above.
  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update(updatePayload)
    .eq("id", partnerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/partners/${partnerId}`);
  revalidatePath("/dashboard/partners");
  revalidatePath("/dashboard");
}

export async function updateWhiteLabelAction(partnerId: string, formData: FormData) {
  const session = await requireSession();
  if (session.role !== "superadmin") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", partnerId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!membership || membership.role !== "partner_owner") {
      throw new Error("Not authorized");
    }
  }

  // Checkbox: if unchecked, the field won't be in formData at all
  const hide_branding = formData.get("hide_branding") === "true";
  const custom_footer_text = String(formData.get("custom_footer_text") ?? "").trim() || null;
  const logo_size = String(formData.get("logo_size") ?? "default");
  const theme_mode = String(formData.get("theme_mode") ?? "dark");

  // Use admin client — authorization was already verified above.
  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update({ hide_branding, custom_footer_text, logo_size, theme_mode })
    .eq("id", partnerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/partners/${partnerId}`);
  revalidatePath("/dashboard/partners");
  revalidatePath("/dashboard");
}

export async function uploadLogoAction(partnerId: string, formData: FormData) {
  const session = await requireSession();
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

  // Authorize
  if (session.role !== "superadmin") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", partnerId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!membership || membership.role !== "partner_owner") {
      throw new Error("Not authorized");
    }
  }

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${partnerId}/logo-${Date.now()}.${ext}`;

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
    .eq("id", partnerId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/partners/${partnerId}`);
  revalidatePath("/dashboard/partners");
}

export async function deletePartnerAction(partnerId: string) {
  const session = await requireSession();

  // Superadmin can delete any partner. Otherwise caller must be a
  // partner_owner on this specific partner.
  if (session.role !== "superadmin") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", partnerId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!membership || membership.role !== "partner_owner") {
      throw new Error("Not authorized");
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("partners").delete().eq("id", partnerId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/partners");
  revalidatePath("/dashboard");
  // Client navigates after this resolves — avoids Next 15's broken
  // host resolution in server-action redirects.
}
