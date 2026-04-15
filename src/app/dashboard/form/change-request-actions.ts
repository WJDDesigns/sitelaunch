"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Partner member submits a form change request for owner approval.
 */
export async function submitFormChangeRequest(
  partnerFormId: string,
  proposedOverrides: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const supabase = await createClient();

  // Get the partner_form to find partner_id
  const { data: pf } = await supabase
    .from("partner_forms")
    .select("id, partner_id")
    .eq("id", partnerFormId)
    .maybeSingle();

  if (!pf) return { ok: false, error: "Form not found." };

  // Verify user is a member
  const { data: membership } = await supabase
    .from("partner_members")
    .select("role")
    .eq("partner_id", pf.partner_id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!membership) return { ok: false, error: "Not authorized." };

  // Check if partner allows form editing
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("allow_partner_form_editing")
    .eq("id", pf.partner_id)
    .maybeSingle();

  if (!partner?.allow_partner_form_editing) {
    return { ok: false, error: "Form editing is not enabled for this partner." };
  }

  // Check for existing pending request
  const { data: existing } = await admin
    .from("form_change_requests")
    .select("id")
    .eq("partner_form_id", partnerFormId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A change request is already pending. Wait for it to be reviewed." };
  }

  // Create the request
  const { error } = await admin.from("form_change_requests").insert({
    partner_id: pf.partner_id,
    partner_form_id: partnerFormId,
    requested_by: session.userId,
    proposed_overrides: proposedOverrides,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/form");
  return { ok: true };
}

/**
 * Account owner approves or rejects a form change request.
 */
export async function reviewFormChangeRequest(
  requestId: string,
  action: "approved" | "rejected",
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();

  if (session.role !== "superadmin" && session.role !== "partner_owner") {
    return { ok: false, error: "Only account owners can review change requests." };
  }

  const admin = createAdminClient();

  const { data: req } = await admin
    .from("form_change_requests")
    .select("id, partner_id, partner_form_id, proposed_overrides, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!req) return { ok: false, error: "Request not found." };
  if (req.status !== "pending") return { ok: false, error: "Request has already been reviewed." };

  // If approving, apply the overrides to the partner_form
  if (action === "approved") {
    const { error: updateError } = await admin
      .from("partner_forms")
      .update({ overrides: req.proposed_overrides })
      .eq("id", req.partner_form_id);

    if (updateError) return { ok: false, error: updateError.message };
  }

  // Update the request
  const { error } = await admin
    .from("form_change_requests")
    .update({
      status: action,
      review_note: note || null,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/form");
  revalidatePath("/dashboard/admin");
  return { ok: true };
}
