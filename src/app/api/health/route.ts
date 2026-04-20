import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/health
 * Simple health check for uptime monitoring.
 * Returns 200 if the app is running and can reach Supabase.
 */
export async function GET() {
  const start = performance.now();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("partners").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", ms: Math.round(performance.now() - start) },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "healthy",
      ms: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", ms: Math.round(performance.now() - start) },
      { status: 503 },
    );
  }
}
