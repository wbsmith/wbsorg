import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { REGION, TABLES, NOTIFY_EMAIL, json } from '../config.mjs';

const ses = new SESClient({ region: REGION });

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export async function handleMessages(method, path, event) {
  if (method === 'GET' && path === '/api/messages') {
    const result = await client.send(new ScanCommand({ TableName: TABLES.messages }));
    const items = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json(200, { messages: items });
  }

  const messageId = path.split('/')[3];
  if (!messageId) return json(400, { error: 'messageId required' });

  if (method === 'PATCH') {
    const body = JSON.parse(event.body || '{}');
    const item = await findMessage(messageId);
    if (!item) return json(404, { error: 'Message not found' });
    await client.send(new UpdateCommand({
      TableName: TABLES.messages,
      Key: { messageId, createdAt: item.createdAt },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': body.status || 'read' },
    }));
    return json(200, { ok: true });
  }

  if (method === 'POST' && path.endsWith('/reply')) {
    const body = JSON.parse(event.body || '{}');
    if (!body.message) return json(400, { error: 'message required' });
    const item = await findMessage(messageId);
    if (!item) return json(404, { error: 'Message not found' });

    await ses.send(new SendEmailCommand({
      Source: NOTIFY_EMAIL,
      Destination: { ToAddresses: [item.email] },
      ReplyToAddresses: [NOTIFY_EMAIL],
      Message: {
        Subject: { Data: `Re: ${item.name} — wbryansmith.org` },
        Body: {
          Text: { Data: body.message },
          Html: { Data: body.message.replace(/\n/g, '<br>') },
        },
      },
    }));

    const replies = item.replies || [];
    replies.push({ body: body.message, sentAt: new Date().toISOString() });
    await client.send(new UpdateCommand({
      TableName: TABLES.messages,
      Key: { messageId, createdAt: item.createdAt },
      UpdateExpression: 'SET #s = :status, replies = :replies',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'replied', ':replies': replies },
    }));

    return json(200, { ok: true });
  }

  if (method === 'DELETE') {
    const item = await findMessage(messageId);
    if (!item) return json(404, { error: 'Message not found' });
    await client.send(new DeleteCommand({
      TableName: TABLES.messages,
      Key: { messageId, createdAt: item.createdAt },
    }));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
}

async function findMessage(messageId) {
  const result = await client.send(new ScanCommand({
    TableName: TABLES.messages,
    FilterExpression: 'messageId = :id',
    ExpressionAttributeValues: { ':id': messageId },
  }));
  return result.Items?.[0];
}
