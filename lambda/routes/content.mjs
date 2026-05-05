import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { REGION, TABLES, json } from '../config.mjs';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export async function handleContent(method, path, event) {
  const pageId = path.replace('/api/content/', '').replace(/\/$/, '');
  if (!pageId || pageId === '/api/content') return json(400, { error: 'pageId required' });

  if (method === 'GET') {
    const result = await client.send(new GetCommand({ TableName: TABLES.content, Key: { pageId } }));
    if (!result.Item) return json(404, { error: 'Page not found' });
    return json(200, result.Item);
  }

  if (method === 'PUT') {
    const body = JSON.parse(event.body);
    const item = { pageId, content: body.content, updatedAt: new Date().toISOString() };
    await client.send(new PutCommand({ TableName: TABLES.content, Item: item }));
    return json(200, item);
  }

  return json(405, { error: 'Method not allowed' });
}
