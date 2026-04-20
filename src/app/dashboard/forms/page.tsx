import { redirect } from "next/navigation";
import { requireSession, getPartnerMemberContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormSchema } from "@/lib/forms";
import EmbedButton from "@/app/dashboard/form/EmbedButton";

export default async function PartnerFormsReadOnlyPage() {
  const session = await requireSession();

  // Only partner_member context users without form editing see this page.
  // We check the partner context (not profile role) because dual-role users
  // may have a partner_owner profile role while in a partner_member context.
  const partnerCtx = await getPartnerMemberContext(session.userId);
  if (!partnerCtx) {
    redirect("/dashboard/form");
  }

  if (partnerCtx.allowFormEditing) {
    redirect("/dashboard/form");
  }

  const admin = createAdminClient();

  // Load forms for this partner
  const { data: forms } = await admin
    .from("partner_forms")
    .select(
      `id, name, slug, description, is_active, is_default, created_at, template_id,
       form_templates ( id, schema )`,
    )
    .eq("partner_id", partnerCtx.partnerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const formsList = forms ?? [];

  // Get partner for storefront link
  const { data: partner } = await admin
    .from("partners")
    .select("slug, custom_domain")
    .eq("id", partnerCtx.partnerId)
    .maybeSingle();

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(/:\d+$/, "");
  const storefrontHost = partner?.custom_domain || `${partner?.slug ?? partnerCtx.partnerSlug}.${rootHost}`;

  // Get submission counts per form
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Forms</h1>
          <p className="text-on-surface-variant mt-1">
            Forms created by the agency for your workspace.
          </p>
        </div>
      </header>

      {formsList.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center shadow-2xl shadow-black/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-file-lines text-xl text-primary" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">No forms yet</h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm mx-auto">
            Your agency hasn&apos;t created any forms for this workspace yet.
          </p>
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
                className="bg-surface-container rounded-2xl border border-outline-variant/[0.06] overflow-hidden shadow-lg shadow-black/10 group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-lines text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface">
                            {form.name}
                          </h3>
                          {form.is_default && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              Default
                            </span>
                          )}
                          {form.is_active ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              Active
                            </span>
                          ) : (
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
                      <EmbedButton formUrl={formUrl} formName={form.name} />
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-xs font-bold text-on-surface-variant/60 border border-outline-variant/15 rounded-lg hover:border-primary/30 hover:text-primary transition-all"
                        title="Preview form"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px] mr-1" />
                        Preview
                      </a>
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
