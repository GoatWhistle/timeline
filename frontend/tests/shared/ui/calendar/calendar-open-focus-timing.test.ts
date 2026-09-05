import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  join(process.cwd(), 'src', 'shared', 'ui', 'forms', 'calendar', 'date-picker.tsx'),
  'utf8',
)

describe('the calendar panel earns focus only once it can actually receive it', () => {
  it('gates the move-focus-in effect on placement, not on open alone', () => {
    const effectStart = SOURCE.indexOf('useEffect(() => {\n    if (placement === null) return')
    expect(effectStart).toBeGreaterThan(-1)
  })

  it('defers the focus call past the current frame instead of firing it synchronously', () => {
    const effectStart = SOURCE.indexOf('if (placement === null) return')
    expect(effectStart).toBeGreaterThan(-1)
    const block = SOURCE.slice(effectStart, effectStart + 400)
    expect(block).toMatch(/window\.setTimeout|requestAnimationFrame/)
  })

  it('checks the real DOM panel is not already holding focus before moving it', () => {
    const effectStart = SOURCE.indexOf('if (placement === null) return')
    const block = SOURCE.slice(effectStart, effectStart + 400)
    expect(block).toContain('panel.contains(document.activeElement)')
  })
})
