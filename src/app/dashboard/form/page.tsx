import Link from "next/link";
import { requireSession, getCurrentAccount, getVisiblePartners } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormsLimitForTier } from "@/lib/plans";
import type { FormSchema } from "@/lib/forms";
import CreateFormButton from "./CreateFormButton";
import LandingModeToggle from "./LandingModeToggle";
import FormSettingsPanel from "./[formId]/FormSettingsPanel";

export default async function FormsListPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Forms</h1>
        <p className="text-sm text-on-surface-variant mt-2">
          No workspace is associated with your account yet.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Load all forms for this partner
  const { data: forms } = await supabase
    .from("partner_forms")
    .select(
      `id, name, slug, description, is_active, is_default, created_at, template_id,
       notification_emails, notification_bcc,
       confirm_page_heading, confirm_page_body, redirect_url,
       form_templates ( id, schema )`,
    )
    .eq("partner_id", account.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const formsList = forms ?? [];
  const formsLimit = getFormsLimitForTier(account.planTier);
  const canCreateMore = formsLimit === null || formsList.length < formsLimit;

  // Get partner for storefront link + landing mode
  const { data: partner } = await supabase
    .from("partners")
    .select("slug, custom_domain, show_all_forms, theme_mode")
    .eq("id", account.id)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(/:\d+$/, "");
  const storefrontHost = partner?.custom_domain || `${partner?.slug ?? account.slug}.${rootHost}`;

  // Get submission counts per form
  const admin = createAdminClient();
  const formIds = formsList.map((f) => f.id);
  const { data: subData } = formIds.length > 0
    ? await admin
        .from("submissions")
        .select("partner_form_id")
        .in("partner_form_id", formIds)
        .neq("status", "draft")
    : { data: [] };

  const subCountMap: Record<string, number> = {};
  for (const s of subData ?? []) {
    subCountMap[s.partner_form_id] = (subCountMap[s.partner_form_id] ?? 0) + 1;
  }

  // Load partner assignments for all forms in bulk
  const { data: allAssignments } = formIds.length > 0
    ? await admin
        .from("form_partner_assignments")
        .select("partner_form_id, partner_id")
        .in("partner_form_id", formIds)
    : { data: [] };

  const assignmentMap: Record<string, string[]> = {};
  for (const a of allAssignments ?? []) {
    if (!assignmentMap[a.partner_form_id]) assignmentMap[a.partner_form_id] = [];
    assignmentMap[a.partner_form_id].push(a.partner_id);
  }

  // Get sub-partners for settings panel
  const allPartners = await getVisiblePartners();
  const subPartners = allPartners
    .filter((p) => p.id !== account.id)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Forms</h1>
            <p className="text-on-surface-variant mt-1">
              Create and manage onboarding forms for your clients.
              {formsLimit !== null && (
                <span className="text-on-surface-variant/60"> ({formsList.length} / {formsLimit} used)</span>
              )}
            </p>
          </div>
          <CreateFormButton canCreate={canCreateMore} formsLimit={formsLimit} />
        </div>
      </header>

      {formsList.length > 1 && (
        <LandingModeToggle
          showAllForms={partner?.show_all_forms ?? false}
          storefrontUrl={`https://${storefrontHost}`}
        />
      )}

      {formsList.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center shadow-2xl shadow-black/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-file-lines text-xl text-primary" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No forms yet</h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm mx-auto mb-6">
            Create your first onboarding form to start collecting client information.
          </p>
          <CreateFormButton canCreate={canCreateMore} formsLimit={formsLimit} prominent />
        </div>
      ) : (
        <div className="space-y-4">
          {formsList.map((form) => {
            const tpl = form.form_templates && (Array.isArray(form.form_templates) ? form.form_templates[0] : form.form_templates);
            const schema = tpl?.schema as FormSchema | null;
            const stepCount = schema?.steps?.length ?? 0;
            const fieldCount = schema?.steps?.reduce((acc, s) => acc + (s.fields?.length ?? 0), 0) ?? 0;
            const subCount = subCountMap[form.id] ?? 0;
            const formUrl = form.is_default
              ? `https://${storefrontHost}`
              : `https://${storefrontHost}/f/${form.slug}`;

            return (
              <div
                key={form.id}
                className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10 hover:border-primary/20 transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-lines text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                            {form.name}
                          </h3>
                          {form.is_default && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              Default
                            </span>
                          )}
                          {!form.is_active && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant/60 border border-outline-variant/15">
                              Inactive
                            </span>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-xs text-on-surface-variant/60 mt-0.5">{form.description}</p>
                        )}
                        <p className="text-xs text-on-surface-variant/40 font-mono mt-1">/{form.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <FormSettingsPanel
                        formId={form.id}
                        formName={form.name}
                        formSlug={form.slug}
                        isDefault={form.is_default}
                        partners={subPartners}
                        assignedPartnerIds={assignmentMap[form.id] ?? []}
                        storefrontHost={storefrontHost}
                        notificationEmails={(form.notification_emails as string[]) ?? []}
                        notificationBcc={(form.notification_bcc as string[]) ?? []}
                        confirmPageHeading={(form.confirm_page_heading as string) ?? ""}
                        confirmPageBody={(form.confirm_page_body as string) ?? ""}
                        redirectUrl={(form.redirect_url as string) ?? ""}
                        themeMode={(partner?.theme_mode as "dark" | "light" | "auto") ?? "dark"}
                      />
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-xs font-bold text-on-surface-variant/60 border border-outline-variant/15 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                        title="Preview form"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                      </a>
                      <Link
                        href={`/dashboard/form/${form.id}`}
                        className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-outline-variant/[0.06]">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-[10px] text-on-surface-variant/40" />
                      <span className="text-xs text-on-surface-variant">
                        {stepCount} step{stepCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-input-text text-[10px] text-on-surface-variant/40" />
                      <span className="text-xs text-on-surface-variant">
                        {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-inbox text-[10px] text-on-surface-variant/40" />
                      <span className="text-xs text-on-surface-variant">
                        {subCount} submission{subCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
