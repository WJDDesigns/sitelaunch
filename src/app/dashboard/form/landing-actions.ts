"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function toggleShowAllFormsAction(showAll: boolean) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No workspace found." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("partners")
    .update({ show_all_forms: showAll })
    .eq("id", account.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
