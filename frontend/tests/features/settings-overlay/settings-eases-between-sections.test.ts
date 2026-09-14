import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/features/settings-overlay/settings-overlay.tsx'),
  'utf8',
)

describe('a settings section arrives the way a page does', () => {
  it('hands the panel to the shared swap instead of replacing it outright', () => {
    expect(
      source,
      'swapping the panel with no crossfade snaps the whole section into place',
    ).toMatch(/<CrossfadeSwap/)
  })

  it('keys the swap by the section being shown', () => {
    expect(source).toMatch(/swapKey=\{section\}/)
  })
})
