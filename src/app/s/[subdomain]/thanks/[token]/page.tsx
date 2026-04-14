import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: Promise<{ subdomain: string; token: string }>;
}

const LOGO_DIMS: Record<string, { wrapper: string; img: string; fallback: string }> = {
  default: { wrapper: "h-10 rounded-xl", img: "h-8 w-auto", fallback: "w-10 h-10 rounded-xl" },
  large: { wrapper: "h-16 rounded-2xl", img: "h-14 w-auto", fallback: "w-16 h-16 rounded-2xl" },
  "full-width": { wrapper: "h-14 rounded-2xl", img: "h-12 w-auto", fallback: "h-14 px-4 rounded-2xl" },
};

export default async function ThanksPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select(
      `id, status, submitted_at, client_name,
       partners ( slug, name, custom_domain, logo_url, primary_color, support_email, plan_tier, hide_branding, custom_footer_text, logo_size, theme_mode )`,
    )
    .eq("access_token", token)
    .maybeSingle();

  if (!sub) notFound();
  const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
  if (!partner) notFound();

  const primary = partner.primary_color || "#c0c1ff";
  const isPaid = (partner as Record<string, unknown>).plan_tier !== "free";
  const hideBranding = isPaid && (partner as Record<string, unknown>).hide_branding;
  const footerText = isPaid && (partner as Record<string, unknown>).custom_footer_text
    ? String((partner as Record<string, unknown>).custom_footer_text)
    : null;
  const dims = LOGO_DIMS[String((partner as Record<string, unknown>).logo_size ?? "default")] ?? LOGO_DIMS.default;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center px-8 py-6 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {partner.logo_url ? (
            <div className={`${dims.wrapper} flex items-center justify-center`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={partner.logo_url} alt={partner.name} className={`${dims.img} object-contain`} />
            </div>
          ) : (
            <div className={`${dims.fallback} flex items-center justify-center`} style={{ backgroundColor: primary }}>
              <span className="text-on-primary font-bold text-lg">{partner.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <span className="text-lg font-bold text-on-surface font-headline tracking-tight">{partner.name}</span>
        </div>
      </header>

      {/* Content */}
      <section className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="text-center space-y-6 animate-fade-up">
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primary}18` }}
          >
            <i className="fa-solid fa-check text-3xl" style={{ color: primary }} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-on-surface tracking-tight">
              {sub.client_name ? `Thanks, ${sub.client_name.split(" ")[0]}!` : "All done!"}
            </h1>
            <p className="text-on-surface-variant mt-2 text-lg leading-relaxed">
              Your onboarding has been submitted to {partner.name}. They&apos;ll be in touch soon.
            </p>
          </div>
          {partner.support_email && (
            <p className="text-sm text-on-surface-variant/60 pt-4">
              Questions? Email{" "}
              <a href={`mailto:${partner.support_email}`} className="text-primary hover:underline">
                {partner.support_email}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col items-center gap-4 border-t border-on-surface/10">
        {hideBranding ? (
          footerText ? (
            <p className="text-xs text-on-surface/40">{footerText}</p>
          ) : null
        ) : (
          <>
            {footerText ? (
              <p className="text-xs text-on-surface/60">{footerText}</p>
            ) : null}
            <span className="text-sm font-bold text-on-surface font-headline">SiteLaunch</span>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40">
              &copy; {new Date().getFullYear()} SiteLaunch &middot; WJD Designs
            </p>
          </>
        )}
      </footer>
    </main>
  );
}
