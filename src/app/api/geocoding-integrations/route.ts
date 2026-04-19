import { NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/cloud/encryption";

const VALID_PROVIDERS = ["google", "openstreetmap"] as const;
type GeoProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is GeoProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

export async function POST(request: Request) {
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

export async function DELETE(request: Request) {
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
