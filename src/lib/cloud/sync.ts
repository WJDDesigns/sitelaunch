import { createAdminClient } from "@/lib/supabase/admin";
import type { FormSchema, FieldDef } from "@/lib/forms";
import { getValidAccessTokenByPartner } from "./token-refresh";
import { getProviderClient, type CloudProvider } from "./providers";

/**
 * After a submission is completed, sync uploaded files to any cloud storage
 * destinations configured on file fields. Fire-and-forget.
 */
export async function syncFilesToCloud(submissionId: string): Promise<void> {
  const admin = createAdminClient();

  // Load the submission + form schema
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, partner_id, partner_form_id,
       partner_forms ( id, form_templates ( schema ) )`,
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !sub) {
    console.error("[cloud-sync] submission not found:", submissionId);
    return;
  }

  const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  if (!tpl?.schema) return;

  const schema = tpl.schema as FormSchema;

  // Find all file/files fields with cloudDestination
  const cloudFields: FieldDef[] = [];
  for (const step of schema.steps) {
    for (const field of step.fields) {
      if ((field.type === "file" || field.type === "files") && field.cloudDestination) {
        cloudFields.push(field);
      }
    }
  }

  if (cloudFields.length === 0) return;

  // Load all uploaded files for this submission
  const { data: fileRows } = await admin
    .from("submission_files")
    .select("id, field_key, filename, mime_type, storage_path")
    .eq("submission_id", submissionId);

  if (!fileRows || fileRows.length === 0) return;

  // Group files by field key
  const filesByField: Record<string, typeof fileRows> = {};
  for (const f of fileRows) {
    (filesByField[f.field_key] ||= []).push(f);
  }

  // Sync each cloud-configured field
  for (const field of cloudFields) {
    const dest = field.cloudDestination!;
    const files = filesByField[field.id];
    if (!files || files.length === 0) continue;

    const provider = dest.provider as CloudProvider;

    try {
      // Get a valid token for this partner + provider
      const tokenResult = await getValidAccessTokenByPartner(sub.partner_id, provider);
      if (!tokenResult) {
        console.warn(`[cloud-sync] no ${provider} integration for partner ${sub.partner_id}`);
        await admin.from("cloud_sync_log").insert({
          submission_id: submissionId,
          integration_id: "00000000-0000-0000-0000-000000000000", // placeholder
          field_key: field.id,
          status: "failed",
          error_message: `${provider} is not connected`,
          file_count: files.length,
        });
        continue;
      }

      const client = await getProviderClient(provider);

      // Upload each file
      for (const file of files) {
        const { data: fileData, error: dlError } = await admin.storage
          .from("submissions")
          .download(file.storage_path);

        if (dlError || !fileData) {
          console.error(`[cloud-sync] failed to download ${file.storage_path}:`, dlError);
          continue;
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());
        await client.uploadFile(
          tokenResult.accessToken,
          dest.folderId,
          file.filename,
          buffer,
          file.mime_type ?? "application/octet-stream",
        );
      }

      // Log success
      const folderUrl = client.getFolderUrl(dest.folderId);
      await admin.from("cloud_sync_log").insert({
        submission_id: submissionId,
        integration_id: tokenResult.integrationId,
        field_key: field.id,
        cloud_folder_url: folderUrl,
        status: "synced",
        file_count: files.length,
        synced_at: new Date().toISOString(),
      });

      console.log(`[cloud-sync] synced ${files.length} files to ${provider} for submission ${submissionId}`);
    } catch (err) {
      console.error(`[cloud-sync] failed for field ${field.id}:`, err);
      // Log failure
      const tokenResult = await getValidAccessTokenByPartner(sub.partner_id, provider).catch(() => null);
      await admin.from("cloud_sync_log").insert({
        submission_id: submissionId,
        integration_id: tokenResult?.integrationId ?? "00000000-0000-0000-0000-000000000000",
        field_key: field.id,
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        file_count: files?.length ?? 0,
      });
    }
  }
}
