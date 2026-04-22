import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/cloud/encryption";
import { stripe } from "@/lib/stripe";
import { rateLimiter } from "@/lib/rate-limit";

/**
 * Stripe Connect OAuth callback -- exchanges code for connected account ID.
 */

function verifyState(stateB64: string): { partnerId: string; provider: string; nonce: string } | null {
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
  const { success } = rateLimiter.check(`stripe-connect-cb:${ip}`, 5, 60);
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
  const errorDesc = url.searchParams.get("error_description");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.linqme.io";
  const settingsUrl = `${appUrl}/dashboard/settings`;

  if (errorParam) {
    console.error("[stripe-connect-callback] error:", errorParam, errorDesc);
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=${encodeURIComponent(errorDesc ?? errorParam)}`);
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

    // Verify HMAC state
    const state = verifyState(stateParam);
    if (!state || state.partnerId !== account.id) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=invalid_state`);
    }

    // Verify nonce
    const jar = await cookies();
    const nonceCookie = jar.get("stripe_connect_nonce");
    if (!nonceCookie || nonceCookie.value !== state.nonce) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=nonce_mismatch`);
    }
    jar.delete("stripe_connect_nonce");

    // Exchange authorization code for connected account
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = response.stripe_user_id;
    if (!stripeAccountId) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=no_account_id`);
    }

    // Fetch the connected account details for display
    const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
    const accountEmail = connectedAccount.email ?? connectedAccount.business_profile?.name ?? stripeAccountId;

    // Upsert into payment_integrations
    const admin = createAdminClient();
    await admin.from("payment_integrations").upsert(
      {
        partner_id: account.id,
        provider: "stripe",
        // Store the connected account ID (encrypted for consistency)
        api_key_encrypted: encryptToken(stripeAccountId),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "partner_id,provider" },
    );

    return NextResponse.redirect(`${settingsUrl}?tab=integrations&connected=stripe`);
  } catch (err) {
    console.error("[stripe-connect-callback] error:", err);
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&error=connect_failed`);
  }
}
