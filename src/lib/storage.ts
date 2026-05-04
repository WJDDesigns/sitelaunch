import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

/* ── R2 Client ─────────────────────────────────── */

const R2_BUCKET = process.env.R2_BUCKET_NAME || "linqme-submissions";
if (!process.env.R2_BUCKET_NAME && process.env.NODE_ENV === "production") {
  console.warn(`[storage] R2_BUCKET_NAME not set — falling back to "${R2_BUCKET}"`);
}

/** Lazy-initialised R2 client — avoids crashing at import time when env vars are missing. */
let _r2: S3Client | null = null;

function getR2Client(): S3Client {
  if (_r2) return _r2;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "File uploads are not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY environment variables.",
    );
  }

  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Required for R2 — without this the SDK generates virtual-hosted-style
    // URLs (bucket.account.r2.cloudflarestorage.com) which R2 doesn't support.
    forcePathStyle: true,
    // Use the SDK's default fetch-based handler — NodeHttpHandler causes
    // EPROTO TLS errors on Vercel's serverless runtime.
    maxAttempts: 3,
  });
  return _r2;
}

/* ── Image Compression ─────────────────────────── */

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_DIMENSION = 2400;
const WEBP_QUALITY = 80;

export async function compressIfImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!IMAGE_TYPES.has(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    let pipeline = sharp(buffer, { animated: mimeType === "image/gif" });
    const meta = await pipeline.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;

    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    pipeline = pipeline.rotate();

    if (mimeType === "image/png") {
      const result = await pipeline.png({ quality: 85, compressionLevel: 9 }).toBuffer();
      return { buffer: result, mimeType: "image/png" };
    } else if (mimeType === "image/gif") {
      const result = await pipeline.toBuffer();
      return { buffer: result, mimeType: "image/gif" };
    } else {
      const result = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer: result, mimeType: "image/webp" };
    }
  } catch (err) {
    console.warn("[storage] image compression failed, uploading original", {
      mimeType,
      bytes: buffer.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return { buffer, mimeType };
  }
}

/* ── Retry helper ──────────────────────────────── */

const TRANSIENT_ERROR_CODES = new Set([
  "EPROTO", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH",
  "EHOSTUNREACH", "EAI_AGAIN", "EPIPE", "ECONNREFUSED",
  "TimeoutError", "RequestTimeout",
]);

const TRANSIENT_MESSAGE_FRAGMENTS = [
  "socket hang up", "fetch failed", "network socket disconnected",
  "premature close", "connection timeout", "request timeout",
];

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; name?: string; cause?: { code?: string; name?: string }; message?: string; $metadata?: { httpStatusCode?: number } };
  if (e.code && TRANSIENT_ERROR_CODES.has(e.code)) return true;
  if (e.name && TRANSIENT_ERROR_CODES.has(e.name)) return true;
  if (e.cause?.code && TRANSIENT_ERROR_CODES.has(e.cause.code)) return true;
  if (e.cause?.name && TRANSIENT_ERROR_CODES.has(e.cause.name)) return true;
  const status = e.$metadata?.httpStatusCode;
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  const msg = (e.message ?? "").toLowerCase();
  return TRANSIENT_MESSAGE_FRAGMENTS.some((frag) => msg.includes(frag));
}

async function withRetry<T>(op: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      const e = err as { message?: string; code?: string; name?: string; $metadata?: Record<string, unknown>; cause?: { message?: string; code?: string } };
      const detail = JSON.stringify({
        msg: e.message?.slice(0, 300),
        code: e.code,
        name: e.name,
        status: e.$metadata?.httpStatusCode,
        causeMsg: e.cause?.message?.slice(0, 200),
        causeCode: e.cause?.code,
      });
      if (i === attempts - 1 || !isTransientError(err)) {
        console.error(`[storage] ${label} FINAL FAILURE after ${i + 1} attempts: ${detail}`);
        break;
      }
      const base = Math.min(200 * Math.pow(3, i), 1500);
      const delay = base + Math.floor(Math.random() * 100);
      console.warn(`[storage] ${label} attempt ${i + 1} failed: ${detail}, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/* ── Upload / Delete / URL ─────────────────────── */

export async function uploadToR2(
  path: string,
  data: Buffer,
  contentType: string,
): Promise<{ path: string; mimeType: string; sizeBytes: number }> {
  const { buffer, mimeType } = await compressIfImage(data, contentType);

  if (mimeType !== contentType && mimeType === "image/webp") {
    path = path.replace(/\.(jpe?g|png)$/i, ".webp");
  }

  await withRetry(
    () =>
      getR2Client().send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: path,
          Body: buffer,
          ContentType: mimeType,
        }),
      ),
    `uploadToR2(${path})`,
  );

  return { path, mimeType, sizeBytes: buffer.length };
}

export async function deleteFromR2(path: string): Promise<boolean> {
  try {
    await withRetry(
      () =>
        getR2Client().send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: path,
          }),
        ),
      `deleteFromR2(${path})`,
    );
    return true;
  } catch (err) {
    console.error("[storage] deleteFromR2 failed", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function getSignedR2Url(path: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: path,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}
