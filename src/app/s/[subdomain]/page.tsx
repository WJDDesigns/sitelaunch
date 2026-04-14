import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ subdomain: string }>;
}

export default async function PartnerHomePage({ params }: Props) {
  const { subdomain } = await params;
  const identifier = decodeURIComponent(subdomain);

  const supabase = await createClient();

  // Try slug first, then custom domain.
  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url, primary_color, accent_color")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!partner) return notFound();

  const primary = partner.primary_color || "#2563eb";

  return (
    <main
      className="min-h-screen"
      style={{ ["--brand-600" as any]: primary }}
    >
      <header className="px-6 py-5 flex items-center gap-4 border-b border-slate-200 bg-white">
        {partner.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={partner.logo_url} alt={partner.name} className="h-10 w-auto" />
        ) : (
          <div className="text-xl font-semibold">{partner.name}</div>
        )}
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16 text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to {partner.name} onboarding
        </h1>
        <p className="text-slate-600">
          Let&apos;s get your project started. This form takes about 15 minutes.
        </p>
        <a
          href="#start"
          className="inline-block rounded-lg px-5 py-3 text-sm font-medium text-white"
          style={{ backgroundColor: primary }}
        >
          Start onboarding
        </a>
      </section>
    </main>
  );
}
