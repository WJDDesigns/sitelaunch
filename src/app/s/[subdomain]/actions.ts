"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/host-url";

export async function startSubmissionAction(formData: FormData) {
  const partnerId = String(formData.get("partner_id") ?? "");
  const subdomain = String(formData.get("subdomain") ?? "");
  const formSlug = String(formData.get("form_slug") ?? "").trim();
  if (!partnerId || !subdomain) throw new Error("Missing partner");

  const admin = createAdminClient();

  // Find the appropriate form:
  // 1. If a specific form_slug is provided, look it up
  // 2. Check form_partner_assignments for forms assigned to this partner
  // 3. Fall back to the partner's default active form
  let pf: { id: string; slug: string } | null = null;

  if (formSlug) {
    // Look for a form with this slug owned by the partner or assigned to them
    const { data: ownedForm } = await admin
      .from("partner_forms")
      .select("id, slug")
      .eq("partner_id", partnerId)
      .eq("slug", formSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (ownedForm) {
      pf = ownedForm;
    } else {
      // Check assignments
      const { data: assigned } = await admin
        .from("form_partner_assignments")
        .select("partner_form_id, partner_forms(id, slug, is_active)")
        .eq("partner_id", partnerId)
        .maybeSingle();

      if (assigned) {
        const assignedForm = Array.isArray(assigned.partner_forms) ? assigned.partner_forms[0] : assigned.partner_forms;
        if (assignedForm?.is_active && assignedForm?.slug === formSlug) {
          pf = { id: assignedForm.id, slug: assignedForm.slug };
        }
      }
    }
  }

  if (!pf) {
    // Fall back to default form
    const { data: defaultForm } = await admin
      .from("partner_forms")
      .select("id, slug")
      .eq("partner_id", partnerId)
      .eq("is_active", true)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    if (!defaultForm) {
      // Last resort: any active form
      const { data: anyForm } = await admin
        .from("partner_forms")
        .select("id, slug")
        .eq("partner_id", partnerId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      pf = anyForm;
    } else {
      pf = defaultForm;
    }
  }

  if (!pf) throw new Error("No active form for this partner");

  const { data: sub, error: subErr } = await admin
    .from("submissions")
    .insert({
      partner_id: partnerId,
      partner_form_id: pf.id,
      form_slug: pf.slug,
      status: "draft",
      data: {},
    })
    .select("id, access_token")
    .single();
  if (subErr) throw new Error(subErr.message);

  // Record form start event for analytics
  await admin.from("form_events").insert({
    partner_id: partnerId,
    form_slug: pf.slug,
    submission_id: sub.id,
    event_type: "start",
  }).then(() => {}, (err) => {
    console.error("[submission] form_events start insert failed:", err);
  }); // fire-and-forget, don't block on analytics

  redirect(await absoluteUrl(`/start/${sub.access_token}`));
}
