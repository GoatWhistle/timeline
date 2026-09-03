import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

const SRC = join(process.cwd(), 'src')

const DRAWS_PENCIL = /<Pencil[\s/>]/
const DRAWS_TRASH = /<Trash2[\s/>]/

const OWN = 'shared/ui/primitives/row-actions.tsx'

const LABELLED_ACTION = ['features/personal-layer/outcome/outcome-panel.tsx']

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

function drawing(pattern: RegExp): string[] {
  return tsxFiles(SRC)
    .filter((file) => pattern.test(readFileSync(file, 'utf8')))
    .map(named)
    .filter((file) => file !== OWN)
}

describe('one shape per row action', () => {
  it('draws the edit pencil in exactly one place', () => {
    expect(drawing(DRAWS_PENCIL)).toEqual([])
  })

  it('draws the delete bin only where the action carries its own words', () => {
    const offenders = drawing(DRAWS_TRASH).filter((file) => {
      if (LABELLED_ACTION.includes(file)) return false
      const source = readFileSync(join(SRC, file), 'utf8')
      return !/<Trash2[^>]*\/>\s*\n\s*\{t\(/.test(source)
    })

    expect(offenders).toEqual([])
  })

  it('names what is being edited, not merely that something is', () => {
    render(<EditAction label="Edit the Telegram link" />)
    expect(screen.getByRole('button', { name: 'Edit the Telegram link' })).toBeInTheDocument()
  })

  it('names what is being deleted', () => {
    render(<DeleteAction label="Delete the Telegram link" />)
    expect(screen.getByRole('button', { name: 'Delete the Telegram link' })).toBeInTheDocument()
  })

  it('gives both actions the same square target as the close button', () => {
    const { unmount } = render(<EditAction label="Edit" />)
    expect(screen.getByRole('button').className).toContain('size-8')
    unmount()

    render(<DeleteAction label="Delete" />)
    expect(screen.getByRole('button').className).toContain('size-8')
  })

  it('marks deletion as destructive, so it does not read like any other action', () => {
    render(<DeleteAction label="Delete" />)
    expect(screen.getByRole('button').className).toContain('text-destructive')
  })
})
