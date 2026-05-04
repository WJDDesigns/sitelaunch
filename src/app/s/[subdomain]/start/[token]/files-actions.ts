"use server";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToR2, deleteFromR2 } from "@/lib/storage";
import type { FieldDef, FormSchema, UploadedFile } from "@/lib/forms";

// maxDuration moved to page.tsx — "use server" files can only export async functions

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/zip",
  "application/x-zip-compressed",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pptx", ".txt", ".csv",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".mp4", ".mov", ".mp3", ".wav",
  ".zip",
]);

function isAllowedFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_TYPES.has(file.type) && ALLOWED_EXTENSIONS.has(ext);
}

async function loadSubmissionAndField(token: string, fieldId: string) {
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(
      `id, status, partner_id,
       partner_forms ( id, template_id,
         form_templates ( id, schema )
       )`,
    )
    .eq("access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sub) throw new Error("Submission not found");
  if (sub.status !== "draft") throw new Error("Submission is locked");

  const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
  const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
  const schema = tpl?.schema as FormSchema | undefined;

  let field: FieldDef | undefined;
  if (schema?.steps) {
    for (const step of schema.steps) {
      const f = step.fields?.find((ff) => ff.id === fieldId);
      if (f) {
        field = f;
        break;
      }
    }
  }
  if (!field) throw new Error("Unknown field");
  if (field.type !== "file" && field.type !== "files") {
    throw new Error("Field is not a file field");
  }

  return { sub: { id: sub.id, status: sub.status, partner_id: sub.partner_id }, field };
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

function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  const transientFragments = [
    "eproto", "econnreset", "etimedout", "enetunreach",
    "ehostunreach", "eai_again", "epipe", "econnrefused",
    "socket hang up", "fetch failed", "network socket disconnected",
    "premature close", "connection timeout", "request timeout",
  ];
  if (transientFragments.some((f) => lower.includes(f))) {
    return "Upload failed due to a network issue. Please try again.";
  }

  if (lower.includes("access denied") || lower.includes("forbidden") || lower.includes("nosuchbucket")) {
    return "Upload failed. Please try again or contact support if it keeps happening.";
  }

  if (msg.length < 200 && !lower.includes("\n")) return msg;

  return "Upload failed. Please try again.";
}

export async function uploadFileAction(
  token: string,
  fieldId: string,
  formData: FormData,
): Promise<UploadedFile> {
  const { sub, field } = await loadSubmissionAndField(token, fieldId);
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new Error("No file provided");
  }
  const f = file as File;
  if (!f.size || f.size === 0) {
    throw new Error("File is empty.");
  }
  const isVideo = f.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  const limitLabel = isVideo ? "100 MB" : "50 MB";
  if (f.size > limit) throw new Error(`File is too large (${limitLabel} max for ${isVideo ? "videos" : "files"}).`);
  if (!isAllowedFile(f)) throw new Error("File type not allowed. Please upload a document, image, video, or archive.");

  const admin = createAdminClient();

  const safe = sanitizeFilename(f.name);
  const collisionSuffix = randomBytes(4).toString("hex");
  const basePath = `${sub.partner_id}/${sub.id}/${fieldId}/${Date.now()}-${collisionSuffix}-${safe}`;
  const rawBytes = Buffer.from(await f.arrayBuffer());

  let path: string;
  let mimeType: string;
  let sizeBytes: number;
  try {
    const result = await uploadToR2(
      basePath,
      rawBytes,
      f.type || "application/octet-stream",
    );
    path = result.path;
    mimeType = result.mimeType;
    sizeBytes = result.sizeBytes;
  } catch (err) {
    console.error("[uploadFileAction] storage upload failed", {
      submissionId: sub.id,
      fieldId,
      filename: f.name,
      size: f.size,
      type: f.type,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error(friendlyUploadError(err));
  }

  const { data: row, error: insErr } = await admin
    .from("submission_files")
    .insert({
      submission_id: sub.id,
      field_key: fieldId,
      storage_path: path,
      filename: f.name,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select("id, storage_path, filename, mime_type, size_bytes")
    .single();

  if (insErr) {
    console.error("[uploadFileAction] DB insert failed after storage upload", {
      submissionId: sub.id,
      path,
      error: insErr.message,
    });
    const cleaned = await deleteFromR2(path);
    if (!cleaned) {
      console.error("[uploadFileAction] failed to clean up orphan R2 object", { path });
    }
    throw new Error("Upload succeeded but recording it failed. Please try again.");
  }

  if (field.type === "file") {
    const { data: stale } = await admin
      .from("submission_files")
      .select("id, storage_path")
      .eq("submission_id", sub.id)
      .eq("field_key", fieldId)
      .neq("id", row.id);

    if (stale && stale.length > 0) {
      await Promise.allSettled(stale.map((s) => deleteFromR2(s.storage_path)));
      await admin
        .from("submission_files")
        .delete()
        .in("id", stale.map((s) => s.id));
    }
  }

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

  const { error: delErr } = await admin.from("submission_files").delete().eq("id", fileId);
  if (delErr) throw new Error(delErr.message);

  await deleteFromR2(row.storage_path);
}
