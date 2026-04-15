import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenant } from "@/lib/tenant";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const host = request.headers.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "mysitelaunch.com";
  const tenant = resolveTenant(host, rootDomain);

  // Tenant debug logging — only in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[mw] host=${host} root=${rootDomain} kind=${tenant.kind} slug=${tenant.slug ?? "-"} path=${request.nextUrl.pathname} user=${user ? "yes" : "no"}`);
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Surface tenant info to downstream Server Components via headers.
  const hdrs = new Headers(request.headers);
  hdrs.set("x-tenant-kind", tenant.kind);
  if (tenant.slug)         hdrs.set("x-tenant-slug", tenant.slug);
  if (tenant.customDomain) hdrs.set("x-tenant-custom-domain", tenant.customDomain);

  // --- Partner subdomain / custom domain routing --------------------------
  // Rewrite everything (except /auth, /api, static) under /s/[identifier]
  if (tenant.kind === "partner") {
    const identifier = tenant.slug || tenant.customDomain!;
    if (!pathname.startsWith("/s/") && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
      url.pathname = `/s/${encodeURIComponent(identifier)}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: hdrs } });
    }
  }

  // --- App-domain auth guard ----------------------------------------------
  if (tenant.kind === "app") {
    const isPublicRoute =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/invite");
    if (!user && !isPublicRoute) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user && pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response ?? NextResponse.next({ request: { headers: hdrs } });
}

export const config = {
  matcher: [
    // Everything except static assets / favicon / images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
