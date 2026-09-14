import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthExits } from '@/features/auth/door/auth-exits'

const SRC = join(process.cwd(), 'src')
const DOORS = join(SRC, 'features')

const FLOOR = ['pointer-coarse:after:min-h-11', 'pointer-coarse:after:min-w-11']

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

const AUTH_SURFACES = [
  'features/auth/login/login.tsx',
  'features/auth/register/register.tsx',
  'features/auth/verify-email/verify-email.tsx',
  'features/auth/email-change-confirm/email-change-confirm.tsx',
  'features/password-reset/request/password-reset-request.tsx',
  'features/password-reset/confirm/password-reset-confirm.tsx',
]

function renderExits() {
  return render(
    <MemoryRouter>
      <AuthExits
        exits={[
          { to: '/forgot-password', label: 'Forgot your password?' },
          { to: '/register', label: 'Sign up' },
        ]}
      />
    </MemoryRouter>,
  )
}

describe('the ways out of an auth screen are buttons, not footnotes', () => {
  it('gives every exit the button role rather than a bare link', () => {
    renderExits()
    for (const name of ['Forgot your password?', 'Sign up']) {
      const exit = screen.getByRole('link', { name })
      expect(exit.className).toContain('border')
      expect(exit.className).not.toContain('hover:underline')
    }
  })

  it('inherits the 44px thumb floor from the one button idiom', () => {
    renderExits()
    for (const name of ['Forgot your password?', 'Sign up']) {
      const classes = screen.getByRole('link', { name }).className.split(/\s+/)
      for (const token of FLOOR) expect(classes).toContain(token)
    }
  })

  it('keeps every exit reachable as a real destination', () => {
    renderExits()
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
  })
})

describe('no auth screen spells its own exit as a bare text link', () => {
  it.each(AUTH_SURFACES)('leaves no underlined primary-coloured link in %s', (surface) => {
    const source = readFileSync(join(SRC, surface), 'utf8')
    expect(source).not.toContain('text-primary hover:underline')
  })

  it('finds no auth surface that still hand-rolls the footnote link', () => {
    const offenders = tsxFiles(DOORS)
      .filter((file) => {
        const name = named(file)
        if (!name.startsWith('features/auth/') && !name.startsWith('features/password-reset/')) {
          return false
        }
        return /className="text-primary hover:underline"/.test(readFileSync(file, 'utf8'))
      })
      .map(named)

    expect(offenders).toEqual([])
  })
})
