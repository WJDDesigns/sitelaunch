import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRegistrationOptions, verifyAndStoreRegistration } from "@/lib/mfa/passkey";

/**
 * GET: Generate registration options for a new passkey
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const options = await getRegistrationOptions(session.userId, session.email);
    return NextResponse.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate options";
    console.error("[passkey/register GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Verify and store a new passkey registration
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { credential, challenge, deviceName } = body;

    if (!credential || !challenge) {
      return NextResponse.json(
        { error: "Missing credential or challenge in request body" },
        { status: 400 },
      );
    }

    const requestOrigin = request.headers.get("origin") ?? undefined;

    const verification = await verifyAndStoreRegistration(
      session.userId,
      credential,
      challenge,
      deviceName,
      requestOrigin,
    );

    return NextResponse.json({ verified: verification.verified });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    console.error("[passkey/register POST]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
