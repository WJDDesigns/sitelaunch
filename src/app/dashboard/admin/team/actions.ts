"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/** Only platform owner(s) listed in SUPERADMIN_EMAILS can grant superadmin. */
function isPlatformOwner(email: string): boolean {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  if (!raw) return false;
  return raw.split(",").map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}

export async function inviteTeamMemberAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperadmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "partner_member");

  if (!email) return { ok: false, error: "Email is required." };
  if (!["superadmin", "partner_owner", "partner_member"].includes(role)) {
    return { ok: false, error: "Invalid role." };
  }

  // Only the platform owner can grant the superadmin role
  if (role === "superadmin" && !isPlatformOwner(session.email)) {
    return { ok: false, error: "Only the platform owner can invite Super Admins." };
  }

  const admin = createAdminClient();

  // Check if user already exists
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { ok: false, error: "This user already has an account." };

  // Check for pending invite
  const { data: pendingInvite } = await admin
    .from("invites")
    .select("id")
    .eq("email", email)
    .is("accepted_at", null)
    .is("partner_id", null)
    .maybeSingle();

  if (pendingInvite) return { ok: false, error: "An invite is already pending for this email." };

  // Create invite
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("invites").insert({
    email,
    role,
    token,
    partner_id: null,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/team");
  return { ok: true };
}

export async function updateRoleAction(
  userId: string,
  newRole: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperadmin();

  if (!["superadmin", "partner_owner", "partner_member"].includes(newRole)) {
    return { ok: false, error: "Invalid role." };
  }

  // Only the platform owner can grant the superadmin role
  if (newRole === "superadmin" && !isPlatformOwner(session.email)) {
    return { ok: false, error: "Only the platform owner can promote to Super Admin." };
  }

  // Don't allow demoting yourself
  if (userId === session.userId && newRole !== "superadmin") {
    return { ok: false, error: "You cannot demote yourself." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/team");
  return { ok: true };
}

export async function removeTeamMemberAction(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSuperadmin();

  if (userId === session.userId) {
    return { ok: false, error: "You cannot remove yourself." };
  }

  const admin = createAdminClient();

  // Remove all partner memberships
  const { error: memberError } = await admin
    .from("partner_members")
    .delete()
    .eq("user_id", userId);

  if (memberError) return { ok: false, error: memberError.message };

  // Set role to client (effectively deactivate)
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "client" })
    .eq("id", userId);

  if (profileError) return { ok: false, error: profileError.message };

  revalidatePath("/dashboard/admin/team");
  return { ok: true };
}
