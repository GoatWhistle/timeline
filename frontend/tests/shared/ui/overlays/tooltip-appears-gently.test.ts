import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/shared/ui/overlays/tooltip.tsx'), 'utf8')

describe('a tooltip fades in however it was opened', () => {
  it('animates the instant opening as well as the delayed one', () => {
    expect(source, 'a tooltip that only eases on delayed-open snaps when it opens at once').toMatch(
      /data-\[state=instant-open\]:motion-safe:animate-in/,
    )
  })

  it('keeps the delayed opening eased too', () => {
    expect(source).toMatch(/data-\[state=delayed-open\]:motion-safe:animate-in/)
  })

  it('gates the movement behind the reduced-motion preference', () => {
    const lines = source.split('\n').filter((line) => line.includes('animate-'))

    for (const line of lines) {
      expect(line, `an ungated animation moves against a reduced-motion request: ${line}`).toMatch(
        /motion-safe:/,
      )
    }
  })
})
