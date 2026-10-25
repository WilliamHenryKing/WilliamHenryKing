// A chip grid (the toolbox, and the robot's build stack): every tool as a chip — its brand icon (Simple Icons, CC0) in its brand
// colour on a soft tint of that colour, or a monogram badge where no icon exists.
// A slow wave of colour drifts across the grid. Nothing ever starts hidden: the toolbox
// sits below the fold, so an entrance would play unseen, and a renderer that restarts
// it would show an empty box.
import * as simpleIcons from 'simple-icons';
import { loadFont, fontStack, setLine, capHeight } from './lib/type.mjs';

const f = (n) => Math.round(n * 10) / 10;
const s = (sec) => `${Math.round(sec * 100) / 100}s`;
const ICONS = new Map(Object.values(simpleIcons).filter((i) => i?.slug).map((i) => [i.slug, i]));

// ── colour: brand colours are nudged towards the ink until they read on the ground ──
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, k) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * k));
function readable(hex, t, min = 3) {
  for (let k = 0; k <= 1; k += 0.05) { const c = mix(hex, t.ink, k); if (contrast(c, t.ground) >= min) return c; }
  return t.ink;
}

/** data: { labelLeft, labelRight, groups }. narrow: the phone layout — group names stacked above larger chips. */
export function toolbox({ theme, tokens, data, narrow = false }) {
  const t = tokens.themes[theme];
  const K = narrow ? { ...tokens.toolbox, ...tokens.toolbox.narrow } : tokens.toolbox;
  const C = data;
  const fam = tokens.fonts.display[tokens.fonts.defaultDisplay];
  const semi = fontStack(fam['600'], fam.greek?.['600']);
  const mono = loadFont(tokens.fonts.mono['500']);
  const monoBold = fontStack(tokens.fonts.mono['600'], tokens.fonts.mono.greek?.['600']);
  const W = K.width, M = K.margin ?? tokens.hero.margin;
  const x0 = narrow ? M : M + K.groupCol, x1 = W - M;

  const ruleY = 62;
  const left = setLine(monoBold, C.labelLeft, { x: M, y: 42, size: K.labelSize, tracking: K.labelTracking });
  const right = setLine(mono, C.labelRight, { x: W - M, y: 42, size: K.labelSize, tracking: K.labelTracking, align: 'right' });

  const textBase = K.chipH / 2 + capHeight(semi, K.chipText) / 2;
  const chips = [];
  const groupLabels = [];
  let y = ruleY + 30;
  for (const group of C.groups) {
    if (narrow) {
      groupLabels.push(setLine(mono, group.name, { x: M, y: y + capHeight(mono, K.groupSize), size: K.groupSize, tracking: K.labelTracking }).d);
      y += capHeight(mono, K.groupSize) + K.labelGap;
    } else {
      groupLabels.push(setLine(mono, group.name, { x: M, y: y + textBase, size: K.groupSize, tracking: K.labelTracking }).d);
    }
    let x = x0;
    for (const tool of group.tools) {
      const label = setLine(semi, tool.label, { size: K.chipText, tracking: -0.005 });
      const w = K.padL + K.icon + K.iconGap + label.width + K.padR;
      if (x + w > x1) { x = x0; y += K.chipH + K.rowGap; }
      const icon = tool.icon && ICONS.get(tool.icon);
      if (tool.icon && !icon) throw new Error(`No Simple Icons entry for "${tool.icon}"`);
      const colour = readable(icon ? `#${icon.hex}` : tool.color, t);
      chips.push({ tool, x, y, w, label, icon, colour });
      x += w + K.chipGap;
    }
    y += K.chipH + K.groupGap;
  }
  const H = Math.round(y - K.groupGap + 40);

  const chip = ({ tool, x, y: cy, w, icon, colour }) => {
    const ix = x + K.padL, iy = cy + (K.chipH - K.icon) / 2;
    const glyph = icon
      ? `<path transform="translate(${f(ix)} ${f(iy)}) scale(${f((K.icon / 24) * 1000) / 1000})" d="${icon.path}" fill="${colour}"/>`
      : monogram(tool.mono, ix, iy, colour);
    const text = setLine(semi, tool.label, { x: ix + K.icon + K.iconGap, y: cy + textBase, size: K.chipText, tracking: -0.005 });
    // the colour wave travels left to right: each chip's phase follows its position
    const phase = -((x - x0) / (x1 - x0)) * K.wave;
    return `<g>` +
      `<rect class="tint" style="--w:${s(phase)}" x="${f(x)}" y="${f(cy)}" width="${f(w)}" height="${K.chipH}" rx="${K.chipH / 2}" fill="${colour}" fill-opacity="${K.tint}"/>` +
      `<rect x="${f(x + 0.5)}" y="${f(cy + 0.5)}" width="${f(w - 1)}" height="${K.chipH - 1}" rx="${K.chipH / 2 - 0.5}" fill="none" stroke="${colour}" stroke-opacity=".28"/>` +
      glyph + `<path d="${text.d}" fill="${t.ink}"/></g>`;
  };

  function monogram(letters, x, y, colour) {
    const ink = contrast('#ffffff', colour) >= 3 ? '#ffffff' : tokens.themes.light.ink;
    const size = Math.min(10, (K.icon - 5) / (letters.length * 0.6 + (letters.length - 1) * 0.04));
    const m = setLine(monoBold, letters, { x: x + K.icon / 2, y: y + K.icon / 2 + capHeight(monoBold, size) / 2, size, tracking: 0.04, align: 'center' });
    return `<rect x="${f(x)}" y="${f(y)}" width="${K.icon}" height="${K.icon}" rx="5" fill="${colour}"/><path d="${m.d}" fill="${ink}"/>`;
  }

  const style = [
    `.tint{animation:wave ${s(K.wave)} ease-in-out var(--w) infinite}`,
    `@keyframes wave{50%{opacity:.35}}`,
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`,
  ].join('');

  const all = C.groups.flatMap((g) => g.tools.map((x) => x.label)).join(', ');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">${C.title}</title><desc id="d">${all}.</desc>`,
    `<style>${style}</style>`,
    `<rect width="${W}" height="${H}" fill="${t.ground}"/>`,
    `<path d="M${M} ${ruleY}H${W - M}" fill="none" stroke="${t.hairline}" stroke-width="1.5"/>`,
    `<path d="${left.d}" fill="${t.ink}"/><path d="${right.d}" fill="${t.muted}"/>`,
    `<path d="${groupLabels.join('')}" fill="${t.muted}"/>`,
    ...chips.map(chip),
    `</svg>`,
  ].join('');
}
