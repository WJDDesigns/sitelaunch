import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenant } from "@/lib/tenant";
import { validateEnv } from "@/lib/env";

// Validate required server-side env vars on first request.
validateEnv();

export async function middleware(request: NextRequest) {
  const { response, user, aal, hasMfaFactors } = await updateSession(request);

  const host = request.headers.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "linqme.io";
  const tenant = resolveTenant(host, rootDomain);

  // Tenant debug logging — only in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[mw] host=${host} root=${rootDomain} kind=${tenant.kind} slug=${tenant.slug ?? "-"} path=${request.nextUrl.pathname} user=${user ? "yes" : "no"} aal=${aal ?? "-"}`);
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Surface tenant info to downstream Server Components via headers.
  const hdrs = new Headers(request.headers);
  hdrs.set("x-tenant-kind", tenant.kind);
  if (tenant.slug)         hdrs.set("x-tenant-slug", tenant.slug);
  if (tenant.customDomain) hdrs.set("x-tenant-custom-domain", tenant.customDomain);

  // --- Partner subdomain / custom domain routing --------------------------
  if (tenant.kind === "partner") {
    const identifier = tenant.slug || tenant.customDomain!;
    if (!pathname.startsWith("/s/") && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
      url.pathname = `/s/${encodeURIComponent(identifier)}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: hdrs } });
    }
  }

  // --- App-domain auth guard + MFA enforcement ----------------------------
  if (tenant.kind === "app") {
    const isPublicRoute =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/invite") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/support") ||
      pathname.startsWith("/docs") ||
      pathname.startsWith("/status");

    // Routes that are exempt from MFA enforcement (user needs access to complete MFA)
    const isMfaRoute =
      pathname.startsWith("/auth/mfa") ||
      pathname.startsWith("/api/auth/passkey") ||
      pathname.startsWith("/auth/signout");

    // Not logged in — redirect to login
    if (!user && !isPublicRoute) {
      const originalUrl = `${pathname}${url.search}`;
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(originalUrl)}`;
      return NextResponse.redirect(url);
    }

    // Logged in but hasn't set up MFA — redirect to MFA setup
    // (only for protected routes, not public or MFA routes)
    if (user && !isPublicRoute && !isMfaRoute && !hasMfaFactors) {
      // User has no MFA factors enrolled — force setup
      // Check for passkeys in our custom table too (via header flag set by API)
      const originalUrl = `${pathname}${url.search}`;
      url.pathname = "/auth/mfa/setup";
      url.search = `?next=${encodeURIComponent(originalUrl)}`;
      return NextResponse.redirect(url);
    }

    // Logged in with MFA factors but hasn't verified this session (aal1 instead of aal2)
    if (user && !isPublicRoute && !isMfaRoute && hasMfaFactors && aal === "aal1") {
      const originalUrl = `${pathname}${url.search}`;
      url.pathname = "/auth/mfa/challenge";
      url.search = `?next=${encodeURIComponent(originalUrl)}`;
      return NextResponse.redirect(url);
    }

    // Logged in and on homepage — redirect to dashboard
    if (user && pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response ?? NextResponse.next({ request: { headers: hdrs } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
