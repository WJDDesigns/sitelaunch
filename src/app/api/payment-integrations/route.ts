import { NextRequest, NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/cloud/encryption";
import { rateLimiter } from "@/lib/rate-limit";

const VALID_PROVIDERS = ["stripe", "paypal", "square"] as const;
type PaymentProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is PaymentProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`payment-int:${ip}`, 20, 60);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const body = (await request.json()) as { provider?: string; apiKey?: string };
    const { provider, apiKey } = body;

    if (!provider || !isValidProvider(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("payment_integrations").upsert(
      {
        partner_id: account.id,
        provider,
        api_key_encrypted: encryptToken(apiKey.trim()),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "partner_id,provider" },
    );

    if (error) {
      console.error("[payment-integrations] upsert error:", error);
      return NextResponse.json({ error: "Failed to save integration" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payment-integrations] POST error:", err);
    return NextResponse.json({ error: "Failed to save payment integration" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`payment-int:${ip}`, 20, 60);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const body = (await request.json()) as { provider?: string };
    const { provider } = body;

    if (!provider || !isValidProvider(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("payment_integrations")
      .delete()
      .eq("partner_id", account.id)
      .eq("provider", provider);

    if (error) {
      console.error("[payment-integrations] delete error:", error);
      return NextResponse.json({ error: "Failed to remove integration" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payment-integrations] DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove payment integration" }, { status: 500 });
  }
}
