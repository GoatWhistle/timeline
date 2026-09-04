import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { LOCALES, text } from '@tests/support/dictionaries'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthAside } from '@/features/auth/door/auth-aside'
import { AuthBrandBar } from '@/features/auth/door/auth-brand-bar'

const SRC = join(process.cwd(), 'src')
const NBSP = String.fromCharCode(160)
const DASHES = /[—–]/u

const HEADLINES = LOCALES.map((locale) => [locale, text(locale, 'auth', 'door.pitch')] as const)

const breakable = (pitch: string) => pitch.split(' ')

describe('the promise on the door breaks where the sense breaks', () => {
  it.each(HEADLINES)('never lets a dash sit at a break in %s', (_locale, pitch) => {
    for (const chunk of breakable(pitch)) {
      expect(chunk, `a line of "${pitch}" could end on a dash`).not.toMatch(
        new RegExp(`${DASHES.source}[${NBSP}]*$`, 'u'),
      )
    }
  })

  it.each(HEADLINES)(
    'carries a short word across the break with a dash in %s',
    (_locale, pitch) => {
      if (!DASHES.test(pitch)) return
      const chunks = breakable(pitch)
      for (const [index, chunk] of chunks.entries()) {
        if (index === chunks.length - 1) continue
        const tail = chunk.split(NBSP).pop() ?? ''
        expect(tail.length, `"${tail}" would be left hanging in "${pitch}"`).toBeGreaterThan(2)
      }
    },
  )

  it.each(HEADLINES)('reads as one clean sentence once the joins go in %s', (_locale, pitch) => {
    expect(pitch.split(NBSP).join(' ')).not.toContain('  ')
    expect(pitch.trim()).toBe(pitch)
  })
})

describe('the heading balances its lines rather than filling them greedily', () => {
  it('asks the browser to balance the promise on the wide panel', () => {
    const source = readFileSync(join(SRC, 'features/auth/door/auth-aside.tsx'), 'utf8')
    expect(source).toMatch(/<h1[^>]*text-balance/s)
  })

  it('asks the browser to balance the promise on a phone too', () => {
    const source = readFileSync(join(SRC, 'features/auth/door/auth-brand-bar.tsx'), 'utf8')
    expect(source).toContain('text-balance')
  })

  it('renders the promise as one text node so the balancer can see all of it', () => {
    render(
      <MemoryRouter>
        <AuthAside />
      </MemoryRouter>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.childElementCount).toBe(0)
  })
})

const WORDMARK_CSS = join(SRC, 'features/auth/door/door-wordmark.module.css')

describe('the wordmark is the loudest thing on the door', () => {
  it('states the enlargement as a multiple greater than one', () => {
    const css = readFileSync(WORDMARK_CSS, 'utf8')
    const scale = /--door-wordmark-scale:\s*([0-9.]+)/.exec(css)
    expect(scale, 'the door must declare how much it enlarges the wordmark').not.toBeNull()
    expect(Number(scale?.[1])).toBeGreaterThan(1)
  })

  it('grows the whole lockup from that one multiple', () => {
    const css = readFileSync(WORDMARK_CSS, 'utf8')
    expect(css).toMatch(/transform:\s*scale\(var\(--door-wordmark-scale\)\)/)
  })

  it('leaves the five-step type scale alone', () => {
    expect(readFileSync(WORDMARK_CSS, 'utf8')).not.toContain('font-size')
  })

  it('spends only design tokens on the enlarged wordmark', () => {
    expect(readFileSync(WORDMARK_CSS, 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('applies the enlarging class to the wordmark on the wide panel', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthAside />
      </MemoryRouter>,
    )
    const link = container.querySelector('a[href="/login"]')
    expect(link?.getAttribute('class')).toMatch(/wordmark/i)
  })

  it('applies the enlarging class on a phone too, where it is the only branding', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthBrandBar />
      </MemoryRouter>,
    )
    const link = container.querySelector('a[href="/login"]')
    expect(link?.getAttribute('class')).toMatch(/wordmark/i)
  })

  it('still names the product exactly once on the wide panel', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthAside />
      </MemoryRouter>,
    )
    expect(container.querySelectorAll('a[href="/login"]')).toHaveLength(1)
  })
})
