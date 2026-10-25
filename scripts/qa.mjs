// QA from SPEC §5.5 that a script can check: contrast, SVG budgets, network isolation,
// banned words. Exits non-zero on any failure. Usage: node scripts/qa.mjs [dir ...]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/tokens.json'), 'utf8'));
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['assets'];
let failed = 0;
const fail = (msg) => { failed++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);

// ── contrast (WCAG 2.x) for every text/ground pair the designs use ──────────────
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const PAIRS = [
  ['ink', 'ground', 4.5, 'body and display text'],
  ['muted', 'ground', 4.5, 'utility labels'],
  ['accent', 'ground', 4.5, 'accent words'],
];
console.log('Contrast');
for (const [theme, t] of Object.entries(tokens.themes)) {
  for (const [fg, bg, min, use] of PAIRS) {
    const r = ratio(t[fg], t[bg]);
    (r >= min ? pass : fail)(`${theme.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)}:1 (min ${min}, ${use})`);
  }
}

// ── raster budgets (gallery tiles) ─────────────────────────────────────────────
const rasters = dirs.flatMap((d) => fs.readdirSync(path.join(ROOT, d), { recursive: true }).filter((f) => /\.(jpe?g|png|webp)$/.test(f)).map((f) => path.join(ROOT, d, f)));
console.log(`\nRaster size (${rasters.length} files)`);
for (const file of rasters) {
  const kb = fs.statSync(file).size / 1024;
  (kb <= 150 ? pass : fail)(`${path.relative(ROOT, file).replaceAll('\\', '/')}: ${kb.toFixed(1)} KB (limit 150)`);
}

// ── SVG budgets and external references ────────────────────────────────────────
const svgs = dirs.flatMap((d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.svg')).map((f) => path.join(ROOT, d, f)));
console.log(`\nSVG size and self-containment (${svgs.length} files)`);
for (const file of svgs) {
  const name = path.relative(ROOT, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf8');
  const kb = Buffer.byteLength(text) / 1024;
  const limit = /hero/.test(name) ? 400 : 150;
  (kb <= limit ? pass : fail)(`${name}: ${kb.toFixed(1)} KB (limit ${limit})`);
  if (/(href|src)\s*=\s*["'](?!#|data:image\/)|url\(\s*["']?(?!#)|@import|<script|<text[\s>]|font-family/i.test(text)) {
    fail(`${name}: external reference, script, or live text`);
  }
  // embedded images are base64, where "NaN" can occur by chance
  if (/NaN|Infinity|undefined/.test(text.replace(/data:image\/[^"']+/g, ''))) fail(`${name}: broken numbers in path or style data`);
}

// Load each SVG as its own document and record every request it makes.
const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of svgs) {
  const url = pathToFileURL(file).href;
  const extra = [];
  const onReq = (r) => { if (r.url() !== url) extra.push(r.url()); };
  page.on('request', onReq);
  await page.goto(url);
  await page.waitForTimeout(50);
  page.off('request', onReq);
  const name = path.relative(ROOT, file).replaceAll('\\', '/');
  (extra.length ? fail : pass)(`${name}: ${extra.length} extra network requests${extra.length ? ` (${extra.join(', ')})` : ''}`);
}
await browser.close();

// ── words that must never ship ─────────────────────────────────────────────────
// Names that must stay off the profile live in .private-terms (git-ignored, one regex per
// line): listing them here would publish them.
const PRIVATE = path.join(ROOT, '.private-terms');
const privateTerms = fs.existsSync(PRIVATE)
  ? fs.readFileSync(PRIVATE, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => new RegExp(l, 'i'))
  : [];
if (!privateTerms.length) console.log('\n  note  .private-terms not found: private-name check skipped');
const BANNED = [
  /passionate/i, /ninja/i, /rockstar/i, /guru/i, /wizard/i, /crafting digital/i, /\b10x\b/i, /\bsenior\b/i,
  ...privateTerms,
  /\+?\d[\d\s-]{8,}\d/, // phone-number shapes
];
const texts = ['README.md', 'src/copy.json'].map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f));
const descs = svgs.map((f) => [f, (fs.readFileSync(f, 'utf8').match(/<(title|desc)[^>]*>[^<]*/g) ?? []).join(' ')]);
console.log('\nBanned words, names and numbers');
for (const [file, text] of [...texts.map((f) => [f, fs.readFileSync(f, 'utf8')]), ...descs]) {
  // URLs are exempt: post IDs are long digit runs, and link targets are checked by hand
  const hits = BANNED.filter((re) => re.test(text.replace(/https?:\/\/\S+/g, ''))).map(String);
  const name = path.relative(ROOT, file).replaceAll('\\', '/');
  (hits.length ? fail : pass)(`${name}${hits.length ? `: ${hits.join(' ')}` : ''}`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
