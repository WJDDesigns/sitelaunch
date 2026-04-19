import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`forgot-password:${ip}`, 3, 60);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { email, redirectTo } = await request.json();
  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 },
    );
  }

  // Validate redirectTo against our own origin to prevent open redirect
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  let safeRedirect: string | undefined;
  if (redirectTo && typeof redirectTo === "string" && appUrl) {
    try {
      const redirectOrigin = new URL(redirectTo).origin;
      const appOrigin = new URL(appUrl).origin;
      if (redirectOrigin === appOrigin) {
        safeRedirect = redirectTo;
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: safeRedirect,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
