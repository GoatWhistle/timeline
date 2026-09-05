import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogoMark } from '@/shared/ui/brand/logo-mark'

const FAVICON = resolvePath(process.cwd(), 'public/favicon.svg')
const WORDMARK_LIGHT = resolvePath(process.cwd(), '../docs/brand/wordmark-light.svg')
const WORDMARK_DARK = resolvePath(process.cwd(), '../docs/brand/wordmark-dark.svg')

const BARS = [
  { x: 2.5, y: 4.6, width: 12, height: 4.4 },
  { x: 7, y: 9.8, width: 14.5, height: 4.4 },
  { x: 4.5, y: 15, width: 9.5, height: 4.4 },
]
const RADIUS = 2.2
const BOX = 24
const FAVICON_PX = 16

type Bar = { x: number; y: number; width: number; height: number; rx: number }

function fromSource(svg: string): Bar[] {
  const bars = [...svg.matchAll(/<rect[^>]*>/g)].map((match) => {
    const tag = match[0]
    const read = (name: string) => Number(tag.match(new RegExp(`\\b${name}="([\\d.]+)"`))?.[1])
    return {
      x: read('x'),
      y: read('y'),
      width: read('width'),
      height: read('height'),
      rx: read('rx'),
    }
  })
  if (bars.length !== BARS.length) {
    throw new Error('the mark geometry could not be read from this source')
  }
  return bars
}

function fromComponent(): Bar[] {
  const { container } = render(<LogoMark />)
  const rects = [...container.querySelectorAll('rect')]
  if (rects.length !== BARS.length) {
    throw new Error('the mark did not render its three bars')
  }
  return rects.map((rect) => {
    const read = (name: string) => Number(rect.getAttribute(name))
    return {
      x: read('x'),
      y: read('y'),
      width: read('width'),
      height: read('height'),
      rx: read('rx'),
    }
  })
}

const SOURCES: [string, () => Bar[]][] = [
  ['the mark in the product', fromComponent],
  ['the favicon', () => fromSource(readFileSync(FAVICON, 'utf8'))],
  ['the light wordmark for the readme', () => fromSource(readFileSync(WORDMARK_LIGHT, 'utf8'))],
  ['the dark wordmark for the readme', () => fromSource(readFileSync(WORDMARK_DARK, 'utf8'))],
]

describe.each(SOURCES)('%s carries the agreed geometry', (_name, read) => {
  const bars = read()

  it('draws the same three bars in the same places', () => {
    expect(bars.map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual(BARS)
  })

  it('rounds every bar by the same amount, so none reads as a different object', () => {
    expect(bars.map((bar) => bar.rx)).toEqual(BARS.map(() => RADIUS))
  })
})

describe('the mark holds together where it is smallest', () => {
  const bars = fromComponent()

  it('keeps the middle bar the longest, so the running event reads as the subject', () => {
    const widths = bars.map((bar) => bar.width)
    expect(Math.max(...widths)).toBe(widths[1])
  })

  it('staggers every bar to a different start, so the three read as a schedule', () => {
    expect(new Set(bars.map((bar) => bar.x)).size).toBe(BARS.length)
  })

  it('leaves each bar above two pixels at the sixteen a browser tab gives it', () => {
    for (const bar of bars) {
      expect((bar.height * FAVICON_PX) / BOX).toBeGreaterThanOrEqual(2.5)
    }
  })

  it('keeps a readable gap between bars at that same size', () => {
    for (const [index, bar] of bars.entries()) {
      const next = bars[index + 1]
      if (!next) continue
      const gap = next.y - (bar.y + bar.height)
      expect((gap * FAVICON_PX) / BOX).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('keeps every part inside its own box', () => {
    for (const bar of bars) {
      expect(bar.x).toBeGreaterThanOrEqual(0)
      expect(bar.y).toBeGreaterThanOrEqual(0)
      expect(bar.x + bar.width).toBeLessThanOrEqual(BOX)
      expect(bar.y + bar.height).toBeLessThanOrEqual(BOX)
    }
  })
})

describe('the mark takes its colour from the place it is used', () => {
  it('paints itself in the current colour rather than a fixed one', () => {
    const { container } = render(<LogoMark />)
    const svg = container.querySelector('svg')?.outerHTML ?? ''
    expect(svg).toContain('currentColor')
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})
