import { handleContent } from './routes/content.mjs';
import { handleContact } from './routes/contact.mjs';
import { handleMessages } from './routes/messages.mjs';
import { handleUpload, handleMedia } from './routes/upload.mjs';
import { handlePosts } from './routes/posts.mjs';
import { CORS_HEADERS, json } from './config.mjs';

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
    if (path.startsWith('/api/posts')) return await handlePosts(method, path, event);
    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    return json(500, { error: 'Internal server error' });
  }
}
