import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/cloud/encryption";
import { getProviderClient, type CloudProvider } from "@/lib/cloud/providers";
import { rateLimiter } from "@/lib/rate-limit";

function verifyState(stateB64: string): { partnerId: string; provider: CloudProvider; nonce: string } | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(stateB64, "base64url").toString());
    const secret = process.env.CLOUD_TOKEN_ENCRYPTION_KEY ?? "";
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = rateLimiter.check(`cloud-callback:${ip}`, 10, 60);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.linqme.io";
  const settingsUrl = `${appUrl}/dashboard/settings`;

  if (errorParam) {
    console.error("[cloud-callback] provider error:", errorParam);
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=missing_params`);
  }

  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=no_account`);
    }

    // Verify state + HMAC
    const state = verifyState(stateParam);
    if (!state || state.partnerId !== account.id) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=invalid_state`);
    }

    // Verify nonce
    const jar = await cookies();
    const nonceCookie = jar.get("cloud_oauth_nonce");
    if (!nonceCookie || nonceCookie.value !== state.nonce) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=nonce_mismatch`);
    }
    jar.delete("cloud_oauth_nonce");

    const redirectUri = `${appUrl}/api/integrations/callback`;
    const client = await getProviderClient(state.provider);
    const tokens = await client.exchangeCode(code, redirectUri);

    // Upsert integration
    const admin = createAdminClient();
    await admin.from("cloud_integrations").upsert(
      {
        partner_id: account.id,
        provider: state.provider,
        account_email: tokens.email,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        token_expires_at: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null,
        scopes: tokens.scopes,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "partner_id,provider" },
    );

    return NextResponse.redirect(`${settingsUrl}?tab=integrations&connected=${state.provider}`);
  } catch (err) {
    console.error("[cloud-callback] error:", err);
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=exchange_failed`);
  }
}
