import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const bucket = process.env.RAASTA_DOCUMENTS_BUCKET;
  const { fileName, contentType, size } = await request.json();
  const isPdf = String(fileName).toLowerCase().endsWith('.pdf') && (!contentType || contentType === 'application/pdf');
  if (!isPdf) {
    return NextResponse.json({ error: 'Only PDF notices can be uploaded.' }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'PDF must be smaller than 10 MB.' }, { status: 400 });
  }

  const userId = request.headers.get('x-user-id') || 'usr_demo_antigravity_01';
  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `private/${userId}/${crypto.randomUUID()}-${safeName}`;

  // Keep the complete demo flow usable without AWS credentials. The analysis
  // adapter returns deterministic scholarship extraction for this key in mock mode.
  if (!bucket && process.env.MOCK_AI !== 'false') {
    return NextResponse.json({ uploadUrl: null, key, mode: 'mock', expiresInSeconds: 0 });
  }
  if (!bucket) return NextResponse.json({ error: 'S3 upload is not configured.' }, { status: 503 });
  const client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
      Metadata: { userId },
    }),
    { expiresIn: 300 }
  );

  return NextResponse.json({ uploadUrl, key, expiresInSeconds: 300 });
}
