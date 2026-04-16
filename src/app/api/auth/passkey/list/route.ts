import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserPasskeys } from "@/lib/mfa/passkey";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET: List user's passkeys
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const passkeys = await getUserPasskeys(session.userId);
  return NextResponse.json({
    passkeys: passkeys.map(pk => ({
      id: pk.id,
      deviceName: pk.deviceName,
      createdAt: pk.createdAt,
    })),
  });
}

/**
 * DELETE: Remove a passkey
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const passkeyId = searchParams.get("id");

  if (!passkeyId) {
    return NextResponse.json({ error: "Missing passkey ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_passkeys")
    .delete()
    .eq("id", passkeyId)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
