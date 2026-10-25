// Gallery tiles: each piece's own screenshot, cropped to one ratio, above an index-card
// band (number, title, kind) in the hero's ground and type. Rendered in Chromium to JPEG,
// one per theme, so the README needs no fonts.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const FONTS = path.resolve(import.meta.dirname, '../node_modules/@fontsource');
const MEDIA = path.resolve(import.meta.dirname, 'media/works');
const dataUri = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function page(tokens, work, theme) {
  const T = tokens.tiles;
  const t = tokens.themes[theme];
  const mono = dataUri(path.join(FONTS, tokens.fonts.mono['600']), 'font/woff');
  const img = path.join(MEDIA, work.src);
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: M; src: url(${mono}); }
    * { margin: 0; }
    body { width: ${T.width}px; height: ${T.height}px; display: flex; flex-direction: column; background: ${t.ground}; }
    img { width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: center top; display: block; }
    .band { height: ${T.band}px; display: flex; align-items: center; gap: 18px; padding: 0 4px; font: ${T.labelSize}px/1 M; letter-spacing: ${T.tracking}em; color: ${t.ink}; white-space: nowrap; }
    .n, .kind { color: ${t.muted}; }
    .kind { margin-left: auto; }
  </style>
  <img src="${dataUri(img, IMAGE_TYPES[path.extname(img)])}">
  <div class="band"><span class="n">${work.n}</span><span>${work.title}</span><span class="kind">${work.kind}</span></div>`;
}

/** Render every tile to assets/work/<slug>-<theme>.jpg; returns [{ rel, kb }]. */
export async function tiles({ tokens, copy, root }) {
  const T = tokens.tiles;
  const outDir = path.join(root, 'assets/work');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: T.width, height: T.height } });
  const built = [];
  for (const work of copy.works) {
    for (const theme of ['light', 'dark']) {
      await tab.setContent(page(tokens, work, theme));
      await tab.evaluate(() => document.fonts.ready);
      const rel = `assets/work/${work.slug}-${theme}.jpg`;
      await tab.screenshot({ path: path.join(root, rel), type: 'jpeg', quality: T.quality });
      built.push({ rel, kb: fs.statSync(path.join(root, rel)).size / 1024 });
    }
  }
  await browser.close();
  return built;
}
