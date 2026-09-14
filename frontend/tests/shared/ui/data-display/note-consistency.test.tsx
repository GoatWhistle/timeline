import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Note } from '@/shared/ui/data-display/note/note'

const SRC = join(process.cwd(), 'src')
const NOTE = join(SRC, 'shared/ui/data-display/note/note.tsx')

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).split(sep).join('/')
const files = tsxFiles(SRC).filter((file) => file !== NOTE)

function classLists(source: string): string[] {
  return [...source.matchAll(/className=(?:"([^"]*)"|\{cn\(([\s\S]*?)\)\}|\{`([^`]*)`\})/g)].map(
    (match) => (match[1] ?? match[2] ?? match[3] ?? '').replaceAll(/\s+/g, ' '),
  )
}

const has = (classes: string, ...needles: string[]) =>
  needles.every((needle) => classes.includes(needle))

const hasBaseToken = (classes: string, token: string) => classes.split(' ').includes(token)

function handRolledNotes(source: string): string[] {
  return classLists(source).filter((classes) => {
    const filled =
      hasBaseToken(classes, 'bg-surface-2') || hasBaseToken(classes, 'bg-destructive/5')
    if (!filled || !has(classes, 'border')) return false
    const strict = has(classes, 'items-start', 'rounded-control', 'px-3', 'py-2')
    const filledAdvisory =
      has(classes, 'border-dashed') &&
      (classes.includes('text-muted-foreground') || classes.includes('text-copy'))
    return strict || filledAdvisory
  })
}

describe('an explanatory strip beside a control is one surface, not one per screen', () => {
  it('keeps that surface spelled once, in the shared primitive', () => {
    const source = readFileSync(NOTE, 'utf8')
    for (const piece of ['items-start', 'gap-2', 'rounded-control', 'px-3', 'py-2', 'text-meta'])
      expect(source, piece).toContain(piece)
    expect(source).toContain('bg-surface-2')
    expect(source).toContain('bg-destructive/5')
  })

  it('lets no screen draw that bordered, filled strip for itself', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (handRolledNotes(readFileSync(file, 'utf8')).length > 0) offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('really does look at every screen, so an empty result means agreement, not an empty sweep', () => {
    expect(files.length).toBeGreaterThan(100)
    expect(files.map(named)).toContain('features/notification-preview/preview-body.tsx')
  })

  it('leaves the glyph out of the accessible name, since the words already carry it', () => {
    const { container } = render(<Note title="Read only">Nothing is sent</Note>)
    const icon = container.querySelector('svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Read only')).toBeInTheDocument()
  })

  it('reaches for a different glyph and a different edge only when the tone says so', () => {
    const { container: calm } = render(<Note>Fine</Note>)
    const { container: alarmed } = render(<Note tone="warning">Not fine</Note>)

    const shell = (root: Element) => root.querySelector('[data-slot="note"]')?.className ?? ''
    expect(shell(calm)).toContain('bg-surface-2')
    expect(shell(alarmed)).toContain('bg-destructive/5')
    expect(shell(alarmed)).not.toContain('bg-surface-2')

    const sized = (root: Element) =>
      (root.querySelector('svg')?.getAttribute('class') ?? '')
        .split(' ')
        .filter((piece) => !piece.startsWith('lucide'))
        .join(' ')
    expect(sized(calm)).toBe(sized(alarmed))
    expect(sized(calm)).toContain('size-4')

    const drawn = (root: Element) => root.querySelector('svg')?.innerHTML ?? ''
    expect(drawn(calm)).not.toBe(drawn(alarmed))
  })

  it('gives the title and the body one shape wherever they appear together', () => {
    const { container } = render(<Note title="Heading">Body</Note>)
    const heading = container.querySelector('p')
    expect(heading?.className).toContain('font-medium')
    expect(heading?.textContent).toBe('Heading')
    expect(container.textContent).toContain('Body')
  })
})
