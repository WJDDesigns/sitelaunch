import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

/* ── R2 Client ─────────────────────────────────── */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "linqme-submissions";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/* ── Image Compression ─────────────────────────── */

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_DIMENSION = 2400; // Max width/height in pixels
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

/**
 * Compress an image buffer if it's a supported image type.
 * Resizes to max 2400px on longest side, converts to efficient format.
 * Returns { buffer, mimeType } with the processed result.
 * Non-image files pass through unchanged.
 */
export async function compressIfImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!IMAGE_TYPES.has(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    let pipeline = sharp(buffer, { animated: mimeType === "image/gif" });

    // Get metadata to check dimensions
    const meta = await pipeline.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;

    // Only resize if larger than max
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Rotate based on EXIF orientation (phones)
    pipeline = pipeline.rotate();

    // Convert to efficient format
    if (mimeType === "image/png") {
      // Keep PNG for transparency, but optimize
      const result = await pipeline.png({ quality: 85, compressionLevel: 9 }).toBuffer();
      return { buffer: result, mimeType: "image/png" };
    } else if (mimeType === "image/gif") {
      // Keep GIF as-is (animated)
      const result = await pipeline.toBuffer();
      return { buffer: result, mimeType: "image/gif" };
    } else {
      // JPEG and WebP -- convert to WebP for best compression
      const result = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer: result, mimeType: "image/webp" };
    }
  } catch {
    // If compression fails, return original
    return { buffer, mimeType };
  }
}

/* ── Upload / Delete / URL ─────────────────────── */

/**
 * Upload a file to R2. Compresses images automatically.
 * Returns the storage path (key).
 */
export async function uploadToR2(
  path: string,
  data: Buffer,
  contentType: string,
): Promise<{ path: string; mimeType: string; sizeBytes: number }> {
  // Compress images before upload
  const { buffer, mimeType } = await compressIfImage(data, contentType);

  // If we converted to webp, update the file extension in the path
  if (mimeType !== contentType && mimeType === "image/webp") {
    path = path.replace(/\.(jpe?g|png)$/i, ".webp");
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return { path, mimeType, sizeBytes: buffer.length };
}

/**
 * Delete a file from R2.
 */
export async function deleteFromR2(path: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
    }),
  );
}

/**
 * Generate a signed URL for private file access (1 hour expiry).
 */
export async function getSignedR2Url(path: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: path,
  });
  return getSignedUrl(r2, command, { expiresIn });
}
