"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession, requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({
      name,
      primary_color,
      accent_color,
      support_email,
      support_phone,
      custom_domain,
    })
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
  const supabase = await createClient();
  if (session.role !== "superadmin") {
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

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${partnerId}/logo-${Date.now()}.${ext}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("partners")
    .update({ logo_url: pub.publicUrl })
    .eq("id", partnerId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/partners/${partnerId}`);
  revalidatePath("/dashboard/partners");
}

export async function deletePartnerAction(partnerId: string) {
  await requireSuperadmin();
  const supabase = await createClient();
  const { error } = await supabase.from("partners").delete().eq("id", partnerId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/partners");
  revalidatePath("/dashboard");
  redirect("/dashboard/partners");
}
