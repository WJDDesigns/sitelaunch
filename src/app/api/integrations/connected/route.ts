import { NextResponse } from "next/server";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await requireSession();
    const account = await getCurrentAccount(session.userId);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 403 });

    const admin = createAdminClient();
    const { data: integrations } = await admin
      .from("cloud_integrations")
      .select("id, provider, account_email, connected_at")
      .eq("partner_id", account.id);

    return NextResponse.json({ integrations: integrations ?? [] });
  } catch (err) {
    console.error("[cloud-connected] error:", err);
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 });
  }
}
