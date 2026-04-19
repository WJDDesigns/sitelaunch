import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AccountsList from "./AccountsList";

export default async function AccountsPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const admin = createAdminClient();

  // Build query for client_accounts belonging to this partner
  let query = admin
    .from("client_accounts")
    .select("id, email, name, phone, company, status, tags, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (session.role !== "superadmin" && account) {
    query = query.eq("partner_id", account.id);
  }

  const { data: accounts } = await query.limit(500);

  // Get submission counts per email using a targeted query (only matching emails)
  const emails = (accounts ?? []).map((a) => a.email).filter(Boolean);
  let submissionCounts: Record<string, number> = {};

  if (emails.length > 0) {
    let subQuery = admin
      .from("submissions")
      .select("client_email")
      .in("client_email", emails);

    if (session.role !== "superadmin" && account) {
      subQuery = subQuery.eq("partner_id", account.id);
    }

    const { data: subs } = await subQuery;
    if (subs) {
      for (const s of subs) {
        const e = (s.client_email ?? "").toLowerCase();
        if (e) submissionCounts[e] = (submissionCounts[e] ?? 0) + 1;
      }
    }
  }

  const rows = (accounts ?? []).map((a) => ({
    ...a,
    submission_count: submissionCounts[a.email?.toLowerCase()] ?? 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Accounts</h1>
        <p className="text-on-surface-variant mt-1">
          Manage your customer accounts, notes, and submissions.
        </p>
      </header>

      <AccountsList accounts={rows} />
    </div>
  );
}
