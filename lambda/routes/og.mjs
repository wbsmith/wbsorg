import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontBold = readFileSync(join(__dirname, '..', 'fonts', 'SpaceGrotesk-Bold.ttf'));
const fontRegular = readFileSync(join(__dirname, '..', 'fonts', 'SpaceGrotesk-Regular.ttf'));

let wasmInitialized = false;
async function ensureWasm() {
  if (wasmInitialized) return;
  const wasmPath = join(__dirname, '..', 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm');
  await initWasm(readFileSync(wasmPath));
  wasmInitialized = true;
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }));

const COLORS = {
  bg: '#06060b',
  text: '#e2e4ea',
  muted: '#8b8fa4',
  blue: '#2979ff',
  magenta: '#d946ef',
};

async function getContent(pageId) {
  try {
    const result = await client.send(new GetCommand({ TableName: 'wbs-content', Key: { pageId } }));
    return result.Item?.content || {};
  } catch { return {}; }
}

function homeOG(content) {
  const title = (content.heroTitle || 'Data, AI,\nand the science\nbetween.').split('\n');
  const lastLine = title.pop() || '';
  const sub = content.heroSub || '';

  return {
    type: 'div',
    props: {
      style: { width: '1200px', height: '630px', display: 'flex', alignItems: 'center', padding: '60px 80px', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: 'Space Grotesk' },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', flex: 1 },
            children: [
              { type: 'div', props: { style: { fontSize: '20px', color: COLORS.blue, letterSpacing: '0.05em', marginBottom: '16px', display: 'flex' }, children: 'W. Bryan Smith, PhD' } },
              ...title.map(line => ({ type: 'div', props: { style: { fontSize: '64px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', display: 'flex' }, children: line } })),
              { type: 'div', props: { style: { fontSize: '64px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', color: COLORS.magenta, display: 'flex' }, children: lastLine } },
              { type: 'div', props: { style: { fontSize: '22px', color: COLORS.muted, marginTop: '28px', lineHeight: 1.5, maxWidth: '520px', display: 'flex' }, children: sub } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { width: '260px', height: '310px', borderRadius: '12px', overflow: 'hidden', marginLeft: '60px', display: 'flex', flexShrink: 0 },
            children: [{ type: 'img', props: { src: 'https://www.wbryansmith.org/headshot_website.jpg', width: 260, height: 310, style: { objectFit: 'cover', objectPosition: 'left center' } } }],
          },
        },
      ],
    },
  };
}

function pageOG(title, subtitle, accent) {
  return {
    type: 'div',
    props: {
      style: { width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: 'Space Grotesk' },
      children: [
        { type: 'div', props: { style: { fontSize: '18px', color: accent || COLORS.blue, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px', display: 'flex' }, children: 'wbryansmith.org' } },
        { type: 'div', props: { style: { fontSize: '72px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '24px', display: 'flex' }, children: title } },
        { type: 'div', props: { style: { fontSize: '26px', color: COLORS.muted, lineHeight: 1.5, maxWidth: '700px', display: 'flex' }, children: subtitle } },
        { type: 'div', props: { style: { width: '60px', height: '4px', background: COLORS.blue, marginTop: '32px', borderRadius: '2px', display: 'flex' }, children: '' } },
      ],
    },
  };
}

const PAGE_CONFIG = {
  projects: { title: 'Projects', subtitle: 'Independent products built outside the day job.' },
  dataviz: { title: 'Data Viz', subtitle: 'Interactive visualizations, exploratory analyses, and walkthroughs.', accent: COLORS.magenta },
  photos: { title: 'Photos', subtitle: 'Landscapes, macro, and abstract photography.' },
  writing: { title: 'Writing', subtitle: 'Papers, patents, and posts.' },
};

export async function handleOG(method, path) {
  if (method !== 'GET') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: '{"error":"Method not allowed"}' };
  }

  await ensureWasm();

  const pageId = path.replace('/api/og/', '').replace(/\/$/, '') || 'home';

  let element;
  if (pageId === 'home') {
    const content = await getContent('home');
    element = homeOG(content);
  } else if (PAGE_CONFIG[pageId]) {
    const cfg = PAGE_CONFIG[pageId];
    element = pageOG(cfg.title, cfg.subtitle, cfg.accent);
  } else {
    element = pageOG('W. Bryan Smith', 'Data, AI, and the science between.');
  }

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Space Grotesk', data: fontBold, weight: 700, style: 'normal' },
      { name: 'Space Grotesk', data: fontRegular, weight: 400, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
    body: Buffer.from(png).toString('base64'),
    isBase64Encoded: true,
  };
}
