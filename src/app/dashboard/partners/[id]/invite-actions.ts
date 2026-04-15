"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPartnerInvite } from "@/lib/partner-invites";

/**
 * Send a partner invite from the partner detail page.
 */
export async function sendPartnerInviteAction(
  partnerId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { ok: false, error: "Email is required." };

  // Verify authorization
  if (session.role !== "superadmin") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", partnerId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!membership || membership.role !== "partner_owner") {
      return { ok: false, error: "Not authorized." };
    }
  }

  // Get partner name for the email
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("name")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) return { ok: false, error: "Partner not found." };

  // Get inviter name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", session.userId)
    .maybeSingle();

  const result = await createPartnerInvite({
    email,
    partnerId,
    partnerName: partner.name,
    invitedByUserId: session.userId,
    invitedByName: profile?.full_name || profile?.email || "Admin",
  });

  if (result.ok) {
    revalidatePath(`/dashboard/partners/${partnerId}`);
  }

  return result;
}

/**
 * Revoke a pending invite.
 */
export async function revokePartnerInviteAction(
  partnerId: string,
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
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
      return { ok: false, error: "Not authorized." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("invites")
    .delete()
    .eq("id", inviteId)
    .eq("partner_id", partnerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}`);
  return { ok: true };
}

/**
 * Remove a partner member.
 */
export async function removePartnerMemberAction(
  partnerId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
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
      return { ok: false, error: "Not authorized." };
    }
  }

  // Don't allow removing yourself
  if (userId === session.userId) {
    return { ok: false, error: "You cannot remove yourself." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("partner_members")
    .delete()
    .eq("partner_id", partnerId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}`);
  return { ok: true };
}

/**
 * Toggle the allow_partner_form_editing flag.
 */
export async function toggleFormEditingAction(
  partnerId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
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
      return { ok: false, error: "Not authorized." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update({ allow_partner_form_editing: enabled })
    .eq("id", partnerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}`);
  return { ok: true };
}
