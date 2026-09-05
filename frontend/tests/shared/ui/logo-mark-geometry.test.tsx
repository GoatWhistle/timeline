import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LogoMark } from '@/shared/ui/brand/logo-mark'

const FAVICON = resolvePath(process.cwd(), 'public/favicon.svg')
const WORDMARK_LIGHT = resolvePath(process.cwd(), '../docs/brand/wordmark-light.svg')
const WORDMARK_DARK = resolvePath(process.cwd(), '../docs/brand/wordmark-dark.svg')

const TRACK_PATH = 'M4 12h16'
const TRACK_WIDTH = 2.5
const END_RADIUS = 2.5
const CENTRE_RADIUS = 5.5
const BOX = 24

type Mark = {
  track: string
  trackWidth: number
  radii: number[]
  centres: number[]
}

function measure(track: string, trackWidth: string, circles: [number, number][]): Mark {
  return {
    track,
    trackWidth: Number(trackWidth),
    radii: circles.map(([, r]) => r),
    centres: circles.map(([cx]) => cx),
  }
}

function fromSource(svg: string): Mark {
  const track = svg.match(/d="(M4 12h16)"/)
  const trackWidth = svg.match(/d="M4 12h16"[^/>]*?stroke-width="([\d.]+)"/)
  const circles = [...svg.matchAll(/<circle[^/>]*cx="([\d.]+)"[^/>]*\br="([\d.]+)"/g)].map(
    (match) => [Number(match[1]), Number(match[2])] as [number, number],
  )
  if (!track || !trackWidth || circles.length !== 3) {
    throw new Error('the mark geometry could not be read from this source')
  }
  return measure(String(track[1]), String(trackWidth[1]), circles)
}

function fromComponent(): Mark {
  const { container } = render(<LogoMark />)
  const path = container.querySelector('path')
  const circles = [...container.querySelectorAll('circle')]
  if (!path || circles.length !== 3) {
    throw new Error('the mark did not render a track and its three points')
  }
  return measure(
    path.getAttribute('d') ?? '',
    path.getAttribute('strokeWidth') ?? path.getAttribute('stroke-width') ?? '0',
    circles.map(
      (circle) =>
        [Number(circle.getAttribute('cx')), Number(circle.getAttribute('r'))] as [number, number],
    ),
  )
}

const SOURCES: [string, () => Mark][] = [
  ['the mark in the product', fromComponent],
  ['the favicon', () => fromSource(readFileSync(FAVICON, 'utf8'))],
  ['the light wordmark for the readme', () => fromSource(readFileSync(WORDMARK_LIGHT, 'utf8'))],
  ['the dark wordmark for the readme', () => fromSource(readFileSync(WORDMARK_DARK, 'utf8'))],
]

describe.each(SOURCES)('%s carries the agreed geometry', (_name, read) => {
  const mark = read()

  it('runs the same track', () => {
    expect(mark.track).toBe(TRACK_PATH)
    expect(mark.trackWidth).toBe(TRACK_WIDTH)
  })

  it('sets the same three points on it', () => {
    expect(mark.centres).toEqual([4, 20, 12])
    expect(mark.radii).toEqual([END_RADIUS, END_RADIUS, CENTRE_RADIUS])
  })
})

describe('the mark holds together where it is smallest', () => {
  const mark = fromComponent()

  it('keeps the centre point clearly larger than the ends, so the present reads as the subject', () => {
    expect(CENTRE_RADIUS).toBeGreaterThan(END_RADIUS * 1.5)
  })

  it('leaves the centre point above three pixels at the sixteen a browser tab gives it', () => {
    expect((CENTRE_RADIUS * 2 * 16) / BOX).toBeGreaterThanOrEqual(3.5)
  })

  it('keeps every part inside its own box', () => {
    for (const [index, centre] of mark.centres.entries()) {
      const radius = mark.radii[index] ?? 0
      expect(centre - radius).toBeGreaterThanOrEqual(0)
      expect(centre + radius).toBeLessThanOrEqual(BOX)
    }
  })

  it('reaches the ends of the track with the points that sit on them', () => {
    expect(mark.centres).toContain(4)
    expect(mark.centres).toContain(20)
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
