import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`magic-link:${ip}`, 3, 60);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { email, callbackUrl } = await request.json();
  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 },
    );
  }

  // Validate callbackUrl against our own origin to prevent open redirect
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  let safeCallback: string | undefined;
  if (callbackUrl && typeof callbackUrl === "string" && appUrl) {
    try {
      const callbackOrigin = new URL(callbackUrl).origin;
      const appOrigin = new URL(appUrl).origin;
      if (callbackOrigin === appOrigin) {
        safeCallback = callbackUrl;
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: safeCallback },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
