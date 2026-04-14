import { createAdminClient } from "@/lib/supabase/admin";
import ClientThemeScript from "./ClientThemeScript";

interface Props {
  params: Promise<{ subdomain: string }>;
  children: React.ReactNode;
}

/**
 * Layout for all client-facing /s/[subdomain] routes.
 * Reads the partner's theme_mode preference and injects a small script
 * to set the correct dark/light class before React hydrates — preventing FOUC.
 * Uses admin client because these are public pages (no user auth cookies).
 */
export default async function SubdomainLayout({ params, children }: Props) {
  const { subdomain } = await params;
  const identifier = decodeURIComponent(subdomain);

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("theme_mode")
    .or(`slug.eq.${identifier},custom_domain.eq.${identifier}`)
    .maybeSingle();

  // Default to dark if partner not found or no preference
  const themeMode = (partner?.theme_mode as string) || "dark";

  return (
    <>
      <ClientThemeScript themeMode={themeMode} />
      {children}
    </>
  );
}
