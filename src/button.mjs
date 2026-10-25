// A link button in the hero's voice: a hairline pill with a tracked mono label.
import { loadFont, setLine, capHeight } from './lib/type.mjs';

const f = (n) => Math.round(n * 10) / 10;

export function button({ theme, tokens, label }) {
  const t = tokens.themes[theme];
  const B = tokens.button;
  const mono = loadFont(tokens.fonts.mono['600']);
  const probe = setLine(mono, label, { size: B.labelSize, tracking: B.labelTracking });
  const W = Math.ceil(probe.width + B.padX * 2), H = B.height;
  const text = setLine(mono, label, { x: B.padX, y: H / 2 + capHeight(mono, B.labelSize) / 2, size: B.labelSize, tracking: B.labelTracking });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label.replace(/[^A-Za-z ]/g, '').trim()}">` +
    `<rect x=".75" y=".75" width="${f(W - 1.5)}" height="${f(H - 1.5)}" rx="${f((H - 1.5) / 2)}" fill="${t.ground}" stroke="${t.ink}" stroke-width="1.5"/>` +
    `<path d="${text.d}" fill="${t.ink}"/></svg>`;
}
