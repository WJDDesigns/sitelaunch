import { requireSession, getCurrentAccount, getVisiblePartners } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import EntriesList from "./EntriesList";

export default async function EntriesPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Entries</h1>
        <p className="text-sm text-on-surface-variant mt-2">No workspace is associated with your account yet.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  // Load all submissions for this partner
  const { data: submissions } = await admin
    .from("submissions")
    .select(
      `id, status, client_name, client_email, submitted_at, created_at, form_slug,
       partner_form_id,
       partners ( id, name, slug, primary_color, logo_url ),
       partner_forms ( id, name )`,
    )
    .eq("partner_id", account.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (submissions ?? []).map((s) => {
    const partner = Array.isArray(s.partners) ? s.partners[0] : s.partners;
    const pf = Array.isArray(s.partner_forms) ? s.partner_forms[0] : s.partner_forms;
    return {
      id: s.id as string,
      status: s.status as string,
      client_name: (s.client_name as string) ?? null,
      client_email: (s.client_email as string) ?? null,
      submitted_at: (s.submitted_at as string) ?? null,
      created_at: s.created_at as string,
      partner_form_id: (s.partner_form_id as string) ?? null,
      form_slug: (s.form_slug as string) ?? null,
      form_name: (pf as { id: string; name: string } | null)?.name ?? null,
    };
  });

  // Get forms for the filter dropdown
  const { data: forms } = await admin
    .from("partner_forms")
    .select("id, slug, name")
    .eq("partner_id", account.id)
    .order("name");

  const formOptions = (forms ?? []).map((f) => ({
    id: f.id as string,
    slug: f.slug as string,
    name: f.name as string,
  }));

  const isSuperadmin = session.role === "superadmin";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 space-y-6 md:space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-on-surface">Entries</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          All form submissions across your forms.
        </p>
      </header>

      <EntriesList
        submissions={rows}
        forms={formOptions}
        isSuperadmin={isSuperadmin}
      />
    </div>
  );
}
