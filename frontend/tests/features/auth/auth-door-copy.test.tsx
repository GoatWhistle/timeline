import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { branch, LOCALES, text } from '@tests/support/dictionaries'
import { MemoryRouter } from 'react-router'
import { afterAll, describe, expect, it } from 'vitest'
import { AuthAside } from '@/features/auth/door/auth-aside'
import { i18n } from '@/shared/i18n/config'

const SRC = join(process.cwd(), 'src')

const ON_THE_DOOR = ['pitch'] as const

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

function renderAside() {
  return render(
    <MemoryRouter>
      <AuthAside />
    </MemoryRouter>,
  )
}

describe('the door does not repeat the caveat that belongs where the status is set', () => {
  it.each(LOCALES)('carries no disclaimer sentence in the %s dictionary', (locale) => {
    expect(Object.keys(branch(locale, 'auth', 'door'))).not.toContain('honesty')
  })

  it.each(LOCALES)('shows only the door sentences the panel should carry in %s', async (locale) => {
    await i18n.changeLanguage(locale)
    const { container } = renderAside()

    const prose = [...container.querySelectorAll('h1, aside > p, aside > div > p')]
      .map((node) => node.textContent?.trim() ?? '')
      .filter((line) => line.length > 0)

    expect(prose, `the door in ${locale} carries a sentence nobody asked for`).toEqual(
      ON_THE_DOOR.map((key) => text(locale, 'auth', `door.${key}`)),
    )
  })

  it('reads the panel source and finds no reference to the removed key', () => {
    const source = readFileSync(join(SRC, 'features/auth/door/auth-aside.tsx'), 'utf8')
    expect(source).not.toContain('door.honesty')
  })
})

describe('the sign-in card lets its heading speak for itself', () => {
  it.each(LOCALES)('carries no description sentence in the %s dictionary', (locale) => {
    expect(Object.keys(branch(locale, 'auth', 'login'))).not.toContain('description')
  })

  it('renders no card description under the sign-in heading', () => {
    const source = readFileSync(join(SRC, 'features/auth/login/login.tsx'), 'utf8')
    expect(source).not.toContain('login.description')
    expect(source).not.toContain('<CardDescription>')
  })
})

describe('the password recovery card lets its heading speak for itself', () => {
  it.each(LOCALES)('carries no request hint in the %s dictionary', (locale) => {
    expect(Object.keys(branch(locale, 'auth', 'reset'))).not.toContain('requestHint')
  })

  it('renders no card description under the recovery heading', () => {
    const source = readFileSync(
      join(SRC, 'features/password-reset/request/password-reset-request.tsx'),
      'utf8',
    )
    expect(source).not.toContain('reset.requestHint')
    expect(source).not.toContain('<CardDescription>')
  })
})

describe('the sibling cards keep only the sentences that add something', () => {
  const KEPT: [string, string][] = [
    ['register', 'description'],
    ['reset', 'confirmHint'],
    ['reset', 'noTokenHint'],
    ['verify', 'noTokenHint'],
    ['emailChange', 'noTokenHint'],
    ['invite', 'invalidHint'],
  ]

  it.each(KEPT)('keeps %s.%s, which says something the heading does not', (group, key) => {
    for (const locale of LOCALES) {
      expect(Object.keys(branch(locale, 'auth', group))).toContain(key)
    }
  })
})

describe('no auth sentence merely restates the heading above it', () => {
  const PAIRS: [string, string, string][] = [
    ['register', 'title', 'description'],
    ['reset', 'confirmTitle', 'confirmHint'],
    ['reset', 'noTokenTitle', 'noTokenHint'],
    ['verify', 'noTokenTitle', 'noTokenHint'],
    ['emailChange', 'noTokenTitle', 'noTokenHint'],
    ['invite', 'invalidTitle', 'invalidHint'],
  ]

  const words = (value: string) =>
    new Set(
      value
        .toLocaleLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length > 2),
    )

  it.each(PAIRS)('makes %s.%s carry more than %s already says', (group, heading, hint) => {
    for (const locale of LOCALES) {
      const said = words(text(locale, 'auth', `${group}.${heading}`))
      const adds = [...words(text(locale, 'auth', `${group}.${hint}`))].filter(
        (word) => !said.has(word),
      )
      expect(adds.length, `${locale} ${group}.${hint} only echoes its heading`).toBeGreaterThan(2)
    }
  })
})
