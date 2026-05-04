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

    document.querySelectorAll<HTMLImageElement>('[data-media]').forEach(el => {
      const key = el.getAttribute('data-media')!;
      const value = data.content[key];
      if (value) {
        el.src = value;
        el.style.display = '';
      }
    });
  } catch {
    // static content remains as fallback
  }
}
