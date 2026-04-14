import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function buildOrigin(request: NextRequest): string {
  // Use the real Host header so we stay on app.lvh.me / partner domains
  // instead of Next's internal localhost:3000 URL.
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.endsWith(".lvh.me") || host === "lvh.me" ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = buildOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
