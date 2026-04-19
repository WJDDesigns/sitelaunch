import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/error-tracking";
import { logRequest } from "@/lib/request-logger";

/* ── Simple in-memory rate limiter ────────────────────────────── */
const hits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 100; // max requests per IP per window
let lastPrune = Date.now();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune stale entries on-demand every 5 minutes (serverless-safe, no setInterval)
  if (now - lastPrune > 300_000) {
    lastPrune = now;
    for (const [k, entry] of hits) {
      if (now > entry.resetAt) hits.delete(k);
    }
  }

  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

/**
 * POST /api/analytics
 * Lightweight endpoint for recording page views and form events.
 * Called from the storefront via sendBeacon or fetch.
 *
 * Body: { type: "pageview" | "form_event", partner_id, ... }
 */
export async function POST(req: NextRequest) {
  const log = logRequest(req);
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      log.finish(429);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const admin = createAdminClient();

    // Validate partner_id exists
    const partnerId = body.partner_id;
    if (!partnerId || typeof partnerId !== "string") {
      return NextResponse.json({ error: "Missing partner_id" }, { status: 400 });
    }

    const { data: partner } = await admin
      .from("partners")
      .select("id")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner) {
      return NextResponse.json({ error: "Invalid partner_id" }, { status: 400 });
    }

    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;

    if (body.type === "pageview") {
      const { path, referrer, is_unique } = body;
      if (!path) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }

      await admin.from("page_views").insert({
        partner_id: partnerId,
        path,
        referrer: referrer || null,
        user_agent: req.headers.get("user-agent") || null,
        country,
        is_unique: is_unique ?? true,
      });
    } else if (body.type === "form_event") {
      const { form_slug, event_type, submission_id, step_index, metadata } = body;
      if (!form_slug || !event_type) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }

      await admin.from("form_events").insert({
        partner_id: partnerId,
        form_slug,
        event_type,
        submission_id: submission_id || null,
        step_index: step_index ?? null,
        metadata: metadata ?? {},
      });
    } else {
      log.finish(400);
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    log.finish(200);
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { path: "/api/analytics", metadata: { source: "analytics-api" } });
    log.finish(500);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
