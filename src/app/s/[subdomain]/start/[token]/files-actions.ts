"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UploadedFile } from "@/lib/forms";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

/** Allowed file types for submission uploads */
const ALLOWED_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  // SVG excluded: browsers execute embedded scripts when opened directly
  // Video/audio
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
]);

/** Also allow by extension for cases where MIME type is unreliable */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pptx", ".txt", ".csv",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".mp4", ".mov", ".mp3", ".wav",
  ".zip",
]);

function isAllowedFile(file: File): boolean {
  // Require both a valid MIME type AND a valid extension to prevent spoofing
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_TYPES.has(file.type) && ALLOWED_EXTENSIONS.has(ext);
}

async function loadSubmissionMeta(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("submissions")
    .select("id, status, partner_id")
    .eq("access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Submission not found");
  if (data.status !== "draft") throw new Error("Submission is locked");
  return data;
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_");
  return cleaned.slice(0, 180) || "file";
}

export async function uploadFileAction(
  token: string,
  fieldId: string,
  formData: FormData,
): Promise<UploadedFile> {
  const sub = await loadSubmissionMeta(token);
  const file = formData.get("file");
  if (!file || typeof file === "string" || !(file as File).size) {
    throw new Error("No file provided");
  }
  const f = file as File;
  if (f.size > MAX_BYTES) throw new Error("File is too large (50 MB max)");
  if (!isAllowedFile(f)) throw new Error("File type not allowed. Please upload a document, image, video, or archive.");

  const admin = createAdminClient();

  const safe = sanitizeFilename(f.name);
  const path = `${sub.partner_id}/${sub.id}/${fieldId}/${Date.now()}-${safe}`;
  const bytes = Buffer.from(await f.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("submissions")
    .upload(path, bytes, { contentType: f.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: row, error: insErr } = await admin
    .from("submission_files")
    .insert({
      submission_id: sub.id,
      field_key: fieldId,
      storage_path: path,
      filename: f.name,
      mime_type: f.type || null,
      size_bytes: f.size,
    })
    .select("id, storage_path, filename, mime_type, size_bytes")
    .single();
  if (insErr) throw new Error(insErr.message);

  return row as UploadedFile;
}

export async function deleteFileAction(token: string, fileId: string): Promise<void> {
  const sub = await loadSubmissionMeta(token);
  const admin = createAdminClient();

  const { data: row, error: selErr } = await admin
    .from("submission_files")
    .select("id, storage_path, submission_id")
    .eq("id", fileId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) return;
  if (row.submission_id !== sub.id) throw new Error("Not your file");

  await admin.storage.from("submissions").remove([row.storage_path]);
  await admin.from("submission_files").delete().eq("id", fileId);
}
