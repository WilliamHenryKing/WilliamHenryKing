// Screenshot the README preview at GitHub's column widths, in both themes, after the
// hero animation has finished: node scripts/shots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { serve } from './serve.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'preview/shots');
const WIDTHS = [360, 830, 1012];
const PORT = 4174;
fs.mkdirSync(OUT, { recursive: true });

const server = await serve(PORT);
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch();
  for (const theme of ['light', 'dark']) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: width + 80, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
      await page.goto(`http://localhost:${PORT}/preview/?theme=${theme}&width=${width}`);
      await page.waitForSelector('body[data-ready="true"]');
      await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
      await page.waitForTimeout(6500); // let the hero finish typing
      const file = `readme-${width}-${theme}${engine === 'webkit' ? '-webkit' : ''}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      await page.close();
      console.log(`${engine.padEnd(8)} ${file}`);
    }
  }
  await browser.close();
}
server.close();
