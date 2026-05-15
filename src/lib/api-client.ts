import { AWS_CONFIG } from './aws-config';
import { getAccessToken } from './auth';

const BASE = AWS_CONFIG.apiUrl;

async function request(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

export const api = {
  getContent: (pageId: string) => request(`/api/content/${pageId}`),
  putContent: (pageId: string, content: any) => request(`/api/content/${pageId}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  postContact: (data: { name: string; email: string; message: string }) => request('/api/contact', { method: 'POST', body: JSON.stringify(data) }),

  getMessages: () => request('/api/messages'),
  patchMessage: (id: string, status: string) => request(`/api/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteMessage: (id: string) => request(`/api/messages/${id}`, { method: 'DELETE' }),
  replyMessage: (id: string, message: string) => request(`/api/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),

  getPresignedUrl: (filename: string, contentType: string, prefix: string) =>
    request('/api/upload/presign', { method: 'POST', body: JSON.stringify({ filename, contentType, prefix }) }),
  listMedia: (prefix: string) => request(`/api/media?prefix=${encodeURIComponent(prefix)}`),
  deleteMedia: (key: string) => request('/api/media', { method: 'DELETE', body: JSON.stringify({ key }) }),

  getPosts: () => request('/api/posts'),
  getPost: (id: string) => request(`/api/posts/${id}`),
  createPost: (data: { title: string; body: string; excerpt: string; status: string }) =>
    request('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id: string, data: any) =>
    request(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id: string) => request(`/api/posts/${id}`, { method: 'DELETE' }),
};
