// npm run build → assets/*.svg (every word set as outlined paths, optimised with SVGO)
// and assets/work/*.jpg (gallery tiles, rendered in Chromium).
import fs from 'node:fs';
import path from 'node:path';
import { optimize } from 'svgo';
import { hero } from './hero.mjs';
import { card } from './card.mjs';
import { button } from './button.mjs';
import { tiles } from './tiles.mjs';
import { toolbox } from './toolbox.mjs';
import { robot } from './robot.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const tokens = read('src/tokens.json');
const copy = read('src/copy.json');
const THEMES = ['light', 'dark'];

const SVGO = {
  multipass: true,
  floatPrecision: 1,
  plugins: [{
    name: 'preset-default',
    params: {
      overrides: {
        cleanupIds: { minify: true },
        mergePaths: false,         // per-element paths carry their own animation timing
        inlineStyles: false,       // keep the animation rules in one <style> block
        removeHiddenElems: false,  // some elements rest hidden and only show mid-animation
      },
    },
  }],
};

function write(rel, svg) {
  const out = optimize(svg, SVGO).data;
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  return { rel, kb: Buffer.byteLength(out) / 1024 };
}

const built = THEMES.flatMap((theme) => [
  write(`assets/hero-${theme}.svg`, hero({ theme, tokens, copy })),
  write(`assets/quote-${theme}.svg`, card({ theme, tokens, spec: tokens.quote, copy: copy.quote })),
  write(`assets/workshop-${theme}.svg`, card({ theme, tokens, spec: tokens.workshop, copy: copy.workshop })),
  write(`assets/vision-${theme}.svg`, card({ theme, tokens, spec: tokens.vision, copy: copy.vision })),
  write(`assets/toolbox-${theme}.svg`, toolbox({ theme, tokens, data: copy.toolbox })),
  write(`assets/toolbox-${theme}-narrow.svg`, toolbox({ theme, tokens, data: copy.toolbox, narrow: true })),
  write(`assets/robot-${theme}.svg`, robot({ theme, tokens, copy })),
  write(`assets/robot-${theme}-narrow.svg`, robot({ theme, tokens, copy, narrow: true })),
  write(`assets/robot-stack-${theme}.svg`, toolbox({ theme, tokens, data: copy.robotStack })),
  write(`assets/robot-stack-${theme}-narrow.svg`, toolbox({ theme, tokens, data: copy.robotStack, narrow: true })),
  ...Object.entries(copy.buttons).map(([key, label]) => write(`assets/btn-${key}-${theme}.svg`, button({ theme, tokens, label }))),
]);
built.push(...(await tiles({ tokens, copy, root: ROOT })));

// The gallery block in README.md is generated from copy.works, between two markers.
// Centred, so the gutter left by three 32% tiles splits evenly on both sides.
const tile = (w) => `<a href="${w.url}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/work/${w.slug}-dark.jpg">` +
  `<img src="assets/work/${w.slug}-light.jpg" width="32%" alt="${w.alt}"></picture></a>`;
const readme = path.join(ROOT, 'README.md');
const md = fs.readFileSync(readme, 'utf8');
const block = ['<!-- works:start -->', '<p align="center">', ...copy.works.map(tile), '</p>', '<!-- works:end -->'].join('\n');
fs.writeFileSync(readme, md.replace(/<!-- works:start -->[\s\S]*?<!-- works:end -->/, block));
for (const b of built) console.log(`${b.kb.toFixed(1).padStart(6)} KB  ${b.rel}`);
