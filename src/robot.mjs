// The robot card: title, goal, and the architecture as a three-panel schematic — cloud
// decides what, the robot acts safely, training makes it better. Signals travel the
// connectors *behind* opaque nodes, so they read as pulses moving between stages. Every
// resting style is the finished schematic; reduced motion just removes the pulses.
import { loadFont, fontStack, setLine, wrap, capHeight } from './lib/type.mjs';

const f = (n) => Math.round(n * 10) / 10;
const s = (sec) => `${Math.round(sec * 100) / 100}s`;
const pct = (x) => `${Math.round(x * 10000) / 100}%`;
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, k) => `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;

const chevron = (x, y, dir, size = 5) => {
  const d = { down: [[-1, -1], [0, 0], [1, -1]], up: [[-1, 1], [0, 0], [1, 1]], right: [[-1, -1], [0, 0], [-1, 1]], left: [[1, -1], [0, 0], [1, 1]] }[dir];
  return `M${d.map(([dx, dy]) => `${f(x + dx * size)} ${f(y + dy * size)}`).join('L')}`;
};

/** Keyframes that move a dot along a polyline at constant speed, fading in and out. */
function travel(name, pts) {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let run = 0;
  const frames = pts.map((p, i) => {
    if (i) run += segs[i - 1];
    return `${pct((run / total) * 0.9)}{transform:translate(${f(p[0])}px,${f(p[1])}px)}`;
  });
  return `@keyframes ${name}{${frames.join('')}100%{transform:translate(${f(pts.at(-1)[0])}px,${f(pts.at(-1)[1])}px)}}` +
    `@keyframes ${name}-o{0%,88%{opacity:1}92%,100%{opacity:0}}`;
}

export function robot({ theme, tokens, copy, narrow = false }) {
  const t = tokens.themes[theme];
  const R = narrow ? { ...tokens.robot, ...tokens.robot.narrow } : tokens.robot;
  const C = copy.robot;
  const fam = tokens.fonts.display[tokens.fonts.defaultDisplay];
  const black = loadFont(fam['900']);
  const semi = fontStack(fam['600'], fam.greek['600']);
  const mono = loadFont(tokens.fonts.mono['500']);
  const monoBold = loadFont(tokens.fonts.mono['600']);
  const W = R.width, M = R.margin, measure = W - 2 * M;
  const nodeFill = mix(t.ground, t.ink, theme === 'light' ? 0.035 : 0.05);
  const out = [];
  const lines = [];   // connectors, drawn under the nodes
  const heads = [];   // arrowheads, drawn over the nodes' edges

  // ── header, title, goal ──────────────────────────────────────────────────────
  const ruleY = 62;
  const left = setLine(monoBold, C.labelLeft, { x: M + 16, y: 42, size: R.labelSize, tracking: 0.14 });
  const right = setLine(mono, C.labelRight, { x: W - M, y: 42, size: R.labelSize, tracking: 0.14, align: 'right' });
  const titleSize = R.titleCap / capHeight(black, 1);
  const titleLines = wrap(black, C.title, { size: titleSize, tracking: -0.03, width: measure, balance: true });
  const titleLead = R.titleCap * 1.3;
  const titleBase = ruleY + 30 + R.titleCap;
  const title = titleLines.map((l, i) => setLine(black, l, { x: M, y: titleBase + i * titleLead, size: titleSize, tracking: -0.03 }).d).join('');
  const goalTop = titleBase + (titleLines.length - 1) * titleLead + R.goalGap;
  const goalLines = wrap(semi, C.goal, { size: R.goalSize, tracking: -0.01, width: measure * R.goalMeasure, balance: true });
  const goalLead = R.goalSize * 1.36;
  const goal = goalLines.map((l, i) => setLine(semi, l, { x: M, y: goalTop + i * goalLead, size: R.goalSize, tracking: -0.01 }).d).join('');
  let y = goalTop + (goalLines.length - 1) * goalLead + R.panelGap;

  // ── panels ───────────────────────────────────────────────────────────────────
  const pw = narrow ? measure : (measure - 2 * R.gutter) / 3;
  const panelX = (i) => (narrow ? M : M + i * (pw + R.gutter));
  const nodeH = R.nodeH, pitch = nodeH + R.nodeGap, pad = R.pad;
  const placed = [];
  let panelH = 0;
  C.panels.forEach((p, i) => {
    const px = panelX(i);
    const top = y;
    const loopLane = i === 2 ? R.loopLane : 0;           // room for the training loop's return path
    const nw = pw - 2 * pad - loopLane;
    const nodes = p.nodes.map((n, j) => ({ ...n, x: px + pad, y: top + R.headH + j * pitch, w: nw, h: nodeH }));
    const noteLines = p.note ? wrap(semi, p.note, { size: R.noteSize, width: pw - 2 * pad, balance: true }) : [];
    const h = R.headH + p.nodes.length * pitch - R.nodeGap + (noteLines.length ? 16 + noteLines.length * R.noteSize * 1.35 : 0) + pad;
    placed.push({ ...p, px, top, nodes, noteLines, h });
    if (narrow) y += h + R.stackGap;
    panelH = Math.max(panelH, h);
  });
  if (!narrow) { placed.forEach((p) => { p.h = panelH; }); y += panelH; } else y -= R.stackGap;

  const cx = (n) => n.x + n.w / 2;
  const mid = (n) => n.y + n.h / 2;
  for (const [i, p] of placed.entries()) {
    out.push(`<rect x="${f(p.px)}" y="${f(p.top)}" width="${f(pw)}" height="${f(p.h)}" rx="14" fill="none" stroke="${t.hairline}" stroke-width="1.5"/>`);
    out.push(`<path d="${setLine(mono, p.name, { x: p.px + pad, y: p.top + 30, size: R.panelLabel, tracking: 0.14 }).d}" fill="${t.muted}"/>`);
    // arrows down the column (the cloud's third node, Argon, stands apart)
    p.nodes.forEach((n, j) => {
      const next = p.nodes[j + 1];
      if (!next || next.secondary) return;
      lines.push(`M${f(cx(n))} ${f(n.y + n.h)}V${f(next.y)}`);
      heads.push(chevron(cx(n), next.y - 1, 'down'));
      const label = p.arrows?.[j];
      if (label) out.push(`<path d="${setLine(mono, label, { x: cx(n) + 10, y: n.y + n.h + R.nodeGap / 2 + 4, size: R.arrowLabel, tracking: 0.1 }).d}" fill="${t.muted}"/>`);
    });
    p.noteLines.forEach((l, k) => out.push(`<path d="${setLine(semi, l, { x: p.px + pad, y: p.nodes.at(-1).y + nodeH + 16 + R.noteSize + k * R.noteSize * 1.35, size: R.noteSize }).d}" fill="${t.muted}"/>`));
    if (i === 2) {
      // the training loop: back up the right-hand lane from the last node to the first
      const a = p.nodes.at(-1), b = p.nodes[0], lane = a.x + a.w + R.loopLane / 2;
      lines.push(`M${f(a.x + a.w)} ${f(mid(a))}H${f(lane)}V${f(mid(b))}H${f(b.x + b.w)}`);
      heads.push(chevron(b.x + b.w + 1, mid(b), 'left'));
    }
  }

  // ── links between panels ─────────────────────────────────────────────────────
  const [cloud, bot, train] = placed;
  const policy = cloud.nodes[1], runner = bot.nodes[0], deploy = train.nodes.at(-1);
  let pulseA, pulseB;
  if (!narrow) {
    const gx1 = cloud.px + pw + R.gutter / 2, gx2 = bot.px + pw + R.gutter / 2;
    lines.push(`M${f(policy.x + policy.w)} ${f(mid(policy))}H${f(gx1)}V${f(mid(runner) - 8)}H${f(runner.x)}`);
    heads.push(chevron(runner.x - 1, mid(runner) - 8, 'right'));
    lines.push(`M${f(deploy.x)} ${f(mid(deploy))}H${f(gx2)}V${f(mid(runner) + 8)}H${f(runner.x + runner.w)}`);
    heads.push(chevron(runner.x + runner.w + 1, mid(runner) + 8, 'left'));
    pulseA = [[cx(cloud.nodes[0]), mid(cloud.nodes[0])], [cx(policy), mid(policy)], [policy.x + policy.w, mid(policy)], [gx1, mid(policy)], [gx1, mid(runner) - 8], [runner.x, mid(runner) - 8], [cx(runner), mid(runner)], ...bot.nodes.slice(1).map((n) => [cx(n), mid(n)])];
  } else {
    // stacked: one connector into the robot panel, one out to training
    const x = M + measure / 2;
    lines.push(`M${f(x)} ${f(cloud.top + cloud.h)}V${f(bot.top)}`, `M${f(x)} ${f(bot.top + bot.h)}V${f(train.top)}`);
    heads.push(chevron(x, bot.top - 1, 'down'), chevron(x, train.top + 1, 'up'));
    pulseA = bot.nodes.map((n) => [cx(n), mid(n)]);
  }
  {
    const n = train.nodes, lane = n[0].x + n[0].w + R.loopLane / 2;
    pulseB = [...n.map((k) => [cx(k), mid(k)]), [n.at(-1).x + n.at(-1).w, mid(n.at(-1))], [lane, mid(n.at(-1))], [lane, mid(n[0])], [cx(n[0]), mid(n[0])]];
  }

  // ── nodes, drawn over the connectors so pulses pass behind them ──────────────
  const nodes = placed.flatMap((p) => p.nodes).map((n) => {
    const safety = /safety/i.test(n.title);
    const stroke = safety ? t.accent : t.hairline;
    const dash = n.secondary ? ' stroke-dasharray="4 4"' : '';
    const ttl = setLine(semi, n.title, { x: n.x + 16, y: n.y + 25, size: R.nodeTitle, tracking: -0.01 });
    const sub = setLine(mono, n.sub, { x: n.x + 16, y: n.y + 45, size: R.nodeSub, tracking: 0.1 });
    return `<rect x="${f(n.x)}" y="${f(n.y)}" width="${f(n.w)}" height="${n.h}" rx="10" fill="${nodeFill}" stroke="${stroke}" stroke-width="${safety ? 1.75 : 1.25}"${dash}/>` +
      `<path d="${ttl.d}" fill="${t.ink}"/><path d="${sub.d}" fill="${safety ? t.accent : t.muted}"/>`;
  });

  const barY = y + R.barGap;
  const barLines = narrow ? wrap(mono, C.bar, { size: R.barSize, tracking: 0.12, width: measure }) : [C.bar];
  const bar = barLines.map((l, i) => setLine(mono, l, { x: M, y: barY + i * R.barSize * 1.6, size: R.barSize, tracking: 0.12 }).d).join('');
  const H = Math.round(barY + (barLines.length - 1) * R.barSize * 1.6 + 32);

  const style = [
    `.pa{opacity:0;animation:pa ${s(R.pulseA)} linear 1s infinite,pa-o ${s(R.pulseA)} linear 1s infinite}`,
    `.pb{opacity:0;animation:pb ${s(R.pulseB)} linear 1.6s infinite,pb-o ${s(R.pulseB)} linear 1.6s infinite}`,
    `.live{animation:live 2.4s ease-in-out infinite}`,
    travel('pa', pulseA), travel('pb', pulseB),
    `@keyframes live{50%{opacity:.25}}`,
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`,
  ].join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">${C.title}</title><desc id="d">${C.desc}</desc>`,
    `<style>${style}</style>`,
    `<rect width="${W}" height="${H}" fill="${t.ground}"/>`,
    `<path d="M${M} ${ruleY}H${W - M}" fill="none" stroke="${t.hairline}" stroke-width="1.5"/>`,
    `<circle class="live" cx="${M + 4}" cy="${f(42 - capHeight(monoBold, R.labelSize) / 2)}" r="4" fill="${t.accent}"/>`,
    `<path d="${left.d}" fill="${t.accent}"/><path d="${right.d}" fill="${t.muted}"/>`,
    `<path d="${title}" fill="${t.ink}"/>`,
    `<path d="${goal}" fill="${t.ink}"/>`,
    ...out,
    `<path d="${lines.join('')}" fill="none" stroke="${t.muted}" stroke-width="1.25" opacity=".7"/>`,
    `<circle class="pa" r="4.5" fill="${t.accent}"/>`,
    `<circle class="pb" r="4.5" fill="${t.accent}"/>`,
    ...nodes,
    `<path d="${heads.join('')}" fill="none" stroke="${t.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${bar}" fill="${t.muted}"/>`,
    `</svg>`,
  ].join('');
}
