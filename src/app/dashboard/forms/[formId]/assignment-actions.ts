"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Update which partners are assigned to a form.
 */
export async function updateFormPartnersAction(
  formId: string,
  partnerIds: string[],
): Promise<ActionResult> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account found." };

  const admin = createAdminClient();

  // Verify form ownership
  const { data: form } = await admin
    .from("partner_forms")
    .select("id")
    .eq("id", formId)
    .eq("partner_id", account.id)
    .maybeSingle();

  if (!form) return { ok: false, error: "Form not found." };

  // Delete existing assignments for this form
  await admin
    .from("form_partner_assignments")
    .delete()
    .eq("partner_form_id", formId);

  // Insert new assignments
  if (partnerIds.length > 0) {
    const rows = partnerIds.map((pid) => ({
      partner_form_id: formId,
      partner_id: pid,
      is_default: false,
    }));

    const { error } = await admin
      .from("form_partner_assignments")
      .insert(rows);

    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath("/dashboard/forms");
  return { ok: true };
}
