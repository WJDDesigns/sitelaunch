import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SubmissionsList from "./SubmissionsList";

export default async function SubmissionsListPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      `id, status, client_name, client_email, submitted_at, created_at,
       partners ( id, name, slug, primary_color, logo_url )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Flatten into the shape SubmissionsList expects
  const rows = (submissions ?? []).map((s) => {
    const partner = Array.isArray(s.partners) ? s.partners[0] : s.partners;
    return {
      id: s.id,
      status: s.status,
      client_name: s.client_name,
      client_email: s.client_email,
      submitted_at: s.submitted_at,
      created_at: s.created_at,
      partner_name: partner?.name ?? null,
      partner_color: partner?.primary_color ?? null,
      partner_logo: partner?.logo_url ?? null,
    };
  });

  const isSuperadmin = session.role === "superadmin";

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Submissions</h1>
        <p className="text-on-surface-variant mt-1">
          Onboarding responses from clients.
        </p>
      </header>

      <SubmissionsList submissions={rows} isSuperadmin={isSuperadmin} />
    </div>
  );
}
