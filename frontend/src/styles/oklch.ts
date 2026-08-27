export type Srgb = [number, number, number]

function oklchToLinearRgb(l: number, c: number, hDeg: number): Srgb {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b
  const lc = lRoot ** 3
  const mc = mRoot ** 3
  const sc = sRoot ** 3
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ]
}

function linearToSrgb(channel: number): number {
  const encoded = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
  return Math.min(1, Math.max(0, encoded))
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function oklchToSrgb(l: number, c: number, h: number): Srgb {
  const [r, g, b] = oklchToLinearRgb(l, c, h)
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)]
}

export function relativeLuminance([r, g, b]: Srgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrastRatio(a: Srgb, b: Srgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function parseOklch(value: string): Srgb | null {
  const match = value.trim().match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
  if (!match?.[1] || !match[2] || !match[3]) return null
  return oklchToSrgb(Number(match[1]), Number(match[2]), Number(match[3]))
}
