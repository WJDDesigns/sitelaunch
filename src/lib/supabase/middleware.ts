import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if expired.
  const { data: { user } } = await supabase.auth.getUser();

  // Check AAL level for MFA enforcement
  let aal: string | null = null;
  let hasMfaFactors = false;

  if (user) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = aalData?.currentLevel ?? null;

    // Check if user has any verified TOTP factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    hasMfaFactors = (factors?.totp ?? []).some(f => f.status === "verified")
      || (factors?.phone ?? []).some(f => f.status === "verified");
  }

  return { response, user, aal, hasMfaFactors };
}
