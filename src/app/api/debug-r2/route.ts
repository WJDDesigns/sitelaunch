import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || "linqme-submissions";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({
      error: "Missing R2 env vars",
      hasAccountId: !!accountId,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
    });
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  try {
    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
      maxAttempts: 1,
    });

    const testKey = `_debug/test-${Date.now()}.txt`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: Buffer.from("test upload"),
        ContentType: "text/plain",
      }),
    );

    return NextResponse.json({
      success: true,
      endpoint,
      bucket,
      key: testKey,
      message: "Upload succeeded! R2 is working.",
    });
  } catch (err: unknown) {
    const e = err as {
      message?: string;
      code?: string;
      name?: string;
      $metadata?: Record<string, unknown>;
      cause?: { message?: string; code?: string; name?: string };
      $fault?: string;
      $service?: string;
    };
    return NextResponse.json({
      success: false,
      endpoint,
      bucket,
      error: {
        message: e.message,
        code: e.code,
        name: e.name,
        fault: e.$fault,
        service: e.$service,
        httpStatus: e.$metadata?.httpStatusCode,
        requestId: e.$metadata?.requestId,
        metadata: e.$metadata,
        causeMessage: e.cause?.message,
        causeCode: e.cause?.code,
        causeName: e.cause?.name,
      },
    });
  }
}
