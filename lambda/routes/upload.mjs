import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { REGION, MEDIA_BUCKET, json } from '../config.mjs';

const s3 = new S3Client({ region: REGION });

export async function handleUpload(event) {
  const body = JSON.parse(event.body || '{}');
  const { filename, contentType, prefix } = body;
  if (!filename || !contentType) return json(400, { error: 'filename and contentType required' });

  const key = `public/${prefix || 'uploads'}/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${MEDIA_BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return json(200, { uploadUrl, publicUrl, key });
}

export async function handleMedia(method, path, event) {
  if (method === 'GET') {
    const queryPrefix = event.queryStringParameters?.prefix || 'public/';
    const result = await s3.send(new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: queryPrefix }));
    const files = (result.Contents || []).map(obj => ({
      key: obj.Key, size: obj.Size, lastModified: obj.LastModified,
      url: `https://${MEDIA_BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key}`,
    }));
    return json(200, { files });
  }

  if (method === 'DELETE') {
    const body = JSON.parse(event.body || '{}');
    if (!body.key) return json(400, { error: 'key required' });
    await s3.send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: body.key }));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
}
