import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { startSubmissionAction } from "./actions";

interface Props {
  params: Promise<{ subdomain: string }>;
}

export default async function PartnerHomePage({ params }: Props) {
  const { subdomain } = await params;
  const identifier = decodeURIComponent(subdomain);

  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url, primary_color, accent_color, support_email")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!partner) return notFound();

  const primary = partner.primary_color || "#2563eb";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-6 py-5 flex items-center gap-4 border-b border-slate-200 bg-white">
        {partner.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={partner.logo_url} alt={partner.name} className="h-10 w-auto" />
        ) : (
          <div className="text-xl font-semibold">{partner.name}</div>
        )}
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16 text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Welcome to {partner.name} onboarding
        </h1>
        <p className="text-slate-600">
          Let&apos;s get your project started. This form takes about 10 minutes and you can come back to it anytime with your unique link.
        </p>
        <form action={startSubmissionAction}>
          <input type="hidden" name="partner_id" value={partner.id} />
          <input type="hidden" name="subdomain" value={identifier} />
          <button
            type="submit"
            className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: primary }}
          >
            Start onboarding →
          </button>
        </form>
        {partner.support_email && (
          <p className="text-xs text-slate-500 pt-4">
            Questions? <a href={`mailto:${partner.support_email}`} className="underline">{partner.support_email}</a>
          </p>
        )}
      </section>
    </main>
  );
}
