import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/shared/ui/motion/crossfade-swap.tsx'), 'utf8')

const TRANSITION = /motion-safe:transition-\[([^\]]+)\]/g

function transitionedProperties(): string[] {
  const found: string[] = []
  for (const match of source.matchAll(TRANSITION)) {
    const list = match[1]
    if (list) found.push(...list.split(',').map((name) => name.trim()))
  }
  return found
}

describe('the swap eases the very property it moves', () => {
  it('slides with the translate utilities Tailwind actually emits', () => {
    expect(source, 'the slide is written with translate-x utilities').toMatch(
      /motion-safe:-?translate-x-\d/,
    )
  })

  it('lists translate among the transitioned properties, not transform', () => {
    const properties = transitionedProperties()

    expect(
      properties,
      'Tailwind 4 emits translate-x-* as the CSS translate property, so a transition on transform never fires and the pane jumps',
    ).toContain('translate')
  })

  it('never eases transform while moving with translate', () => {
    const properties = transitionedProperties()
    const movesWithTranslate = /motion-safe:-?translate-x-\d/.test(source)

    if (!movesWithTranslate) return
    expect(
      properties,
      'transform is not what changes, so easing it animates nothing',
    ).not.toContain('transform')
  })

  it('keeps no bare translate-x-0 that would outrank the offsets', () => {
    const base = source.match(/'\[grid-area:1\/1\][^']*'/)?.[0] ?? ''

    expect(
      base,
      'an unprefixed translate-x-0 in the base class wins over the conditional offset and kills the slide',
    ).not.toMatch(/(?<!motion-safe:)\btranslate-x-0\b/)
  })
})
