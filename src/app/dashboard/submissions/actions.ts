"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionStatus = "draft" | "submitted" | "in_review" | "complete" | "archived";

/**
 * Verify the current user owns the given submission(s).
 * Superadmins can access all submissions.
 */
async function authorizeSubmissions(submissionIds: string[]): Promise<void> {
  const session = await requireSession();
  if (session.role === "superadmin") return;

  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account found.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submissions")
    .select("id, partner_id")
    .in("id", submissionIds);

  if (error) throw new Error(error.message);
  if (!data || data.length !== submissionIds.length) {
    throw new Error("One or more submissions not found.");
  }

  for (const sub of data) {
    if (sub.partner_id !== account.id) {
      throw new Error("Not authorized to modify this submission.");
    }
  }
}

export async function updateSubmissionStatusAction(submissionId: string, status: SubmissionStatus) {
  await authorizeSubmissions([submissionId]);
  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ status })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

export async function deleteSubmissionAction(submissionId: string) {
  await authorizeSubmissions([submissionId]);
  const admin = createAdminClient();

  // Delete files from storage first
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path")
    .eq("submission_id", submissionId);

  if (files && files.length > 0) {
    await admin.storage
      .from("submissions")
      .remove(files.map((f) => f.storage_path));
  }

  const { error } = await admin
    .from("submissions")
    .delete()
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
}

export async function bulkDeleteSubmissionsAction(submissionIds: string[]) {
  if (submissionIds.length === 0) return;
  await authorizeSubmissions(submissionIds);

  const admin = createAdminClient();

  // Delete files from storage
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path")
    .in("submission_id", submissionIds);

  if (files && files.length > 0) {
    await admin.storage
      .from("submissions")
      .remove(files.map((f) => f.storage_path));
  }

  const { error } = await admin
    .from("submissions")
    .delete()
    .in("id", submissionIds);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
}

export async function bulkUpdateStatusAction(submissionIds: string[], status: SubmissionStatus) {
  if (submissionIds.length === 0) return;
  await authorizeSubmissions(submissionIds);

  const admin = createAdminClient();
  const { error } = await admin
    .from("submissions")
    .update({ status })
    .in("id", submissionIds);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/submissions");
}

export async function getSubmissionsCsvData() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const admin = createAdminClient();

  let query = admin
    .from("submissions")
    .select(
      `id, status, client_name, client_email, submitted_at, created_at, data,
       partners ( name, slug ),
       partner_forms ( id, form_templates ( schema ) )`
    )
    .order("created_at", { ascending: false });

  // Scope to account if not superadmin
  if (account && session.role !== "superadmin") {
    query = query.eq("partner_id", account.id);
  }

  const { data: submissions, error } = await query;
  if (error) throw new Error(error.message);
  return submissions ?? [];
}
