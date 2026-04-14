import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Always redirect to the app subdomain's login page so the middleware
  // auth-guard resolves correctly and we never land on a partner or root
  // route that 404s.
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com";
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.endsWith(".lvh.me") || host === "lvh.me"
      ? "http"
      : "https");

  // In local dev the app runs on the bare host; in production it's app.domain
  const isLocal = host.startsWith("localhost") || host.endsWith(".lvh.me") || host === "lvh.me";
  const appHost = isLocal ? host : `app.${rootDomain}`;

  return NextResponse.redirect(`${proto}://${appHost}/login`);
}
