"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isHexColor(v: string) {
  return /^#[0-9a-f]{6}$/i.test(v);
}

export async function createPartnerAction(formData: FormData) {
  const session = await requireSuperadmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = sanitizeSlug(String(formData.get("slug") ?? ""));
  const primary_color = String(formData.get("primary_color") ?? "#2563eb");
  const accent_color = String(formData.get("accent_color") ?? "#f97316");
  const support_email = String(formData.get("support_email") ?? "").trim() || null;
  const support_phone = String(formData.get("support_phone") ?? "").trim() || null;
  const custom_domain =
    String(formData.get("custom_domain") ?? "").trim().toLowerCase() || null;

  if (!name) throw new Error("Name is required");
  if (!slug) throw new Error("Slug is required");
  if (!isHexColor(primary_color)) throw new Error("Invalid primary color");
  if (!isHexColor(accent_color)) throw new Error("Invalid accent color");

  const supabase = await createClient();
  const { data: partner, error } = await supabase
    .from("partners")
    .insert({
      name,
      slug,
      primary_color,
      accent_color,
      support_email,
      support_phone,
      custom_domain,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/partners");
  redirect(`/dashboard/partners/${partner.id}`);
}
