import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }));
const TABLE = 'wbs-posts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handlePosts(method, path, event) {
  const parts = path.split('/').filter(Boolean);
  const postId = parts[2];

  if (method === 'GET' && !postId) {
    const result = await client.send(new ScanCommand({ TableName: TABLE }));
    const posts = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json(200, { posts });
  }

  if (method === 'GET' && postId) {
    const result = await client.send(new GetCommand({ TableName: TABLE, Key: { postId } }));
    if (!result.Item) return json(404, { error: 'Post not found' });
    return json(200, result.Item);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const post = {
      postId: randomUUID(),
      title: body.title || 'Untitled',
      slug: slugify(body.title || 'untitled'),
      body: body.body || '',
      excerpt: body.excerpt || '',
      status: body.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await client.send(new PutCommand({ TableName: TABLE, Item: post }));
    return json(201, post);
  }

  if (method === 'PUT' && postId) {
    const body = JSON.parse(event.body || '{}');
    const existing = await client.send(new GetCommand({ TableName: TABLE, Key: { postId } }));
    if (!existing.Item) return json(404, { error: 'Post not found' });
    const post = {
      ...existing.Item,
      title: body.title ?? existing.Item.title,
      slug: body.title ? slugify(body.title) : existing.Item.slug,
      body: body.body ?? existing.Item.body,
      excerpt: body.excerpt ?? existing.Item.excerpt,
      status: body.status ?? existing.Item.status,
      updatedAt: new Date().toISOString(),
    };
    await client.send(new PutCommand({ TableName: TABLE, Item: post }));
    return json(200, post);
  }

  if (method === 'DELETE' && postId) {
    await client.send(new DeleteCommand({ TableName: TABLE, Key: { postId } }));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
