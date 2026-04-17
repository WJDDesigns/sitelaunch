import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AccountDetail from "./AccountDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const admin = createAdminClient();

  // Fetch the client account
  const { data: clientAccount, error } = await admin
    .from("client_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !clientAccount) notFound();

  // Verify ownership (unless superadmin)
  if (session.role !== "superadmin" && account && clientAccount.partner_id !== account.id) {
    notFound();
  }

  // Fetch notes with author info
  const { data: notes } = await admin
    .from("account_notes")
    .select("id, content, created_at, created_by, profiles:created_by ( full_name, email )")
    .eq("client_account_id", id)
    .order("created_at", { ascending: false });

  const noteRows = (notes ?? []).map((n) => {
    const profile = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles;
    return {
      id: n.id,
      content: n.content,
      created_at: n.created_at,
      created_by: n.created_by,
      author_name: (profile as { full_name?: string; email?: string } | null)?.full_name ?? (profile as { full_name?: string; email?: string } | null)?.email ?? "Unknown",
    };
  });

  // Fetch submissions by this account's email
  const { data: submissions } = await admin
    .from("submissions")
    .select(
      `id, status, client_name, client_email, data, submitted_at, created_at, form_slug,
       partner_forms ( id, name )`,
    )
    .ilike("client_email", clientAccount.email)
    .eq("partner_id", clientAccount.partner_id)
    .order("created_at", { ascending: false });

  const entryRows = (submissions ?? []).map((s) => {
    const pf = Array.isArray(s.partner_forms) ? s.partner_forms[0] : s.partner_forms;
    return {
      id: s.id,
      status: s.status,
      form_name: pf?.name ?? s.form_slug ?? "—",
      submitted_at: s.submitted_at,
      created_at: s.created_at,
      data_keys: Object.keys((s.data as Record<string, unknown>) ?? {}),
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
      <div className="max-w-3xl space-y-6">
        <header>
          <Link
            href="/dashboard/accounts"
            className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Accounts
          </Link>
          <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface mt-2">
            {clientAccount.name || clientAccount.email}
          </h1>
        </header>

        <AccountDetail
          account={clientAccount}
          notes={noteRows}
          entries={entryRows}
          currentUserId={session.userId}
        />
      </div>
    </div>
  );
}
