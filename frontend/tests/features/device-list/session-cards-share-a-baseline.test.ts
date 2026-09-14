import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const CARDS = [
  'features/device-list/session-policy-card.tsx',
  'features/profile/account-actions-card/account-actions-card.tsx',
]

describe('the two cards under the session list end at the same line', () => {
  it.each(CARDS)('pins the action of %s to the foot of its card', (file) => {
    const source = readFileSync(join(SRC, file), 'utf8')
    const rows = source.match(/className="[^"]*justify-end[^"]*"/g) ?? []

    expect(rows.length, `${file} has no action row`).toBeGreaterThan(0)
    for (const row of rows) {
      expect(
        row,
        `an action that merely follows the content floats away from the card beside it: ${row}`,
      ).toMatch(/mt-auto/)
    }
  })
})
