"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";

export async function startSubmissionAction(formData: FormData) {
  const partnerId = String(formData.get("partner_id") ?? "");
  const subdomain = String(formData.get("subdomain") ?? "");
  if (!partnerId || !subdomain) throw new Error("Missing partner");

  const admin = createAdminClient();

  // Find the partner's active form
  const { data: pf, error: pfErr } = await admin
    .from("partner_forms")
    .select("id")
    .eq("partner_id", partnerId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (pfErr) throw new Error(pfErr.message);
  if (!pf) throw new Error("No active form for this partner");

  const { data: sub, error: subErr } = await admin
    .from("submissions")
    .insert({
      partner_id: partnerId,
      partner_form_id: pf.id,
      status: "draft",
      data: {},
    })
    .select("id, access_token")
    .single();
  if (subErr) throw new Error(subErr.message);

  redirect(await absoluteUrl(`/start/${sub.access_token}`));
}
