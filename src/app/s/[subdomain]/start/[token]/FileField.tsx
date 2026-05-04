"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FieldDef, UploadedFile } from "@/lib/forms";

/* ── Validation constants — must match files-actions.ts ───── */

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

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/* ── Types ────────────────────────────────────────────────── */

interface UploadProgress {
  current: number;
  total: number;
  currentFileName: string;
}

interface FailedUpload {
  file: File;
  message: string;
}

interface Props {
  field: FieldDef;
  initialFiles: UploadedFile[];
  upload: (fieldId: string, formData: FormData) => Promise<UploadedFile>;
  remove: (fileId: string) => Promise<void>;
  primaryColor: string;
}

/* ── Helpers ──────────────────────────────────────────────── */

function prettySize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return \`${bytes} B\`;
  if (bytes < 1024 * 1024) return \`${(bytes / 1024).toFixed(1)} KB\`;
  return \`${(bytes / (1024 * 1024)).toFixed(1)} MB\`;
}

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function validateFile(f: File): string | null {
  if (!f.size) return \`"${f.name}" is empty.\`;

  const isVideo = f.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
  const limitLabel = isVideo ? "100 MB" : "50 MB";
  if (f.size > limit) {
    return \`"${f.name}" is too large (${limitLabel} max for ${isVideo ? "videos" : "files"}).\`;
  }

  const ext = getExt(f.name);
  const typeOk = f.type ? ALLOWED_TYPES.has(f.type) : true;
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!extOk || (f.type && !typeOk)) {
    return \`"${f.name}" is not a supported file type.\`;
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Upload timed out. Please check your connection and try again.")),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/* ── Component ────────────────────────────────────────────── */

export default function FileField({ field, initialFiles, upload, remove, primaryColor }: Props) {
  const multiple = field.type === "files";
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending]);

  function safeSetError(msg: string | null) { if (mountedRef.current) setError(msg); }
  function safeSetFiles(updater: (prev: UploadedFile[]) => UploadedFile[]) { if (mountedRef.current) setFiles(updater); }
  function safeSetProgress(p: UploadProgress | null) { if (mountedRef.current) setProgress(p); }
  function safeSetFailed(updater: (prev: FailedUpload[]) => FailedUpload[]) { if (mountedRef.current) setFailed(updater); }

  async function uploadOne(f: File): Promise<UploadedFile> {
    const fd = new FormData();
    fd.append("file", f);
    return await withTimeout(upload(field.id, fd), UPLOAD_TIMEOUT_MS);
  }

  function startUpload(toUpload: File[]) {
    if (toUpload.length === 0) return;
    safeSetError(null);

    startTransition(async () => {
      const total = toUpload.length;
      const newFailed: FailedUpload[] = [];

      for (let i = 0; i < total; i++) {
        const f = toUpload[i];
        safeSetProgress({ current: i + 1, total, currentFileName: f.name });
        try {
          const uploaded = await uploadOne(f);
          safeSetFiles((prev) => (multiple ? [...prev, uploaded] : [uploaded]));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          newFailed.push({ file: f, message });
          if (!multiple) break;
        }
      }

      safeSetProgress(null);
      if (inputRef.current) inputRef.current.value = "";

      if (newFailed.length > 0) {
        safeSetFailed((prev) => [...prev, ...newFailed]);
        if (newFailed.length === 1) {
          safeSetError(newFailed[0].message);
        } else {
          safeSetError(\`${newFailed.length} of ${total} files failed to upload.\`);
        }
      }
    });
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    safeSetError(null);
    safeSetFailed(() => []);

    const valid: File[] = [];
    for (const f of selected) {
      const msg = validateFile(f);
      if (msg) {
        safeSetError(msg);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      valid.push(f);
    }

    startUpload(valid);
  }

  function handleRetry() {
    if (failed.length === 0) return;
    const toRetry = failed.map((x) => x.file);
    safeSetFailed(() => []);
    startUpload(toRetry);
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await remove(id);
        safeSetFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        safeSetError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  const canAddMore = multiple || files.length === 0;

  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}

      {files.length > 0 && (
        <ul className="space-y-2 mb-3">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-on-surface truncate">{f.filename}</div>
                <div className="text-xs text-on-surface-variant/60">{f.mime_type} &middot; {prettySize(f.size_bytes)}</div>
              </div>
              <button type="button" onClick={() => handleRemove(f.id)} disabled={pending} className="text-xs text-on-surface-variant/60 hover:text-error disabled:opacity-30 transition-colors">Remove</button>
            </li>
          ))}
        </ul>
      )}

      {canAddMore && (
        <div className="group relative">
          <div className="absolute -inset-4 nebula-glow rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <label className="relative flex flex-col items-center justify-center gap-3 px-4 py-10 rounded-2xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest/30 backdrop-blur cursor-pointer transition-all duration-300" style={pending ? { opacity: 0.6 } : undefined}>
            <input ref={inputRef} type="file" className="hidden" accept={field.accept} multiple={multiple} disabled={pending} onChange={handleSelect} />
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              {pending ? (
                <i className="fa-solid fa-spinner animate-spin text-3xl" style={{ color: primaryColor }} />
              ) : (
                <i className="fa-solid fa-cloud-arrow-up text-3xl" style={{ color: primaryColor }} />
              )}
            </div>
            {pending && progress ? (
              <>
                <p className="text-sm font-semibold text-on-surface font-headline">
                  Uploading {progress.total > 1 ? \`${progress.current} of ${progress.total}\` : progress.currentFileName}
                </p>
                <div className="w-full max-w-xs">
                  <div className="h-1.5 rounded-full bg-surface-container-highest/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: \`${(progress.current / progress.total) * 100}%\`, backgroundColor: primaryColor }} />
                  </div>
                  {progress.total > 1 && (
                    <p className="text-[10px] text-on-surface-variant/50 mt-1 text-center truncate">{progress.currentFileName}</p>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant/40 mt-1">Please don&apos;t close this tab.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-on-surface font-headline">Click or drag to upload</p>
                <p className="text-xs text-on-surface-variant/60">Max 50 MB per file · 100 MB for videos</p>
              </>
            )}
          </label>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 flex items-start gap-3">
          <i className="fa-solid fa-circle-exclamation text-error mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-error font-medium">{error}</p>
            {failed.length > 1 && (
              <ul className="mt-1.5 space-y-0.5">
                {failed.map((x, idx) => (
                  <li key={idx} className="text-xs text-error/80 truncate">
                    <span className="font-medium">{x.file.name}</span>: {x.message}
                  </li>
                ))}
              </ul>
            )}
            {failed.length > 0 && (
              <button type="button" onClick={handleRetry} disabled={pending} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-error hover:underline disabled:opacity-50">
                <i className="fa-solid fa-rotate-right text-[10px]" />
                Retry {failed.length > 1 ? \`${failed.length} files\` : "upload"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
