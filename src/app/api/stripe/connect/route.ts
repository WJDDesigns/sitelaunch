import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import { requireSession, getCurrentAccount } from "@/lib/auth";

/**
 * Stripe Connect OAuth -- initiates the authorization flow.
 * Redirects the user to Stripe's hosted Connect onboarding page.
 */

function signState(payload: string): string {
  const secret = process.env.CLOUD_TOKEN_ENCRYPTION_KEY ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET() {
  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Stripe Connect is not configured" }, { status: 500 });
    }

    // Build CSRF-protected state
    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({ partnerId: account.id, provider: "stripe", nonce });
    const signature = signState(statePayload);
    const state = Buffer.from(JSON.stringify({ payload: statePayload, sig: signature })).toString("base64url");

    // Store nonce in httpOnly cookie
    const jar = await cookies();
    jar.set("stripe_connect_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.linqme.io";
    const redirectUri = `${appUrl}/api/stripe/connect-callback`;

    // Build Stripe Connect OAuth URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state,
      "stripe_user[email]": session.email ?? "",
    });

    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
    return NextResponse.redirect(stripeAuthUrl);
  } catch (err) {
    console.error("[stripe-connect] error:", err);
    return NextResponse.json({ error: "Failed to initiate Stripe Connect" }, { status: 500 });
  }
}
