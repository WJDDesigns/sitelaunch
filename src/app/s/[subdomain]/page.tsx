import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { contrastText } from "@/lib/color-utils";
import { startSubmissionAction } from "./actions";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";

interface Props {
  params: Promise<{ subdomain: string }>;
}

const LOGO_DIMS: Record<string, { wrapper: string; img: string; fallback: string }> = {
  default: { wrapper: "h-10 rounded-xl", img: "h-8 w-auto", fallback: "w-10 h-10 rounded-xl" },
  large: { wrapper: "h-16 rounded-2xl", img: "h-14 w-auto", fallback: "w-16 h-16 rounded-2xl" },
  "full-width": { wrapper: "h-14 rounded-2xl", img: "h-12 w-auto", fallback: "h-14 px-4 rounded-2xl" },
};

export default async function PartnerHomePage({ params }: Props) {
  const { subdomain } = await params;
  const identifier = decodeURIComponent(subdomain);

  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url, primary_color, accent_color, support_email, plan_tier, hide_branding, custom_footer_text, logo_size, theme_mode")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!partner) return notFound();

  const primary = partner.primary_color || "#c0c1ff";
  const isPaid = partner.plan_tier !== "free";
  const hideBranding = isPaid && partner.hide_branding;
  const footerText = isPaid && partner.custom_footer_text ? partner.custom_footer_text : null;
  const dims = LOGO_DIMS[partner.logo_size] ?? LOGO_DIMS.default;
  const isFullWidth = partner.logo_size === "full-width";

  return (
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient glows using partner color */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[140px] animate-glow-breathe" style={{ backgroundColor: `${primary}0A` }} />
        <div className="absolute bottom-[5%] left-[15%] w-[30%] h-[30%] bg-tertiary/[0.04] rounded-full blur-[120px] animate-glow-breathe" style={{ animationDelay: "-2s" }} />
        <div className="absolute top-[50%] left-[60%] w-[20%] h-[20%] rounded-full blur-[100px] animate-glow-breathe" style={{ backgroundColor: `${primary}06`, animationDelay: "-4s" }} />
      </div>

      {/* Header — hidden in full-width layout */}
      {!isFullWidth && (
        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-5 bg-background/70 backdrop-blur-2xl border-b border-on-surface/[0.04]">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <div className={`${dims.wrapper} flex items-center justify-center`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partner.logo_url} alt={partner.name} className={`${dims.img} object-contain`} />
              </div>
            ) : (
              <div className={`${dims.fallback} flex items-center justify-center shadow-lg`} style={{ backgroundColor: primary, boxShadow: `0 8px 24px ${primary}30` }}>
                <span className="text-on-primary font-bold text-lg" style={{ color: contrastText(primary) }}>{partner.name.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold text-on-surface font-headline tracking-tight">{partner.name}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: `${primary}99` }}>Client Onboarding Portal</span>
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <section className={`flex-1 flex flex-col items-center justify-center px-6 ${isFullWidth ? "pt-16 pb-20" : "pt-36 pb-20"} max-w-4xl mx-auto text-center relative`}>
        <div className="space-y-6 animate-fade-up">
          {/* Full-width layout: large centered logo + name */}
          {isFullWidth && (
            <div className="flex flex-col items-center gap-4 mb-4">
              {partner.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.logo_url} alt={partner.name} className="h-24 md:h-32 w-auto object-contain" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: primary, boxShadow: `0 20px 60px ${primary}30` }}>
                  <span style={{ color: contrastText(primary) }} className="font-bold text-5xl md:text-6xl">{partner.name.slice(0, 1).toUpperCase()}</span>
                </div>
              )}
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface tracking-tight">{partner.name}</h2>
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: `${primary}99` }}>Client Onboarding Portal</span>
              </div>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface max-w-2xl leading-tight">
            {isFullWidth ? "Let\u2019s get started" : `Welcome to ${partner.name} onboarding`}
          </h1>
          <p className="text-lg text-on-surface-variant/70 font-body leading-relaxed max-w-xl mx-auto">
            {isFullWidth
              ? "This onboarding form takes about 10 minutes. You can come back to it anytime with your unique link."
              : "Let\u2019s get your project started. This form takes about 10 minutes and you can come back to it anytime with your unique link."}
          </p>
          <form action={startSubmissionAction} className="pt-4">
            <input type="hidden" name="partner_id" value={partner.id} />
            <input type="hidden" name="subdomain" value={identifier} />
            <button
              type="submit"
              className="group px-10 py-4 font-headline font-bold rounded-xl shadow-xl hover:-translate-y-1 transition-all duration-500 flex items-center gap-3 mx-auto"
              style={{
                backgroundColor: primary,
                color: contrastText(primary),
                boxShadow: `0 10px 40px ${primary}30`,
              }}
            >
              Start onboarding
              <i className="fa-solid fa-arrow-right text-sm group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          {partner.support_email && (
            <p className="text-xs text-on-surface-variant/50 pt-4">
              Questions? <a href={`mailto:${partner.support_email}`} style={{ color: primary }} className="hover:underline">{partner.support_email}</a>
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col items-center gap-4 border-t border-on-surface/[0.06]">
        {hideBranding ? (
          footerText ? (
            <p className="text-xs text-on-surface/40">{footerText}</p>
          ) : null
        ) : (
          <>
            {footerText ? (
              <p className="text-xs text-on-surface/60">{footerText}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <SiteLaunchLogo className="h-5 w-auto text-primary" ringClassName="text-on-surface/50" />
              <span className="text-sm font-bold text-on-surface font-headline">SiteLaunch</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/30">
              &copy; {new Date().getFullYear()} SiteLaunch &middot; WJD Designs
            </p>
          </>
        )}
      </footer>
    </main>
  );
}
