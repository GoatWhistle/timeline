import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthAside } from '@/features/auth/door/auth-aside'
import { AuthBrandBar } from '@/features/auth/door/auth-brand-bar'

const SRC = join(process.cwd(), 'src')

const CARDS = [
  'features/auth/login/login.tsx',
  'features/auth/register/register.tsx',
  'features/password-reset/request/password-reset-request.tsx',
  'features/password-reset/confirm/password-reset-confirm.tsx',
]

describe('the door names the product exactly once', () => {
  it.each(CARDS)('leaves the wordmark out of the form card in %s', (card) => {
    expect(readFileSync(join(SRC, card), 'utf8')).not.toContain('<Wordmark')
  })

  it('draws the wordmark in the wide panel', () => {
    render(
      <MemoryRouter>
        <AuthAside />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/timeline/i).length).toBeGreaterThan(0)
  })

  it('still names the product where the panel is hidden on a phone', () => {
    render(
      <MemoryRouter>
        <AuthBrandBar />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/timeline/i).length).toBeGreaterThan(0)
  })
})

describe('the panel shows what the product is about', () => {
  it('draws the stages of an event rather than a bulleted list', () => {
    render(
      <MemoryRouter>
        <AuthAside />
      </MemoryRouter>,
    )
    const rail = screen.getByRole('list', { name: /stages of an event/i })
    expect(rail.querySelectorAll('li')).toHaveLength(5)
  })
})

describe('the door panel spends only design tokens', () => {
  it('names no raw hex anywhere in the door', () => {
    for (const file of ['auth-aside.tsx', 'door-timeline.tsx', 'auth-brand-bar.tsx']) {
      const source = readFileSync(join(SRC, 'features/auth/door', file), 'utf8')
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
    for (const sheet of ['door-timeline.module.css', 'door-wordmark.module.css']) {
      const css = readFileSync(join(SRC, 'features/auth/door', sheet), 'utf8')
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('honours the reduced-motion preference the product already respects', () => {
    const css = readFileSync(join(SRC, 'features/auth/door/door-timeline.module.css'), 'utf8')
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
