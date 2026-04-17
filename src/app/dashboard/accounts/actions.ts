"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  Authorization helpers                                              */
/* ------------------------------------------------------------------ */

async function getAuthedPartnerId(): Promise<string> {
  const session = await requireSession();
  if (session.role === "superadmin") {
    // superadmins act through getCurrentAccount which resolves impersonation
    const account = await getCurrentAccount(session.userId);
    if (!account) throw new Error("No account context.");
    return account.id;
  }
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found.");
  return account.id;
}

async function authorizeAccount(accountId: string): Promise<string> {
  const partnerId = await getAuthedPartnerId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_accounts")
    .select("id, partner_id")
    .eq("id", accountId)
    .maybeSingle();
  if (error || !data) throw new Error("Account not found.");

  const session = await requireSession();
  if (session.role !== "superadmin" && data.partner_id !== partnerId) {
    throw new Error("Not authorized.");
  }
  return data.partner_id;
}

/* ------------------------------------------------------------------ */
/*  Account CRUD                                                       */
/* ------------------------------------------------------------------ */

export async function createAccountAction(fields: {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  tags?: string[];
}) {
  const partnerId = await getAuthedPartnerId();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("client_accounts")
    .insert({
      partner_id: partnerId,
      email: fields.email.trim().toLowerCase(),
      name: fields.name?.trim() || null,
      phone: fields.phone?.trim() || null,
      company: fields.company?.trim() || null,
      tags: fields.tags ?? [],
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "An account with this email already exists." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/accounts");
  return { ok: true, id: data.id };
}

export async function updateAccountAction(
  accountId: string,
  fields: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: string;
    tags?: string[];
  },
) {
  await authorizeAccount(accountId);
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};
  if (fields.name !== undefined) update.name = fields.name.trim() || null;
  if (fields.email !== undefined) update.email = fields.email.trim().toLowerCase();
  if (fields.phone !== undefined) update.phone = fields.phone.trim() || null;
  if (fields.company !== undefined) update.company = fields.company.trim() || null;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.tags !== undefined) update.tags = fields.tags;

  const { error } = await admin
    .from("client_accounts")
    .update(update)
    .eq("id", accountId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/accounts");
  revalidatePath(`/dashboard/accounts/${accountId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Notes                                                              */
/* ------------------------------------------------------------------ */

export async function addNoteAction(accountId: string, content: string) {
  const partnerId = await getAuthedPartnerId();
  await authorizeAccount(accountId);
  const session = await requireSession();
  const admin = createAdminClient();

  const { error } = await admin.from("account_notes").insert({
    client_account_id: accountId,
    partner_id: partnerId,
    content: content.trim(),
    created_by: session.userId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/accounts/${accountId}`);
  return { ok: true };
}

export async function deleteNoteAction(noteId: string) {
  const session = await requireSession();
  const admin = createAdminClient();

  // Verify ownership
  const { data: note } = await admin
    .from("account_notes")
    .select("id, created_by, partner_id")
    .eq("id", noteId)
    .maybeSingle();

  if (!note) return { ok: false, error: "Note not found." };
  if (session.role !== "superadmin" && note.created_by !== session.userId) {
    return { ok: false, error: "Not authorized." };
  }

  const { error } = await admin.from("account_notes").delete().eq("id", noteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/accounts");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Export entries CSV                                                  */
/* ------------------------------------------------------------------ */

export async function exportAccountEntriesAction(
  accountId: string,
  submissionIds?: string[],
) {
  await authorizeAccount(accountId);
  const admin = createAdminClient();

  // Get the account email
  const { data: acct } = await admin
    .from("client_accounts")
    .select("email")
    .eq("id", accountId)
    .single();
  if (!acct) return { ok: false, error: "Account not found." };

  let query = admin
    .from("submissions")
    .select("id, status, client_name, client_email, data, submitted_at, created_at, partner_forms ( name )")
    .ilike("client_email", acct.email);

  if (submissionIds && submissionIds.length > 0) {
    query = query.in("id", submissionIds);
  }

  const { data: subs, error } = await query.order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };

  // Build CSV
  const allKeys = new Set<string>();
  for (const s of subs ?? []) {
    const d = (s.data ?? {}) as Record<string, unknown>;
    Object.keys(d).forEach((k) => allKeys.add(k));
  }

  const sortedKeys = Array.from(allKeys).sort();
  const headers = ["ID", "Status", "Form", "Submitted At", ...sortedKeys];

  const rows = (subs ?? []).map((s) => {
    const d = (s.data ?? {}) as Record<string, unknown>;
    const pf = Array.isArray(s.partner_forms) ? s.partner_forms[0] : s.partner_forms;
    return [
      s.id,
      s.status,
      pf?.name ?? "",
      s.submitted_at ?? s.created_at,
      ...sortedKeys.map((k) => {
        const v = d[k];
        if (v == null) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      }),
    ];
  });

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");

  return { ok: true, csv, filename: `${acct.email.replace(/[^a-zA-Z0-9]/g, "_")}_entries.csv` };
}
