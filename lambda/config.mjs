export const REGION = process.env.AWS_REGION || 'us-west-1';
export const TABLES = {
  content: process.env.CONTENT_TABLE || 'wbs-content',
  messages: process.env.MESSAGES_TABLE || 'wbs-messages',
  posts: process.env.POSTS_TABLE || 'wbs-posts',
};
export const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'wbs-media-assets';
export const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '"W. Bryan Smith" <hello@wbryansmith.org>';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}
