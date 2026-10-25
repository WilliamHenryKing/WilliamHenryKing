// Text → SVG paths. Nothing in the generated SVGs depends on installed or web fonts.
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const FONT_DIR = path.resolve(import.meta.dirname, '../../node_modules/@fontsource');
const cache = new Map();

export function loadFont(rel) {
  if (!cache.has(rel)) {
    const buf = fs.readFileSync(path.join(FONT_DIR, rel));
    cache.set(rel, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
  }
  return cache.get(rel);
}

/** A font stack: the first font carries the metrics; later ones fill missing glyphs (e.g. Greek). */
export const fontStack = (...rels) => rels.filter(Boolean).map(loadFont);
const primary = (f) => (Array.isArray(f) ? f[0] : f);

export const capHeight = (font, size) => (primary(font).tables.os2.sCapHeight / primary(font).unitsPerEm) * size;
export const xHeight = (font, size) => (primary(font).tables.os2.sxHeight / primary(font).unitsPerEm) * size;

// Our own serialiser: opentype.js 2.0's toPathData emits NaN for coordinates a hair off
// an integer (its rounding builds strings like "1.1e-13e+1").
const r1 = (n) => Math.round(n * 10) / 10 || 0;
function pathData(p) {
  return p.commands.map((c) => {
    if (c.type === 'Z') return 'Z';
    if (c.type === 'Q') return `Q${r1(c.x1)} ${r1(c.y1)} ${r1(c.x)} ${r1(c.y)}`;
    if (c.type === 'C') return `C${r1(c.x1)} ${r1(c.y1)} ${r1(c.x2)} ${r1(c.y2)} ${r1(c.x)} ${r1(c.y)}`;
    return `${c.type}${r1(c.x)} ${r1(c.y)}`;
  }).join('');
}

// Glyphs the font subsets don't carry, drawn to match the mono label weight.
function arrowGlyph(font, size, x, y) {
  const adv = (font.charToGlyph('M').advanceWidth / font.unitsPerEm) * size;
  const t = size * 0.085;                       // stroke ≈ JetBrains Mono 500 stem
  const cy = y - capHeight(font, size) * 0.5;
  const x0 = x + adv * 0.1, x1 = x + adv * 0.9;
  const h = size * 0.26;                         // half-height of the arrow head
  const r = (n) => Math.round(n * 10) / 10;
  const shaft = `M${r(x0)} ${r(cy - t / 2)}H${r(x1 - t)}V${r(cy + t / 2)}H${r(x0)}Z`;
  const k = t * Math.SQRT2;                      // thickness measured along the diagonal
  const head = `M${r(x1 - h)} ${r(cy - h)}L${r(x1)} ${r(cy)}L${r(x1 - h)} ${r(cy + h)}` +
    `L${r(x1 - h - k * 0.5)} ${r(cy + h - k * 0.5)}L${r(x1 - k)} ${r(cy)}L${r(x1 - h - k * 0.5)} ${r(cy - h + k * 0.5)}Z`;
  return { d: shaft + head, adv };
}

const CUSTOM = { '→': arrowGlyph };

/**
 * Word wrap to a measure; returns the lines as strings. balance: keep the same number of
 * lines but narrow the measure until they even out, so no word is left on its own.
 */
export function wrap(font, text, { size, tracking = 0, width, balance = false }) {
  if (balance) {
    const n = wrap(font, text, { size, tracking, width }).length;
    let lo = width / 2, hi = width;
    while (hi - lo > 1) { const mid = (lo + hi) / 2; if (wrap(font, text, { size, tracking, width: mid }).length > n) lo = mid; else hi = mid; }
    return wrap(font, text, { size, tracking, width: hi });
  }
  const lines = [];
  for (const word of text.split(' ')) {
    const tryLine = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
    if (lines.length && setLine(font, tryLine, { size, tracking }).width <= width) lines[lines.length - 1] = tryLine;
    else lines.push(word);
  }
  return lines;
}

/**
 * Lay out a single line. Returns per-glyph paths (for staggered animation) plus metrics.
 * font may be a stack (see fontStack): each character uses the first font that has it.
 * tracking is in em. align: left | right | center. optical: trim side bearings so ink
 * (not the glyph box) sits on the grid line.
 */
export function setLine(fonts, str, { x = 0, y = 0, size, tracking = 0, align = 'left', optical = true } = {}) {
  const stack = [].concat(fonts);
  const font = stack[0];
  const pick = (ch) => stack.find((f) => f.charToGlyph(ch).index !== 0) ?? font;
  const chars = [...str];
  const items = [];
  let pen = 0;
  chars.forEach((ch, i) => {
    if (CUSTOM[ch]) {
      items.push({ i, ch, custom: CUSTOM[ch], x: pen });
      pen += CUSTOM[ch](font, size, 0, 0).adv + tracking * size;
      return;
    }
    const f = pick(ch);
    const scale = size / f.unitsPerEm;
    const g = f.charToGlyph(ch);
    items.push({ i, ch, g, scale, x: pen });
    let adv = g.advanceWidth * scale;
    const nc = chars[i + 1];
    if (nc && !CUSTOM[nc] && pick(nc) === f) adv += f.getKerningValue(g, f.charToGlyph(nc)) * scale;
    pen += adv + tracking * size;
  });
  const first = items[0], last = items[items.length - 1];
  const lsb = optical && first.g ? (first.g.leftSideBearing ?? first.g.getMetrics().xMin) * first.scale : 0;
  const lastAdvEnd = last.x + (last.g ? last.g.advanceWidth * last.scale : last.custom(font, size, 0, 0).adv);
  const rsb = optical && last.g ? (last.g.advanceWidth - last.g.getMetrics().xMax) * last.scale : 0;
  const inkWidth = lastAdvEnd - rsb - lsb;
  const x0 = (align === 'right' ? x - inkWidth : align === 'center' ? x - inkWidth / 2 : x) - lsb;

  const glyphs = items.map((it) => {
    const gx = x0 + it.x;
    if (it.custom) return { i: it.i, ch: it.ch, x: gx, d: it.custom(font, size, gx, y).d };
    const p = it.g.getPath(gx, y, size);
    const bb = p.getBoundingBox();
    return { i: it.i, ch: it.ch, x: gx, d: pathData(p), box: bb };
  }).filter((g) => g.d);
  return {
    glyphs,
    d: glyphs.map((g) => g.d).join(''),
    left: x0 + lsb,
    right: x0 + lsb + inkWidth,
    width: inkWidth,
    capHeight: capHeight(font, size),
  };
}
