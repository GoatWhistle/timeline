import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const SCHEDULE = join(SRC, 'features/schedule/ui')

const BARS = [
  join(SCHEDULE, 'schedule-bar/schedule-bar.tsx'),
  join(SCHEDULE, 'wrapped-grid/wrapped-bar.tsx'),
]

const named = (file: string) => file.replaceAll('\\', '/').split('/features/').pop() ?? file

describe('a schedule bar shows its card at the pointer, not at the middle of the bar', () => {
  it('never makes the bar itself the element the card is positioned against', () => {
    for (const file of BARS) {
      const source = readFileSync(file, 'utf8')
      const trigger = source.indexOf('<TooltipTrigger')
      expect(trigger, named(file)).toBeGreaterThan(-1)
      const wrapped = source.slice(trigger, source.indexOf('</TooltipTrigger>', trigger))
      expect(wrapped, named(file)).toContain('anchorRef')
      expect(wrapped, named(file)).not.toContain('data-schedule-item')
    }
  })

  it('moves that anchor with the pointer, so a bar spanning the screen still points at the cursor', () => {
    for (const file of BARS) {
      const source = readFileSync(file, 'utf8')
      expect(source, named(file)).toContain('onPointerMove={onPointerMove}')
      expect(source, named(file)).toContain('usePointerAnchor')
    }

    const hook = readFileSync(join(SCHEDULE, 'schedule-bar/use-pointer-anchor.ts'), 'utf8')
    expect(hook).toContain('event.clientX')
    expect(hook).toContain('event.clientY')
  })

  it('falls back to the bar when there is no pointer, so keyboard focus still places the card', () => {
    const hook = readFileSync(join(SCHEDULE, 'schedule-bar/use-pointer-anchor.ts'), 'utf8')
    expect(hook).toContain('onFocus')
    expect(hook).toMatch(/setFromPointer\(false\)/)

    for (const file of BARS) {
      const source = readFileSync(file, 'utf8')
      expect(source, named(file)).toContain("fromPointer ? styles.anchorPoint : styles.anchorBar")
    }
  })

  it('keeps the card clear of the window edges instead of letting it run off', () => {
    for (const file of BARS) {
      const source = readFileSync(file, 'utf8')
      expect(source, named(file)).toContain('collisionPadding')
    }
  })

  it('gives the pointer anchor no size, so the card cannot cover the bar it describes', () => {
    for (const styles of [
      join(SCHEDULE, 'schedule-bar/schedule-bar.module.css'),
      join(SCHEDULE, 'wrapped-grid/wrapped-bar.module.css'),
    ]) {
      const source = readFileSync(styles, 'utf8')
      const block = source.slice(source.indexOf('.anchorPoint'))
      expect(block, named(styles)).toContain('width: 0')
      expect(block, named(styles)).toContain('height: 0')
    }
  })
})
