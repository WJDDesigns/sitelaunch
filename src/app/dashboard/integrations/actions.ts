"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function submitIntegrationRequestAction(
  integrationName: string,
  description?: string,
) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account");

  const name = integrationName.trim();
  if (!name || name.length < 2) throw new Error("Integration name is required");
  if (name.length > 100) throw new Error("Name too long");

  const admin = createAdminClient();

  // Upsert -- if they already requested this name, update the description
  const { error } = await admin.from("integration_requests").upsert(
    {
      partner_id: account.id,
      integration_name: name.toLowerCase(),
      description: description?.trim() || null,
    },
    { onConflict: "partner_id,integration_name" },
  );

  if (error) {
    if (error.code === "23505") {
      // Already requested -- not really an error
      return { ok: true, message: "You already requested this integration." };
    }
    throw new Error("Failed to submit request");
  }

  revalidatePath("/dashboard/integrations");
  return { ok: true, message: "Request submitted!" };
}

export async function removeIntegrationRequestAction(integrationName: string) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account");

  const admin = createAdminClient();

  await admin
    .from("integration_requests")
    .delete()
    .eq("partner_id", account.id)
    .eq("integration_name", integrationName.toLowerCase());

  revalidatePath("/dashboard/integrations");
}
