import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { getProviderClient, ALL_PROVIDERS, type CloudProvider } from "@/lib/cloud/providers";

function signState(payload: string): string {
  const secret = process.env.CLOUD_TOKEN_ENCRYPTION_KEY ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerParam } = await params;
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    if (!ALL_PROVIDERS.includes(providerParam as CloudProvider)) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    const provider = providerParam as CloudProvider;

    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({ partnerId: account.id, provider, nonce });
    const signature = signState(statePayload);
    const state = Buffer.from(JSON.stringify({ payload: statePayload, sig: signature })).toString("base64url");

    // Store nonce in cookie for CSRF protection
    const jar = await cookies();
    jar.set("cloud_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mysitelaunch.com";
    const redirectUri = `${appUrl}/api/integrations/callback`;

    const client = await getProviderClient(provider);
    const authUrl = client.getAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[cloud-connect] error:", err);
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 500 });
  }
}
