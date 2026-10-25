// A statement card in the hero's voice: two corner labels, one sentence set large, and an
// optional credit and call to action. Type only. Used for the quote and the workshop note.
import { loadFont, setLine, wrap, capHeight } from './lib/type.mjs';

export function card({ theme, tokens, spec: Q, copy: C }) {
  const t = tokens.themes[theme];
  const fam = tokens.fonts.display[tokens.fonts.defaultDisplay];
  const semi = loadFont(fam['600']);
  const mono = loadFont(tokens.fonts.mono['500']);
  const monoBold = loadFont(tokens.fonts.mono['600']);
  const W = Q.width, M = tokens.hero.margin;

  const ruleY = 62;
  const left = setLine(monoBold, C.labelLeft, { x: M, y: 42, size: Q.labelSize, tracking: Q.labelTracking });
  const right = setLine(mono, C.labelRight, { x: W - M, y: 42, size: Q.labelSize, tracking: Q.labelTracking, align: 'right' });

  // the sentence across the measure; an opening quote mark hangs in the margin
  const lines = wrap(semi, C.text, { size: Q.size, tracking: Q.tracking, width: W - 2 * M, balance: true });
  const hang = C.text.startsWith('“') ? (semi.charToGlyph('“').advanceWidth / semi.unitsPerEm) * Q.size : 0;
  const lead = Q.size * 1.18;
  const first = ruleY + 40 + capHeight(semi, Q.size);
  const text = lines.map((line, i) =>
    setLine(semi, line, { x: i ? M : M - hang, y: first + i * lead, size: Q.size, tracking: Q.tracking, optical: false }).d).join('');
  const last = first + (lines.length - 1) * lead;
  const foot = C.credit || C.cta;
  const credit = C.credit && setLine(mono, C.credit, { x: M, y: last + 52, size: Q.labelSize, tracking: Q.labelTracking });
  const cta = C.cta && setLine(monoBold, C.cta, { x: W - M, y: last + 52, size: Q.labelSize, tracking: Q.labelTracking, align: 'right' });
  const H = Math.round(last + (foot ? 84 : 44));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">${C.title}</title><desc id="d">${C.desc}</desc>`,
    `<rect width="${W}" height="${H}" fill="${t.ground}"/>`,
    `<path d="M${M} ${ruleY}H${W - M}" fill="none" stroke="${t.hairline}" stroke-width="1.5"/>`,
    `<path d="${left.d}" fill="${t.ink}"/><path d="${right.d}" fill="${t.muted}"/>`,
    `<path d="${text}" fill="${t.ink}"/>`,
    credit ? `<path d="${credit.d}" fill="${t.muted}"/>` : '',
    cta ? `<path d="${cta.d}" fill="${t.accent}"/>` : '',
    `</svg>`,
  ].join('');
}
