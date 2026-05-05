import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_URL = 'https://h0bt7p533f.execute-api.us-west-1.amazonaws.com';

async function findPostBySlug(slug) {
  const res = await fetch(`${API_URL}/api/posts`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.posts || []).find(p => p.slug === slug && p.status === 'published') || null;
}

function renderPost(post) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${(post.excerpt || '').replace(/"/g, '&quot;')}" />
  <meta property="og:title" content="${post.title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${(post.excerpt || '').replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="https://www.wbryansmith.org/new_og_preview.png" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <title>${post.title} — W. Bryan Smith</title>
  <style>
    :root {
      --bg-deep: #06060b; --bg-surface: #0c0c14; --border-subtle: #1e1e30;
      --text-primary: #e2e4ea; --text-secondary: #8b8fa4; --text-muted: #5c5f73;
      --cyan: #2979ff; --font-display: 'Space Grotesk', system-ui, sans-serif;
      --font-body: system-ui, -apple-system, sans-serif;
      --font-mono: ui-monospace, 'Cascadia Code', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body); color: var(--text-primary); background: var(--bg-deep);
      -webkit-font-smoothing: antialiased; line-height: 1.7; }
    a { color: var(--cyan); text-decoration: none; }
    a:hover { color: var(--text-primary); }
    .nav { position: sticky; top: 0; z-index: 100; background: rgba(6,6,11,0.85);
      backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle); }
    .nav-inner { max-width: 72rem; margin: 0 auto; padding: 0 2rem; display: flex;
      align-items: center; justify-content: space-between; height: 3.5rem; }
    .nav-logo { font-family: var(--font-display); font-size: 1.25rem; font-weight: 700;
      color: var(--text-primary); letter-spacing: -0.02em; }
    .nav-links { display: flex; gap: 1.5rem; list-style: none; }
    .nav-links a { font-family: var(--font-display); font-size: 0.875rem; font-weight: 500;
      color: var(--text-secondary); }
    .nav-links a:hover { color: var(--text-primary); }
    .post { max-width: 52rem; margin: 0 auto; padding: 4rem 2rem; }
    .post-meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1rem; }
    .post h1 { font-family: var(--font-display); font-size: 2.5rem; font-weight: 700;
      line-height: 1.2; margin-bottom: 2rem; }
    .post-body { font-size: 1.125rem; line-height: 1.8; color: var(--text-secondary); }
    .post-body p { margin-bottom: 1.5rem; }
    .post-body h2 { font-family: var(--font-display); font-size: 1.5rem; color: var(--text-primary);
      margin: 2.5rem 0 1rem; }
    .post-body h3 { font-family: var(--font-display); font-size: 1.25rem; color: var(--text-primary);
      margin: 2rem 0 0.75rem; }
    .post-body img { max-width: 100%; border-radius: 8px; margin: 1.5rem 0; }
    .post-body blockquote { border-left: 3px solid var(--cyan); padding-left: 1.5rem;
      margin: 1.5rem 0; color: var(--text-secondary); font-style: italic; }
    .post-body pre { background: var(--bg-surface); padding: 1.5rem; border-radius: 8px;
      overflow-x: auto; margin: 1.5rem 0; }
    .post-body code { font-family: var(--font-mono); font-size: 0.9em; }
    .post-body a { color: var(--cyan); }
    .post-back { display: inline-block; font-family: var(--font-mono); font-size: 0.875rem;
      color: var(--text-muted); margin-bottom: 2rem; }
    .post-back:hover { color: var(--cyan); }
    .footer { border-top: 1px solid var(--border-subtle); padding: 2rem;
      text-align: center; font-size: 0.875rem; color: var(--text-muted); }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .post h1 { font-size: 1.75rem; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="nav-logo">wbs</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/projects">Projects</a></li>
        <li><a href="/dataviz">Data Viz</a></li>
        <li><a href="/photos">Photos</a></li>
        <li><a href="/writing">Writing</a></li>
        <li><a href="/#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
  <article class="post">
    <a href="/writing" class="post-back">&larr; Back to writing</a>
    <div class="post-meta">${date}</div>
    <h1>${post.title}</h1>
    <div class="post-body">${post.body}</div>
  </article>
  <footer class="footer">W. Bryan Smith, PhD &middot; &copy; ${new Date().getFullYear()}</footer>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      renderMathInElement(document.querySelector('.post-body'), {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;
}

function render404() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Not Found — W. Bryan Smith</title>
<style>body{font-family:system-ui;background:#06060b;color:#e2e4ea;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.c{text-align:center}.c h1{font-size:4rem;margin-bottom:1rem}.c a{color:#2979ff}</style>
</head><body><div class="c"><h1>404</h1><p>Post not found.</p><p><a href="/writing">Back to writing</a></p></div></body></html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    const match = path.match(/^\/writing\/([a-z0-9-]+)\/?$/);

    if (match) {
      const slug = match[1];
      const post = await findPostBySlug(slug);
      if (post) {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=300' });
        res.end(renderPost(post));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(render404());
      }
      return;
    }

    // Find static files - check multiple possible locations
    const candidates = [
      join(__dirname, '..', 'static'),
      '/var/static',
      '/var/task/static',
      '/var/task/.amplify-hosting/static',
      join(__dirname, 'pages'),
    ];
    let staticBase = candidates.find(d => existsSync(d) && statSync(d).isDirectory()) || candidates[0];
    const tryPaths = [
      join(staticBase, path, 'index.html'),
      join(staticBase, path + '.html'),
      join(staticBase, path),
    ];

    for (const filePath of tryPaths) {
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = filePath.split('.').pop();
        const types = {
          html: 'text/html', css: 'text/css', js: 'application/javascript',
          svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon',
          jpg: 'image/jpeg', jpeg: 'image/jpeg', json: 'application/json',
        };
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(content);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(render404());
  } catch (err) {
    console.error('Request error:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>500</h1><p>Internal server error</p>');
  }
});

server.listen(PORT, () => {
  console.log(`Compute server listening on port ${PORT}`);
});
