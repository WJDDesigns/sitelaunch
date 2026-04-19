import { NextResponse } from "next/server";
import { getSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getCurrentAccount(session.userId);
    const admin = createAdminClient();

    // --- User profile ---
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", session.userId)
      .single();

    // --- Partner / workspace info ---
    let workspace = null;
    if (account) {
      const { data: partner } = await admin
        .from("partners")
        .select("name, slug, plan_type, plan_tier, created_at")
        .eq("id", account.id)
        .maybeSingle();
      workspace = partner;
    }

    // --- Submissions ---
    let submissions: unknown[] = [];
    if (account) {
      const { data } = await admin
        .from("submissions")
        .select(
          "id, client_name, client_email, status, data, submitted_at, created_at"
        )
        .eq("partner_id", account.id)
        .order("created_at", { ascending: false })
        .limit(5000);
      submissions = data ?? [];
    }

    // --- Passkeys (safe fields only) ---
    const { data: passkeys } = await admin
      .from("passkeys")
      .select("device_name, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    // --- Billing invoices ---
    let invoices: unknown[] = [];
    if (account) {
      const { data } = await admin
        .from("invoices")
        .select(
          "id, status, amount_paid, currency, paid_at, period_start, period_end, created_at"
        )
        .eq("partner_id", account.id)
        .order("created_at", { ascending: false });
      invoices = data ?? [];
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profile
        ? {
            name: profile.full_name,
            email: profile.email,
            role: profile.role,
            created_at: profile.created_at,
          }
        : null,
      workspace: workspace
        ? {
            name: workspace.name,
            slug: workspace.slug,
            plan: workspace.plan_tier,
          }
        : null,
      submissions,
      passkeys: passkeys ?? [],
      invoices,
    };

    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="linqme-data-export-${dateStr}.json"`,
      },
    });
  } catch (e) {
    console.error("[account/export] Export failed:", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to generate data export. Please try again." },
      { status: 500 }
    );
  }
}
