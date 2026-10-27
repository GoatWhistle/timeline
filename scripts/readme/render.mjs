import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const HERE = import.meta.dirname
const REPO = path.resolve(HERE, '..', '..')
const SOURCE = path.join(HERE, 'assets.html')
const DATA = path.join(HERE, 'readme.json')
const MARK = path.join(REPO, 'frontend', 'src', 'shared', 'ui', 'brand', 'logo-mark.tsx')
const OUT = path.join(REPO, 'docs', 'readme')
const README = path.join(REPO, 'README.md')
const THEMES = ['light', 'dark']
const ROWS = ['buttons', 'status', 'stack', 'nav']
const LINE = 660
const GAP = 6
const MERMAID_INIT = /^%%\{init:.*\}%%\s*$/

const { chromium } = createRequire(path.join(REPO, 'frontend', 'package.json'))('@playwright/test')

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const rects = fs.readFileSync(MARK, 'utf8').match(/<rect[\s\S]*?\/>/g) ?? []
const mark = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${rects
  .map((rect) => rect.replace(/className=\{styles\.(\w+)\}/, 'class="$1"').replace(/\s+/g, ' '))
  .join('')}</svg>`

const label = (b) => [b.label, b.value].filter(Boolean).join(': ')
const items = {
  buttons: (data.buttons ?? []).map((b) => ({
    ...b,
    asset: `cta-${b.name}`,
    alt: b.label,
  })),
  status: (data.status ?? []).map((b, i) => ({
    ...b,
    asset: `badge-status-${i + 1}`,
    alt: label(b),
  })),
  stack: (data.stack ?? []).map((b, i) => ({
    ...b,
    asset: `badge-stack-${i + 1}`,
    alt: label(b),
  })),
  nav: (data.nav ?? []).map((b, i) => ({
    ...b,
    asset: `badge-nav-${i + 1}`,
    alt: b.value,
  })),
}

fs.mkdirSync(OUT, { recursive: true })
for (const file of fs.readdirSync(OUT)) {
  if (/^(cta|badge)-.*\.png$/.test(file)) fs.rmSync(path.join(OUT, file))
}

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1100, height: 1600 },
  deviceScaleFactor: 2,
})
await page.goto(pathToFileURL(SOURCE).href)
await page.evaluate(
  ({ svg, rows }) => {
    for (const host of document.querySelectorAll('[data-mark]')) host.innerHTML = svg
    const target = document.getElementById('generated')
    const icon = (name) => document.querySelector(`#icons [data-icon="${name}"]`)?.cloneNode(true)
    const part = (cls, text) => {
      const span = document.createElement('span')
      span.className = cls
      const inner = document.createElement('span')
      inner.className = 'text'
      inner.textContent = text
      span.append(inner)
      return span
    }
    for (const b of rows.buttons) {
      const el = document.createElement('span')
      el.className = `cta${b.primary ? ' is-primary' : ''}`
      el.dataset.asset = b.asset
      const svg = icon(b.icon)
      if (svg) el.append(svg)
      el.append(part('text', b.label))
      target.append(el)
    }
    for (const kind of ['status', 'stack', 'nav']) {
      for (const b of rows[kind]) {
        const el = document.createElement('span')
        el.className = ['badge', kind === 'nav' ? 'is-nav' : '', b.tone ? `is-${b.tone}` : '']
          .filter(Boolean)
          .join(' ')
        el.dataset.asset = b.asset
        if (b.label) el.append(part('label', b.label))
        el.append(part('value', b.value))
        target.append(el)
      }
    }
  },
  { svg: mark, rows: items },
)
await page.evaluate(() => document.fonts.ready)
await page.evaluate(() => {
  const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  for (const asset of document.querySelectorAll('#generated [data-asset]')) {
    const texts = [...asset.querySelectorAll('.text')]
    const shifts = texts.map((el) => {
      const style = getComputedStyle(el)
      canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const cap = canvas.measureText('H').actualBoundingBoxAscent
      return (
        Math.max(...texts.map((t) => canvas.measureText(t.textContent).actualBoundingBoxAscent)) -
        cap
      )
    })
    const shift = Math.min(0, ...shifts) / 2
    for (const el of texts) el.style.transform = `translateY(${shift.toFixed(2)}px)`
  }
})

const sizes = {}
for (const theme of THEMES) {
  await page.evaluate((value) => {
    document.documentElement.className = value
  }, theme)
  await page.evaluate(() => document.fonts.ready)
  const assets = page.locator('[data-asset]')
  const count = await assets.count()
  for (let i = 0; i < count; i += 1) {
    const name = await assets.nth(i).getAttribute('data-asset')
    await assets.nth(i).screenshot({
      path: path.join(OUT, `${name}.${theme}.png`),
      omitBackground: true,
    })
    const box = await assets.nth(i).boundingBox()
    sizes[name] = {
      width: Math.round(box.width),
      height: Math.round(box.height),
    }
  }
}

await page.evaluate(() => {
  document.documentElement.className = 'light'
})
const palette = await page.evaluate(() => {
  const probe = document.createElement('span')
  document.body.append(probe)
  const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const hex = (name) => {
    probe.style.color = `var(${name})`
    canvas.clearRect(0, 0, 1, 1)
    canvas.fillStyle = getComputedStyle(probe).color
    canvas.fillRect(0, 0, 1, 1)
    const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  }
  const value = {
    primaryColor: hex('--card'),
    primaryTextColor: hex('--foreground'),
    primaryBorderColor: hex('--logo'),
    secondaryColor: hex('--muted'),
    tertiaryColor: hex('--background'),
    lineColor: hex('--muted-foreground'),
    textColor: hex('--foreground'),
    fontFamily: 'Geist',
  }
  probe.remove()
  return value
})
await browser.close()

const escapeHtml = (text) =>
  String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const picture = (name, alt) => {
  const { width, height } = sizes[name]
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="docs/readme/${name}.dark.png"><img src="docs/readme/${name}.light.png" alt="${escapeHtml(alt)}" width="${width}" height="${height}"></picture>`
}
const tag = (b) =>
  b.href
    ? `  <a href="${escapeHtml(b.href)}">${picture(b.asset, b.alt)}</a>`
    : `  ${picture(b.asset, b.alt)}`
const span = (line) =>
  line.reduce((sum, b) => sum + sizes[b.asset].width, 0) + GAP * Math.max(0, line.length - 1)
const fill = (list, limit) => {
  const lines = [[]]
  for (const b of list) {
    if (lines.at(-1).length && span([...lines.at(-1), b]) > limit) lines.push([])
    lines.at(-1).push(b)
  }
  return lines
}
const balance = (list) => {
  const count = fill(list, LINE).length
  let low = Math.max(...list.map((b) => sizes[b.asset].width))
  let high = LINE
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    if (fill(list, mid).length <= count) high = mid
    else low = mid
  }
  return fill(list, high)
}
const row = (list) =>
  list.length
    ? balance(list)
        .map((line) => line.map(tag).join('\n'))
        .join('\n  <br>\n')
    : ''

let readme = fs.readFileSync(README, 'utf8')
for (const kind of ROWS) {
  const block = new RegExp(`(<!-- readme:${kind} -->)[\\s\\S]*?(<!-- /readme:${kind} -->)`)
  if (!block.test(readme)) {
    console.error(`README.md: markers for ${kind} not found, row skipped`)
    continue
  }
  readme = readme.replace(block, (_, open, close) => `${open}\n${row(items[kind])}\n  ${close}`)
}
for (const name of ['banner', 'mark']) {
  const img = new RegExp(`<img src="docs/readme/${name}\\.light\\.png"([^>]*?)\\s*/?>`, 'g')
  readme = readme.replace(img, (_, attrs) => {
    const rest = attrs.replace(/\s(width|height)="[^"]*"/g, '')
    return `<img src="docs/readme/${name}.light.png"${rest} width="${sizes[name].width}" height="${sizes[name].height}">`
  })
}

const init = `%%{init: ${JSON.stringify({ theme: 'base', themeVariables: palette })}}%%`
const lines = readme.split('\n')
const out = []
for (let i = 0; i < lines.length; i += 1) {
  out.push(lines[i])
  if (lines[i].trim() !== '```mermaid') continue
  out.push(init)
  if (MERMAID_INIT.test(lines[i + 1] ?? '')) i += 1
}
fs.writeFileSync(README, out.join('\n'))

const counts = ROWS.map((kind) => `${kind} ${items[kind].length}`).join(', ')
console.log(`docs/readme: banner, mark, ${counts}; light and dark at 2x`)
