import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CARD = join(process.cwd(), 'src/features/event-card/event-card.tsx')

function source(): string {
  return readFileSync(CARD, 'utf8')
}

describe('the event page puts the facts where the reader arrives, not at the end', () => {
  it('the facts panel is written before the long column of sections', () => {
    const text = source()
    const aside = text.indexOf('<aside')
    const sections = text.indexOf('<RegistrationSection')
    expect(aside).toBeGreaterThan(-1)
    expect(sections).toBeGreaterThan(-1)
    expect(aside).toBeLessThan(sections)
  })

  it('the desktop column keeps the facts on the right despite that source order', () => {
    const text = source()
    expect(text).toContain('xl:col-start-2')
    expect(text).toContain('xl:col-start-1')
  })

  it('the facts stay sticky beside the scrolling column on a wide screen', () => {
    expect(source()).toContain('xl:sticky')
  })
})

describe('the cover earns real height on a phone instead of a letterbox strip', () => {
  it('the cover is a picture on a phone and a band only when there is width for one', () => {
    const text = source()
    expect(text).toContain('aspect-[16/9]')
    expect(text).toContain('sm:aspect-[3/1]')
    expect(text).toContain('xl:aspect-[4/1]')
  })

  it('the widescreen band is never the phone default', () => {
    const text = source()
    const bare = text.match(/(?<![:[])aspect-\[4\/1\]/g)
    expect(bare).toBeNull()
  })
})
