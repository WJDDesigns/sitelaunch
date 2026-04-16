import { NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_PROVIDERS, type CloudProvider } from "@/lib/cloud/providers";

export async function POST(
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

    const admin = createAdminClient();
    await admin
      .from("cloud_integrations")
      .delete()
      .eq("partner_id", account.id)
      .eq("provider", providerParam);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cloud-disconnect] error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
