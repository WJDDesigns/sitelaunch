import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ClientThemeScript from "./ClientThemeScript";

interface Props {
  params: Promise<{ subdomain: string }>;
  children: React.ReactNode;
}

/**
 * Resolve partner record for metadata + theme.
 * Uses admin client because these are public pages (no user auth cookies).
 */
async function getPartner(subdomain: string) {
  const identifier = decodeURIComponent(subdomain);
  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("name, logo_url, primary_color, theme_mode, plan_tier, hide_branding")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();
  return data;
}

/**
 * Dynamic metadata per partner — sets favicon to their logo when available,
 * customizes the page title, and sets the theme color.
 */
export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
  const { subdomain } = await params;
  const partner = await getPartner(subdomain);

  if (!partner) {
    return { title: "SiteLaunch" };
  }

  const isPaid = partner.plan_tier !== "free";
  const useBranding = isPaid && partner.hide_branding;
  const title = useBranding ? partner.name : `${partner.name} · SiteLaunch`;
  const primary = partner.primary_color || "#c0c1ff";

  const icons: Metadata["icons"] = {};

  if (partner.logo_url) {
    // Use the partner's logo as the favicon
    icons.icon = [
      { url: partner.logo_url, type: "image/png" },
    ];
    icons.apple = [
      { url: partner.logo_url },
    ];
  }

  return {
    title: { default: title, template: `%s · ${partner.name}` },
    description: `Client onboarding portal for ${partner.name}`,
    icons: partner.logo_url ? icons : undefined,
    other: {
      "theme-color": primary,
    },
  };
}

/**
 * Layout for all client-facing /s/[subdomain] routes.
 * Reads the partner's theme_mode preference and injects a small script
 * to set the correct dark/light class before React hydrates — preventing FOUC.
 */
export default async function SubdomainLayout({ params, children }: Props) {
  const { subdomain } = await params;
  const partner = await getPartner(subdomain);

  // Default to dark if partner not found or no preference
  const themeMode = (partner?.theme_mode as string) || "dark";

  return (
    <>
      <ClientThemeScript themeMode={themeMode} />
      {children}
    </>
  );
}
