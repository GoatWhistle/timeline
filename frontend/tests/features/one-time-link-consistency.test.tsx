import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const HANDOFFS = [{ name: 'the team join link', file: 'features/teams/join-link-panel.tsx' }]

function source(file: string): string {
  return readFileSync(join(SRC, file), 'utf8')
}

describe('a link the operator has to hand on is handed on the same way everywhere', () => {
  it.each(HANDOFFS)('$name offers a copy control rather than a block to select', ({ file }) => {
    const text = source(file)
    expect(text, `${file} shows a link with no way to copy it`).toMatch(
      /navigator\.clipboard\.writeText/,
    )
    expect(text, `${file} has no copy button`).toMatch(/<Copy\b/)
  })

  it.each(HANDOFFS)('$name says out loud that it is shown only once', ({ file }) => {
    expect(source(file), `${file} never warns the link will not be shown again`).toMatch(
      /linkShownOnce/,
    )
  })

  it.each(HANDOFFS)('$name reports both outcomes of the copy attempt', ({ file }) => {
    const text = source(file)
    expect(text, `${file} does not confirm a successful copy`).toMatch(/linkCopied/)
    expect(text, `${file} stays silent when the clipboard refuses`).toMatch(/linkCopyFailed/)
  })

  it.each(HANDOFFS)('$name puts the link in a readable, selectable field', ({ file }) => {
    expect(source(file), `${file} renders the link as static text`).toMatch(/<Input[^>]*readOnly/s)
  })
})
