// Render one SVG (via <img>, like GitHub) or HTML file to PNG:
//   node scripts/render.mjs <in> <out.png> [width] [light|dark] [reduce]
// WAIT=<ms> controls how long to let animations run before the shot.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output, width = '1200', scheme = 'light', motion] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 300 },
  deviceScaleFactor: 2,
  colorScheme: scheme,
  reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference',
});
let url = pathToFileURL(path.resolve(input)).href;
let wrapper;
if (input.endsWith('.svg')) {
  wrapper = path.join(os.tmpdir(), `render-${process.pid}.html`);
  fs.writeFileSync(wrapper, `<!doctype html><body style="margin:0"><img src="${url}" style="display:block;width:100%"></body>`);
  url = pathToFileURL(wrapper).href;
}
await page.goto(url);
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
await page.waitForTimeout(Number(process.env.WAIT ?? 4000));
await page.screenshot({ path: output, fullPage: true });
await browser.close();
if (wrapper) fs.rmSync(wrapper);
