// The hero, "By hand / not": the name, then one line typed slowly, key by key, by a
// person — "Software was written by hand." — and then the next line, all at once. The
// change of pace is the statement; nothing else moves.
//
// Every element's resting style IS the final frame; animations only describe how it
// arrives. So reduced motion (animation: none) shows the finished hero immediately.
import { loadFont, setLine, capHeight } from './lib/type.mjs';

const f = (n) => Math.round(n * 10) / 10;
const s = (sec) => `${Math.round(sec * 1000) / 1000}s`;
const pct = (x) => `${Math.round(x * 10000) / 100}%`;
// per-element timing goes in a custom property so one rule serves every element
const at = (sec) => `style="--t:${s(sec)}"`;

/** Human typing: uneven keystrokes, a beat after each word, a pause before the last one. */
function keystrokes(text, base) {
  const times = [];
  let t = 0;
  [...text].forEach((ch, i) => {
    if (i > 0) {
      t += base * (0.75 + ((i * 7) % 5) * 0.14);
      if (text[i - 1] === ' ') t += base * 1.3;
      if (text.slice(i).startsWith('hand')) t += base * 3;
    }
    times.push(t);
  });
  return times;
}

export function hero({ theme, tokens, copy }) {
  const t = tokens.themes[theme];
  const H = tokens.hero;
  const m = tokens.motion;
  const C = copy.hero;
  const fam = tokens.fonts.display[tokens.fonts.defaultDisplay];
  const black = loadFont(fam['900']);
  const semi = loadFont(fam['600']);
  const mono = loadFont(tokens.fonts.mono['500']);
  const monoBold = loadFont(tokens.fonts.mono['600']);
  const W = H.width, M = H.margin;

  // ── labels and rule ──────────────────────────────────────────────────────────
  const ruleY = 62;
  const left = setLine(monoBold, C.labelLeft, { x: M, y: 42, size: H.labelSize, tracking: H.labelTracking });
  const right = setLine(mono, C.labelRight, { x: W - M, y: 42, size: H.labelSize, tracking: H.labelTracking, align: 'right' });

  // ── the name ─────────────────────────────────────────────────────────────────
  const nameSize = H.nameCap / capHeight(black, 1);
  const nameBase = ruleY + 38 + H.nameCap;
  const name = setLine(black, C.name, { x: M, y: nameBase, size: nameSize, tracking: H.displayTracking });
  const boxes = name.glyphs.filter((g) => g.box).map((g) => g.box);
  const top = Math.min(...boxes.map((b) => b.y1)) - 2;
  const bottom = Math.max(...boxes.map((b) => b.y2)) + 2;

  // ── by hand: monospaced, so every key lands on a fixed step ──────────────────
  const handBase = bottom + 58;
  const hand = setLine(mono, C.byHand, { x: M, y: handBase, size: H.byHandSize, optical: false });
  const step = (mono.charToGlyph('M').advanceWidth / mono.unitsPerEm) * H.byHandSize;
  const T = m.timeline;
  const keys = keystrokes(C.byHand, m.keystroke).map((k) => T.type + k);
  const typed = keys[keys.length - 1];
  const instant = typed + T.pause;

  // the caret follows the typing, blinks while it waits, and is gone once the machine line lands
  const caretH = capHeight(mono, H.byHandSize) * 1.25;
  const caretSpan = instant - T.caret;
  const caretMoves = keys.map((k, i) => `${pct((k - T.caret) / caretSpan)}{transform:translateX(${f((i + 1) * step)}px)}`).join('');
  const blink = [];
  for (let b = T.caret; b < instant; b += 0.53) {
    const typing = b > T.type - 0.2 && b < typed + 0.1;
    blink.push(`${pct((b - T.caret) / caretSpan)}{opacity:1}`);
    if (!typing && b + 0.265 < instant) blink.push(`${pct((b + 0.265 - T.caret) / caretSpan)}{opacity:0}`);
  }

  // ── all at once ──────────────────────────────────────────────────────────────
  const onceBase = handBase + 72;
  const once = setLine(semi, C.atOnce, { x: M, y: onceBase, size: H.atOnceSize, tracking: H.atOnceTracking });

  const e = m.ease;
  const style = [
    `.draw{stroke-dasharray:1;animation:draw .7s ${e} both}`,
    `.fade{animation:fade .6s ${e} .1s both}`,
    `.up{animation:up .8s ${e} var(--t) both}`,
    // 50ms reads as instant; Chrome drops 1ms step-end reveals inside <img>-rendered SVG
    `.key{animation:show .05s linear var(--t) both}`,
    `.once{animation:show .05s linear ${s(instant)} both}`,
    // once the new line lands, the hand-typed one recedes to the muted ink
    `.past{fill:${t.muted};animation:recede .9s ease ${s(instant + 0.25)} both}`,
    // forwards only: during the delay the caret keeps its resting (hidden) state
    `.caret{opacity:0;animation:caret ${s(caretSpan)} step-end ${s(T.caret)} forwards,blink ${s(caretSpan)} step-end ${s(T.caret)} forwards}`,
    `@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`,
    `@keyframes fade{from{opacity:0}}`,
    `@keyframes up{from{transform:translateY(${f(bottom - top)}px)}}`,
    `@keyframes show{from{opacity:0}}`,
    `@keyframes recede{from{fill:${t.ink}}}`,
    `@keyframes caret{0%{transform:none}${caretMoves}}`,
    `@keyframes blink{${blink.join('')}100%{opacity:0}}`,
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`,
  ].join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.height}" role="img" aria-labelledby="t d">`,
    `<title id="t">William H. King</title><desc id="d">${C.desc}</desc>`,
    `<style>${style}</style>`,
    `<defs><clipPath id="nc"><rect y="${f(top)}" width="${W}" height="${f(bottom - top)}"/></clipPath></defs>`,
    `<rect width="${W}" height="${H.height}" fill="${t.ground}"/>`,
    `<path class="draw" d="M${M} ${ruleY}H${W - M}" pathLength="1" fill="none" stroke="${t.hairline}" stroke-width="1.5"/>`,
    `<g class="fade"><path d="${left.d}" fill="${t.ink}"/><path d="${right.d}" fill="${t.muted}"/></g>`,
    `<g clip-path="url(#nc)" fill="${t.ink}">`,
    ...name.glyphs.map((g, i) => `<path class="up" ${at(T.name + i * m.letterStagger)} d="${g.d}"/>`),
    `</g>`,
    `<g class="past">`,
    ...hand.glyphs.map((g) => `<path class="key" ${at(keys[g.i])} d="${g.d}"/>`),
    `</g>`,
    `<rect class="caret" x="${M}" y="${f(handBase - caretH * 0.9)}" width="3" height="${f(caretH)}" fill="${t.accent}"/>`,
    `<path class="once" d="${once.d}" fill="${t.ink}"/>`,
    `</svg>`,
  ].join('');
}
