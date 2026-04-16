import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { contrastText } from "@/lib/color-utils";
import { startSubmissionAction } from "../../actions";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import StorefrontThemeToggle from "../../StorefrontThemeToggle";
import AnalyticsTracker from "../../AnalyticsTracker";
import Link from "next/link";

interface Props {
  params: Promise<{ subdomain: string; formSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, formSlug } = await params;
  const identifier = decodeURIComponent(subdomain);
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("name, logo_url")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!partner) return { title: "Not Found" };

  return {
    title: `${formSlug} | ${partner.name}`,
    description: `Complete the ${formSlug} form for ${partner.name}. Powered by SiteLaunch.`,
    openGraph: {
      title: `${partner.name} | ${formSlug}`,
      description: `Complete the ${formSlug} form for ${partner.name}.`,
      ...(partner.logo_url ? { images: [{ url: partner.logo_url, width: 400, height: 400, alt: partner.name }] } : {}),
    },
  };
}

export default async function FormSlugPage({ params }: Props) {
  const { subdomain, formSlug } = await params;
  const identifier = decodeURIComponent(subdomain);

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, name, custom_domain, logo_url, primary_color, accent_color, support_email, plan_tier, hide_branding, custom_footer_text, logo_size, theme_mode")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  if (!partner) return notFound();

  // Find the form by slug — either owned by this partner or assigned to them
  let formName: string | null = null;

  const { data: ownedForm } = await admin
    .from("partner_forms")
    .select("id, name, slug")
    .eq("partner_id", partner.id)
    .eq("slug", formSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (ownedForm) {
    formName = ownedForm.name;
  } else {
    // Check assignments from parent partner
    const { data: assignments } = await admin
      .from("form_partner_assignments")
      .select("partner_form_id, partner_forms(id, name, slug, is_active)")
      .eq("partner_id", partner.id);

    for (const a of assignments ?? []) {
      const pf = Array.isArray(a.partner_forms) ? a.partner_forms[0] : a.partner_forms;
      if (pf?.slug === formSlug && pf?.is_active) {
        formName = pf.name;
        break;
      }
    }
  }

  if (!formName) return notFound();

  const primary = partner.primary_color || "#c0c1ff";
  const isPaid = partner.plan_tier !== "free";
  const hideBranding = isPaid && partner.hide_branding;
  const footerText = isPaid && partner.custom_footer_text ? partner.custom_footer_text : null;

  return (
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <AnalyticsTracker partnerId={partner.id} path={`/f/${formSlug}`} />
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[140px] animate-glow-breathe" style={{ backgroundColor: `${primary}0A` }} />
        <div className="absolute bottom-[5%] left-[15%] w-[30%] h-[30%] bg-tertiary/[0.04] rounded-full blur-[120px] animate-glow-breathe" style={{ animationDelay: "-2s" }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-5 bg-background/70 backdrop-blur-2xl border-b border-on-surface/[0.04]">
        <div className="flex items-center gap-3">
          {partner.logo_url ? (
            <div className="h-10 rounded-xl flex items-center justify-center">
              <Image src={partner.logo_url} alt={partner.name} width={160} height={40} className="h-8 w-auto object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: primary, boxShadow: `0 8px 24px ${primary}30` }}>
              <span className="text-on-primary font-bold text-lg" style={{ color: contrastText(primary) }}>{partner.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xl font-bold text-on-surface font-headline tracking-tight">{partner.name}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: `${primary}99` }}>{formName}</span>
          </div>
        </div>
        <StorefrontThemeToggle partnerDefault={partner.theme_mode || "dark"} />
      </header>

      {/* Content */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-36 pb-20 max-w-4xl mx-auto text-center relative">
        <div className="space-y-6 animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface max-w-2xl leading-tight">
            {formName}
          </h1>
          <p className="text-lg text-on-surface-variant/70 font-body leading-relaxed max-w-xl mx-auto">
            Let&rsquo;s get started. This form takes about 10 minutes and you can come back to it anytime with your unique link.
          </p>
          <form action={startSubmissionAction} className="pt-4">
            <input type="hidden" name="partner_id" value={partner.id} />
            <input type="hidden" name="subdomain" value={identifier} />
            <input type="hidden" name="form_slug" value={formSlug} />
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
          footerText ? <p className="text-xs text-on-surface/40">{footerText}</p> : null
        ) : (
          <>
            {footerText && <p className="text-xs text-on-surface/60">{footerText}</p>}
            <Link href="/" className="flex items-center gap-2">
              <SiteLaunchLogo className="h-5 w-auto text-primary" ringClassName="text-on-surface/50" />
              <span className="text-sm font-bold text-on-surface font-headline">SiteLaunch</span>
            </Link>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/30">
              &copy; {new Date().getFullYear()} SiteLaunch &middot; WJD Designs
            </p>
          </>
        )}
      </footer>
    </main>
  );
}
