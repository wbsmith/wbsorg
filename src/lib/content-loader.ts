import { AWS_CONFIG } from './aws-config';

export async function loadContent(pageId: string) {
  try {
    const res = await fetch(`${AWS_CONFIG.apiUrl}/api/content/${pageId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.content) return;

    document.querySelectorAll<HTMLElement>('[data-content]').forEach(el => {
      const key = el.getAttribute('data-content')!;
      const value = data.content[key];
      if (value === undefined) return;

      const current = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const incoming = (Array.isArray(value) ? value.join(' ') : value.replace(/\n/g, ' ')).replace(/\s+/g, ' ').trim();
      if (current === incoming) return;

      if (Array.isArray(value)) {
        el.innerHTML = value.map((p: string) => `<p>${p}</p>`).join('');
      } else if (key === 'heroTitle') {
        const lines = value.split('\n');
        const last = lines.pop() || '';
        const rest = lines.map((l: string) => `${l}<br />`).join('');
        el.innerHTML = `${rest}<span class="hero__accent">${last}</span>`;
      } else {
        el.textContent = value;
      }
    });
  } catch {}
}
