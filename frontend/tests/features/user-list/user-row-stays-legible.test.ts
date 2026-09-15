import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

describe('a deactivated account stays readable instead of being dimmed out of contrast', () => {
  it('never fades a whole row, which pushed muted cells under 4.5:1 against the page', () => {
    const source = read('features/user-list/user-table.tsx')
    const bodyAt = source.indexOf('<tbody')
    expect(bodyAt, 'the table body moved; this rule is no longer looking at the rows').toBeGreaterThan(-1)
    const rowBlock = source.slice(bodyAt)

    expect(rowBlock, 'a faded row drops muted text to about 2.9:1, measured in the browser').not.toMatch(
      /opacity-\d/,
    )
  })

  it('says that the account is deactivated in words, not only by fading it', () => {
    const source = read('features/user-list/user-table.tsx')

    expect(source).toContain("t('users.deactivated')")
    expect(source).toContain('tone="danger"')
  })
})
