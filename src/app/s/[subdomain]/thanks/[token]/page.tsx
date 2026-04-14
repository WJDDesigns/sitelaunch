import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: Promise<{ subdomain: string; token: string }>;
}

export default async function ThanksPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select(
      `id, status, submitted_at, client_name,
       partners ( slug, name, custom_domain, logo_url, primary_color, support_email )`,
    )
    .eq("access_token", token)
    .maybeSingle();

  if (!sub) notFound();
  const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
  if (!partner) notFound();

  const primary = partner.primary_color || "#2563eb";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 flex items-center gap-3 border-b border-slate-200 bg-white">
        {partner.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={partner.logo_url} alt={partner.name} className="h-8 w-auto" />
        ) : (
          <div className="text-base font-semibold text-slate-900">{partner.name}</div>
        )}
      </header>

      <section className="max-w-xl mx-auto px-6 py-20 text-center space-y-6">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl"
          style={{ backgroundColor: primary }}
        >
          ✓
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {sub.client_name ? `Thanks, ${sub.client_name.split(" ")[0]}!` : "Thanks!"}
        </h1>
        <p className="text-slate-600">
          Your onboarding has been submitted to {partner.name}. They&apos;ll be in touch soon.
        </p>
        {partner.support_email && (
          <p className="text-sm text-slate-500 pt-4">
            Questions? Email{" "}
            <a href={`mailto:${partner.support_email}`} className="underline">
              {partner.support_email}
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
