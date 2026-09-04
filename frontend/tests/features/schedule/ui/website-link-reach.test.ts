import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SHEETS = {
  'the week and day bar': 'src/features/schedule/ui/schedule-bar/schedule-bar.module.css',
  'a wrapped month, quarter and year bar':
    'src/features/schedule/ui/wrapped-grid/wrapped-bar.module.css',
} as const

const LINK_CLASS = {
  'the week and day bar': 'website',
  'a wrapped month, quarter and year bar': 'barWebsite',
} as const

const ICON_CLASS = {
  'the week and day bar': 'websiteIcon',
  'a wrapped month, quarter and year bar': 'barWebsiteIcon',
} as const

const ICON_SIZE = {
  'the week and day bar': '11px',
  'a wrapped month, quarter and year bar': '10px',
} as const

const CASES = Object.keys(SHEETS) as (keyof typeof SHEETS)[]
const COARSE = '@media (pointer: coarse)'

function sheet(name: keyof typeof SHEETS): string {
  return readFileSync(resolve(process.cwd(), SHEETS[name]), 'utf8')
}

function blockAfter(css: string, from: number, selector: string): string | null {
  const at = css.indexOf(selector, from)
  if (at === -1) return null
  const open = css.indexOf('{', at + selector.length)
  const close = css.indexOf('}', open)
  if (open === -1 || close === -1) return null
  return css.slice(open + 1, close)
}

function coarseBlock(name: keyof typeof SHEETS): string | null {
  const css = sheet(name)
  const media = css.indexOf(COARSE)
  if (media === -1) return null
  return blockAfter(css, media, `.${LINK_CLASS[name]} `)
}

function plainBlock(name: keyof typeof SHEETS, selector: string): string | null {
  const css = sheet(name)
  const media = css.indexOf(COARSE)
  const at = css.indexOf(`
.${selector} {`)
  if (at === -1) return null
  if (media !== -1 && at > media && at < css.indexOf('}', css.indexOf('}', media) + 1)) return null
  return blockAfter(css, at, `.${selector} `)
}

describe('the link out to the organiser site is reachable by a thumb', () => {
  it.each(CASES)('grows the site link of %s on a coarse pointer', (name) => {
    const block = coarseBlock(name)

    expect(block, `no ${COARSE} rule for .${LINK_CLASS[name]}`).not.toBeNull()
    expect(block).toContain('align-self: stretch')
    expect(block).toContain('var(--tap-target)')
  })

  it.each(CASES)('leaves the drawn site link of %s untouched on a fine pointer', (name) => {
    const block = plainBlock(name, LINK_CLASS[name])

    expect(block).not.toBeNull()
    expect(block).not.toContain('align-self: stretch')
    expect(block).not.toContain('min-width')
    expect(block).not.toContain('--tap-target')
  })

  it.each(CASES)('sizes the reach of %s from the shared tap token, not a loose number', (name) => {
    const block = coarseBlock(name) ?? ''
    const line = block.split(';').find((part) => part.includes('min-width')) ?? ''

    expect(line).toContain('--tap-target')
    expect(line).not.toMatch(/min-width:\s*\d+px/)
  })

  it.each(CASES)('keeps the drawn icon of %s at the dense calendar size', (name) => {
    const block = plainBlock(name, ICON_CLASS[name]) ?? ''

    expect(block).toContain(`width: ${ICON_SIZE[name]}`)
    expect(block).toContain(`height: ${ICON_SIZE[name]}`)
  })
})
