import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  };

  // 1. Check env vars
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || "linqme-submissions";

  results.envVars = {
    R2_ACCOUNT_ID: accountId ? `${accountId.slice(0, 8)}...${accountId.slice(-4)} (len=${accountId.length})` : "MISSING",
    R2_ACCESS_KEY_ID: accessKeyId ? `${accessKeyId.slice(0, 8)}... (len=${accessKeyId.length})` : "MISSING",
    R2_SECRET_ACCESS_KEY: secretAccessKey ? `set (len=${secretAccessKey.length})` : "MISSING",
    R2_BUCKET_NAME: bucket,
  };

  // Quick sanity: account ID should be a 32-char hex, not a token
  if (accountId && (accountId.startsWith("cfat_") || accountId.length > 40)) {
    results.warning = "R2_ACCOUNT_ID looks like an API token, not an account ID! Should be a 32-char hex string.";
    return NextResponse.json(results, { status: 500 });
  }

  if (!accountId || !accessKeyId || !secretAccessKey) {
    results.error = "Missing required R2 env vars";
    return NextResponse.json(results, { status: 500 });
  }

  // 2. Test upload
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  results.endpoint = endpoint;

  try {
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
      maxAttempts: 1,
    });

    const testKey = `_debug/connectivity-test-${Date.now()}.txt`;
    const testBody = `R2 connectivity test at ${new Date().toISOString()}`;

    // Upload
    const putStart = Date.now();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: testBody,
        ContentType: "text/plain",
      }),
    );
    results.uploadMs = Date.now() - putStart;
    results.uploadOk = true;

    // Cleanup
    try {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: testKey }),
      );
      results.cleanupOk = true;
    } catch {
      results.cleanupOk = false;
    }

    // 3. Test sharp import
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).metadata().catch(() => null);
      results.sharpAvailable = true;
      results.sharpMeta = meta ? "ok" : "parse failed (expected for 8-byte stub)";
    } catch (err) {
      results.sharpAvailable = false;
      results.sharpError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({ status: "ok", ...results });
  } catch (err) {
    const e = err as {
      message?: string;
      code?: string;
      name?: string;
      $metadata?: Record<string, unknown>;
      cause?: { message?: string; code?: string };
    };
    results.error = {
      message: e.message,
      code: e.code,
      name: e.name,
      httpStatus: e.$metadata?.httpStatusCode,
      causeMessage: e.cause?.message,
      causeCode: e.cause?.code,
      fullMetadata: e.$metadata,
    };
    return NextResponse.json(results, { status: 500 });
  }
}
