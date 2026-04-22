import { NextRequest, NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/cloud/encryption";
import { rateLimiter } from "@/lib/rate-limit";

const VALID_PROVIDERS = ["google", "openstreetmap"] as const;
type GeoProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is GeoProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`geo-int:${ip}`, 20, 60);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const body = (await request.json()) as { provider?: string; apiKey?: string | null };
    const { provider, apiKey } = body;

    if (!provider || !isValidProvider(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Google requires an API key; OpenStreetMap does not
    if (provider === "google" && (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0)) {
      return NextResponse.json({ error: "API key is required for Google Places" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("geocoding_integrations").upsert(
      {
        partner_id: account.id,
        provider,
        api_key_encrypted: apiKey ? encryptToken(apiKey.trim()) : null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "partner_id,provider" },
    );

    if (error) {
      console.error("[geocoding-integrations] upsert error:", error);
      return NextResponse.json({ error: "Failed to save integration" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[geocoding-integrations] POST error:", err);
    return NextResponse.json({ error: "Failed to save geocoding integration" }, { status: 500 });
  }
}

/**
 * PATCH -- update workspace default geocoding provider
 */
export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`geo-int:${ip}`, 20, 60);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const body = (await request.json()) as { defaultProvider?: string };
    const { defaultProvider } = body;

    if (!defaultProvider || !isValidProvider(defaultProvider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const admin = createAdminClient();
    // Fetch current settings, merge in the default provider
    const { data: partner } = await admin.from("partners").select("settings").eq("id", account.id).single();
    const currentSettings = (partner?.settings as Record<string, unknown>) ?? {};
    const { error } = await admin
      .from("partners")
      .update({ settings: { ...currentSettings, default_geocoding_provider: defaultProvider } })
      .eq("id", account.id);

    if (error) {
      console.error("[geocoding-integrations] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update default provider" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[geocoding-integrations] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update default provider" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`geo-int:${ip}`, 20, 60);
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
      .from("geocoding_integrations")
      .delete()
      .eq("partner_id", account.id)
      .eq("provider", provider);

    if (error) {
      console.error("[geocoding-integrations] delete error:", error);
      return NextResponse.json({ error: "Failed to remove integration" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[geocoding-integrations] DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove geocoding integration" }, { status: 500 });
  }
}
