import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'node:crypto';
import { REGION, TABLES, NOTIFY_EMAIL, json } from '../config.mjs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const ses = new SESClient({ region: REGION });

export async function handleContact(event) {
  const body = JSON.parse(event.body || '{}');
  const { name, email, message } = body;
  if (!name || !email || !message) return json(400, { error: 'name, email, and message are required' });

  const item = {
    messageId: randomUUID(),
    createdAt: new Date().toISOString(),
    name, email, message,
    status: 'unread',
  };

  await dynamo.send(new PutCommand({ TableName: TABLES.messages, Item: item }));

  try {
    await ses.send(new SendEmailCommand({
      Source: NOTIFY_EMAIL,
      Destination: { ToAddresses: [NOTIFY_EMAIL] },
      Message: {
        Subject: { Data: `Contact form: ${name}` },
        Body: { Text: { Data: `From: ${name} (${email})\n\n${message}` } },
      },
    }));
  } catch (err) {
    console.warn('SES notification failed:', err.message);
  }

  return json(200, { ok: true });
}
