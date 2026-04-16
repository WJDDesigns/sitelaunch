import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/error-tracking";
import { logRequest } from "@/lib/request-logger";
import { rateLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const log = logRequest(req);

  // Rate limit: 20 error reports per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimiter.check(`error:${ip}`, 20, 60);
  if (!rl.success) {
    log.finish(429);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { message, digest, stack, path } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    captureError(new Error(message), {
      digest,
      path,
      metadata: { source: "client", stack, userAgent: req.headers.get("user-agent") },
    });

    log.finish(200);
    return NextResponse.json({ ok: true });
  } catch {
    log.finish(500);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
