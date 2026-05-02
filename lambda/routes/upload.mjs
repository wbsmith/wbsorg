import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-west-1' });
const BUCKET = 'wbs-media-assets';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handleUpload(event) {
  const body = JSON.parse(event.body || '{}');
  const { filename, contentType, prefix } = body;

  if (!filename || !contentType) {
    return json(400, { error: 'filename and contentType required' });
  }

  const key = `public/${prefix || 'uploads'}/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${BUCKET}.s3.us-west-1.amazonaws.com/${key}`;

  return json(200, { uploadUrl, publicUrl, key });
}

export async function handleMedia(method, path, event) {
  if (method === 'GET') {
    const prefix = new URL(`https://x${path}`).searchParams?.get('prefix') || 'public/';
    const queryPrefix = event.queryStringParameters?.prefix || prefix;
    const result = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: queryPrefix }));
    const files = (result.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${BUCKET}.s3.us-west-1.amazonaws.com/${obj.Key}`,
    }));
    return json(200, { files });
  }

  if (method === 'DELETE') {
    const body = JSON.parse(event.body || '{}');
    if (!body.key) return json(400, { error: 'key required' });
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: body.key }));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
}
