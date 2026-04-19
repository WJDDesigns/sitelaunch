import { NextRequest, NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";

/**
 * GET /api/verify-social?platform=instagram&handle=username
 *
 * Checks whether a social media handle likely exists by requesting
 * the public profile URL. Returns { exists: boolean }.
 *
 * This is a best-effort check -- some platforms may block or
 * rate-limit server-side requests. We use a short timeout and
 * treat errors as "unknown" rather than "not found".
 */

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h.replace(/^@/, "")}/`,
  facebook: (h) => `https://www.facebook.com/${h.replace(/^@/, "")}`,
  x: (h) => `https://x.com/${h.replace(/^@/, "")}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h.replace(/^@/, "")}`,
  tiktok: (h) => `https://www.tiktok.com/@${h.replace(/^@/, "")}`,
  youtube: (h) => `https://www.youtube.com/@${h.replace(/^@/, "")}`,
  pinterest: (h) => `https://www.pinterest.com/${h.replace(/^@/, "")}/`,
  threads: (h) => `https://www.threads.net/@${h.replace(/^@/, "")}`,
};

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`verify-social:${ip}`, 30, 60);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const platform = req.nextUrl.searchParams.get("platform");
  const handle = req.nextUrl.searchParams.get("handle");

  if (!platform || !handle) {
    return NextResponse.json({ error: "Missing platform or handle" }, { status: 400 });
  }

  const urlBuilder = PLATFORM_URLS[platform];
  if (!urlBuilder) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const cleanHandle = handle.trim().replace(/^@/, "");
  if (!cleanHandle || cleanHandle.length < 2) {
    return NextResponse.json({ exists: false, status: "invalid" });
  }

  const profileUrl = urlBuilder(cleanHandle);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(profileUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkVerifier/1.0)",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    // Most platforms return 200 for existing profiles, 404 for missing ones.
    // Some (like Instagram) redirect to login for non-existent profiles.
    if (res.status === 200) {
      // Check for login redirect (common on Instagram)
      const finalUrl = res.url || profileUrl;
      if (finalUrl.includes("/login") || finalUrl.includes("/accounts/login")) {
        return NextResponse.json({ exists: false, status: "not_found" });
      }
      return NextResponse.json({ exists: true, status: "found" });
    }

    if (res.status === 404) {
      return NextResponse.json({ exists: false, status: "not_found" });
    }

    // Other status codes (301 redirect to login, 429 rate limit, etc.)
    // Treat as unknown rather than asserting not found
    return NextResponse.json({ exists: null, status: "unknown" });
  } catch {
    // Network error or timeout -- don't penalize the user
    return NextResponse.json({ exists: null, status: "error" });
  }
}
