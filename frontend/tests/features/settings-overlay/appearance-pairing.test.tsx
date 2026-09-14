import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const panels = readFileSync(
  join(process.cwd(), 'src/features/settings-overlay/settings-panels.tsx'),
  'utf8',
)
const choice = readFileSync(
  join(process.cwd(), 'src/features/appearance/language-choice.tsx'),
  'utf8',
)
const timezone = readFileSync(
  join(process.cwd(), 'src/shared/ui/primitives/timezone-select/timezone-select.tsx'),
  'utf8',
)

function appearanceRow(): string {
  const start = panels.indexOf("{t('language.label')}")
  const end = panels.indexOf("{t('settings.timezone')}")
  if (start < 0 || end < 0) throw new Error('the appearance cards are missing')
  const before = panels.lastIndexOf('<div', start)
  return panels.slice(before, end)
}

describe('language and time zone stand as one pair', () => {
  it('puts the two cards in a single row rather than stacking them down the panel', () => {
    expect(
      appearanceRow(),
      'two half-empty cards stacked waste the width the panel already has',
    ).toMatch(/sm:flex-row/)
  })

  it('shares the row evenly between them', () => {
    const row = appearanceRow()
    const shares = row.match(/className="flex-1"/g) ?? []

    expect(shares.length, 'both cards take an equal share of the row').toBeGreaterThanOrEqual(1)
  })

  it('lets the time zone control fill its card instead of holding a fixed width', () => {
    expect(
      timezone,
      'a fixed w-72 trigger forces its card wider than the card beside it',
    ).not.toMatch(/'flex w-72 items-center/)
    expect(timezone).toMatch(/'flex w-full items-center/)
  })

  it('stands the two languages beside each other once the card is wide enough', () => {
    expect(choice, 'the languages stacked leave the card taller than the one beside it').toMatch(
      /@\[[\d.]+rem\]:grid-cols-2/,
    )
  })

  it('asks the container, not the window, how much room the languages have', () => {
    expect(
      choice,
      'the panel is a fixed overlay, so a window breakpoint cannot tell how wide the card is',
    ).toMatch(/@container/)
  })

  it('never makes the queried grid its own container, which can never match', () => {
    const fieldset = choice.slice(
      choice.indexOf('<fieldset'),
      choice.indexOf('>', choice.indexOf('<fieldset')),
    )

    expect(fieldset, 'an element cannot answer a container query about its own width').not.toMatch(
      /@container/,
    )
  })

  it('gives a language row the same height as the time zone row', () => {
    expect(choice, 'rows of different heights read as two unrelated cards, not one pair').toMatch(
      /min-h-\[3\.375rem\]/,
    )
  })
})
