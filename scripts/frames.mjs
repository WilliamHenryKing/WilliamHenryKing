// Prove the hero animates and ends cleanly: seek every animation to fixed times and
// screenshot, then a reduced-motion shot, a contact strip, and a short WebM per theme.
// Seeking a standalone SVG can hide bugs that only show when it plays inside an <img>
// (as on GitHub), so the WebM and an 'img-final' shot play in real time inside one.
// Usage: node scripts/frames.mjs [--video]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'preview/shots');
const TIMES = [0.4, 1.0, 1.6, 2.4, 3.2, 4.0, 4.6, 6.0];
const { width, height } = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/tokens.json'), 'utf8')).hero;
const VIEW = { width, height };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const svg = pathToFileURL(path.join(ROOT, `assets/hero-${theme}.svg`)).href;
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1.5, colorScheme: theme });
  await page.goto(svg);
  const shots = [];
  for (const t of TIMES) {
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t * 1000);
    const file = `hero-${theme}-t${t.toFixed(1)}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    shots.push({ t, file });
  }
  await page.close();

  const reduced = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1.5, colorScheme: theme, reducedMotion: 'reduce' });
  await reduced.goto(svg);
  await reduced.screenshot({ path: path.join(OUT, `hero-${theme}-reduced.png`) });
  await reduced.close();

  const strip = path.join(OUT, `strip-${theme}.html`);
  fs.writeFileSync(strip, `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#777;display:grid;grid-template-columns:1fr 1fr;gap:10px;font:600 13px system-ui;color:#fff}img{width:100%;display:block}</style>` +
    [...shots, { t: 'reduced motion', file: `hero-${theme}-reduced.png` }].map((s) => `<figure style="margin:0">${typeof s.t === 'number' ? `${s.t.toFixed(1)} s` : s.t}<img src="${s.file}"></figure>`).join(''));
  const sp = await browser.newPage({ viewport: { width: 1400, height: 400 } });
  await sp.goto(pathToFileURL(strip).href);
  await sp.screenshot({ path: path.join(OUT, `hero-${theme}-frames.png`), fullPage: true });
  await sp.close();
  fs.rmSync(strip);

  const wrapper = path.join(OUT, `img-${theme}.html`);
  fs.writeFileSync(wrapper, `<!doctype html><body style="margin:0"><img src="${svg}" style="display:block;width:100%">`);
  const ip = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1.5, colorScheme: theme });
  await ip.goto(pathToFileURL(wrapper).href);
  await ip.waitForTimeout(7000);
  await ip.screenshot({ path: path.join(OUT, `hero-${theme}-img-final.png`) });
  await ip.close();

  if (process.argv.includes('--video')) {
    const ctx = await browser.newContext({ viewport: VIEW, colorScheme: theme, recordVideo: { dir: OUT, size: VIEW } });
    const vp = await ctx.newPage();
    await vp.goto(pathToFileURL(wrapper).href);
    await vp.waitForTimeout(7000);
    const video = vp.video();
    await ctx.close();
    fs.renameSync(await video.path(), path.join(OUT, `hero-${theme}.webm`));
  }
  fs.rmSync(wrapper);
  console.log(`${theme}: ${shots.length} frames + reduced motion + real-time <img>`);
}
await browser.close();
