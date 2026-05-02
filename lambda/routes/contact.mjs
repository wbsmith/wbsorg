import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'node:crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }));
const ses = new SESClient({ region: 'us-west-1' });
const TABLE = 'wbs-messages';
const NOTIFY_EMAIL = 'hello@wbryansmith.org';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handleContact(event) {
  const body = JSON.parse(event.body || '{}');
  const { name, email, message } = body;

  if (!name || !email || !message) {
    return json(400, { error: 'name, email, and message are required' });
  }

  const item = {
    messageId: randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    email,
    message,
    status: 'unread',
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));

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
    console.warn('SES notification failed (may not be configured yet):', err.message);
  }

  return json(200, { ok: true });
}
