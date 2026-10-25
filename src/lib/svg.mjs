// Small SVG helpers shared by the generated assets.
const f = (n) => Math.round(n * 10) / 10;

export function blur(id, sd, pad = 60) {
  return `<filter id="${id}" x="-${pad}%" y="-${pad}%" width="${100 + 2 * pad}%" height="${100 + 2 * pad}%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${f(sd)}"/></filter>`;
}
