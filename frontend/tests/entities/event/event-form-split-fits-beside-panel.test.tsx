import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const FORM = readFileSync(join(SRC, 'entities/event/event-flat-form.tsx'), 'utf8')
const PAGE = readFileSync(join(SRC, 'app/pages/admin-event-page.tsx'), 'utf8')

const CONTAINER_REM: Record<string, number> = {
  '@xs': 20,
  '@sm': 24,
  '@md': 28,
  '@lg': 32,
  '@xl': 36,
  '@2xl': 42,
  '@3xl': 48,
  '@4xl': 56,
  '@5xl': 64,
  '@6xl': 72,
  '@7xl': 80,
}

const ROOT_FONT = 16
const SIDE_PANEL = 320
const COLUMN_GAP = 24

function pixels(name: string): number {
  const rem = CONTAINER_REM[name]
  if (rem === undefined) throw new Error(`unknown container size ${name}`)
  return rem * ROOT_FONT
}

function splitThreshold(): string {
  const found = FORM.match(/(@\w+):grid-cols-2/)
  if (!found?.[1]) throw new Error('the flat form no longer names a split threshold')
  return found[1]
}

function panelThreshold(): string {
  const found = PAGE.match(/(@\w+):grid-cols-\[minmax\(0,1fr\)_320px\]/)
  if (!found?.[1]) throw new Error('the general tab no longer names a side-panel threshold')
  return found[1]
}

describe('the event form still splits at the width the side panel leaves it', () => {
  it('names a threshold on both the form and the page that opens the side panel', () => {
    expect(CONTAINER_REM[splitThreshold()]).toBeTypeOf('number')
    expect(CONTAINER_REM[panelThreshold()]).toBeTypeOf('number')
  })

  it('splits within the leftovers of the narrowest page that shows the panel', () => {
    const leftovers = pixels(panelThreshold()) - SIDE_PANEL - COLUMN_GAP
    expect(pixels(splitThreshold())).toBeLessThanOrEqual(leftovers)
  })
})
