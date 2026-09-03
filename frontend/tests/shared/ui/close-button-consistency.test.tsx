import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CloseButton } from '@/shared/ui/primitives/close-button'

const SRC = join(process.cwd(), 'src')

const RENDERS_X = /<X[\s/>]/
const SQUARE = /\bsize-\d/

const EXEMPT = [
  'shared/ui/primitives/close-button.tsx',
  'features/event-cover/cover-field.tsx',
  'features/profile/avatar-field/avatar-field.tsx',
]

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

describe('a close control is square, and there is one of it', () => {
  it('is the only place that draws a bare close cross', () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => RENDERS_X.test(readFileSync(file, 'utf8')))
      .map(named)
      .filter((file) => !EXEMPT.includes(file))

    expect(offenders).toEqual([])
  })

  it('never gives a close control horizontal padding, which is what made it a rectangle', () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        if (!/CloseButton/.test(source)) return false
        return /<CloseButton[^>]*className=[^>]*\bpx-\d/.test(source)
      })
      .map(named)

    expect(offenders).toEqual([])
  })

  it('never lets a caller respell the size as a width and a height that can drift apart', () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return /<CloseButton[^>]*className=[^>]*\b[wh]-\d/.test(source)
      })
      .map(named)

    expect(offenders).toEqual([])
  })

  it('renders a square target rather than a padded strip', () => {
    render(<CloseButton />)
    const button = screen.getByRole('button')

    expect(button.className).toMatch(SQUARE)
    expect(button.className).toContain('size-8')
    expect(button.className).not.toMatch(/\bpx-\d/)
  })

  it('names itself for a screen reader even though it shows only a glyph', () => {
    render(<CloseButton />)
    expect(screen.getByRole('button').getAttribute('aria-label')).toBeTruthy()
  })

  it('takes a more precise label when the surface needs one', () => {
    render(<CloseButton label="Hide the reminder" />)
    expect(screen.getByRole('button', { name: 'Hide the reminder' })).toBeInTheDocument()
  })
})
