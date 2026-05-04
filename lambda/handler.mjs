import { handleContent } from './routes/content.mjs';
import { handleContact } from './routes/contact.mjs';
import { handleMessages } from './routes/messages.mjs';
import { handleUpload, handleMedia } from './routes/upload.mjs';
import { handleOG } from './routes/og.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path;

  try {
    if (path.startsWith('/api/content')) return await handleContent(method, path, event);
    if (path === '/api/contact' && method === 'POST') return await handleContact(event);
    if (path.startsWith('/api/messages')) return await handleMessages(method, path, event);
    if (path === '/api/upload/presign') return await handleUpload(event);
    if (path.startsWith('/api/media')) return await handleMedia(method, path, event);
    if (path.startsWith('/api/og')) return await handleOG(method, path);
    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    return json(500, { error: 'Internal server error' });
  }
}
