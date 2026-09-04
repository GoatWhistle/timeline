import { screen, within } from '@testing-library/react'
import { branch } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { TEAM_SIZE_MAX, TEAM_SIZE_MIN } from '@/entities/event/event-form.schema'
import { fixMoscowClock, goToStage } from './event-form.harness'

fixMoscowClock()

const DROPPED = [
  'teamSizeHint',
  'teamSizeSummary',
  'teamSizeSummary_one',
  'teamSizeSummary_few',
  'teamSizeSummary_many',
  'teamSizeSummary_other',
  'teamSizeValue',
  'teamSizeValue_one',
  'teamSizeValue_few',
  'teamSizeValue_many',
  'teamSizeValue_other',
]

function ticks(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-tick]')).map(
    (node) => node.dataset.tick ?? '',
  )
}

async function openPrizeStage() {
  const { user } = renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
  await goToStage(user, 'prize')
  return user
}

describe('the team size is a named section and a slider with tick marks', () => {
  it('draws a notch on the rail for every whole count, inside the track', async () => {
    await openPrizeStage()
    const track = screen.getByTestId('event-team-size-track')
    const marks = Array.from(track.querySelectorAll<HTMLElement>('[data-tick-mark]'))
    expect(marks.map((node) => node.dataset.tickMark)).toEqual(
      Array.from({ length: TEAM_SIZE_MAX - TEAM_SIZE_MIN + 1 }, (_, i) =>
        String(TEAM_SIZE_MIN + i),
      ),
    )
    for (const mark of marks) expect(track.contains(mark)).toBe(true)
  })

  it('keeps the numerals out of the rail, in the row beneath it', async () => {
    await openPrizeStage()
    const track = screen.getByTestId('event-team-size-track')
    for (const label of document.querySelectorAll('[data-tick]')) {
      expect(track.contains(label)).toBe(false)
    }
  })

  it('hides both the notches and the numerals from assistive technology', async () => {
    await openPrizeStage()
    for (const selector of ['[data-tick-mark]', '[data-tick]']) {
      const node = document.querySelector(selector)
      expect(node?.closest('[aria-hidden="true"]'), selector).not.toBeNull()
    }
  })

  it('marks every whole count between the bounds', async () => {
    await openPrizeStage()
    const expected = []
    for (let value = TEAM_SIZE_MIN; value <= TEAM_SIZE_MAX; value += 1) {
      expected.push(String(value))
    }
    expect(ticks()).toEqual(expected)
  })

  it('marks the ticks inside the chosen range apart from those outside it', async () => {
    const user = await openPrizeStage()
    const low = screen.getAllByRole('slider')[0]
    if (!low) throw new Error('no handle')
    low.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    const inside = Array.from(document.querySelectorAll<HTMLElement>('[data-tick]'))
      .filter((node) => node.dataset.tickInside === 'true')
      .map((node) => node.dataset.tick)
    expect(inside).toEqual(['3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('carries no hint, no summary and no worded value beside the slider', async () => {
    await openPrizeStage()
    const section = document.getElementById('event-team-size-min')?.closest('div.flex.flex-col')
    expect(section).not.toBeNull()
    expect(document.getElementById('event-team-size-min-hint')).toBeNull()
    const region = within(section as HTMLElement)
    expect(region.queryByText(/member/i)).toBeNull()
    expect(region.queryByText(/1-10/)).toBeNull()
  })

  it('announces each handle by a plain number, not by a worded count', async () => {
    await openPrizeStage()
    const [low, high] = screen.getAllByRole('slider')
    expect(low).toHaveAttribute('aria-valuetext', String(TEAM_SIZE_MIN))
    expect(high).toHaveAttribute('aria-valuetext', String(TEAM_SIZE_MAX))
  })

  it('keeps both handles reachable and named for a screen reader', async () => {
    const user = await openPrizeStage()
    const [low, high] = screen.getAllByRole('slider')
    expect(low).toHaveAccessibleName()
    expect(high).toHaveAccessibleName()
    low?.focus()
    await user.tab()
    expect(high).toHaveFocus()
  })
})

describe('the retired team-size wording is gone from both dictionaries', () => {
  it('keeps no key that only fed the removed text', () => {
    for (const locale of ['ru', 'en'] as const) {
      const form = branch(locale, 'event', 'form')
      for (const key of DROPPED) {
        expect(form[key], `${locale} form.${key}`).toBeUndefined()
      }
    }
  })

  it('still names the section itself in both dictionaries', () => {
    for (const locale of ['ru', 'en'] as const) {
      expect(branch(locale, 'event', 'form').teamSize).toBeTypeOf('string')
    }
  })
})

describe('the kind choice carries no caption under it', () => {
  it('offers the two kinds and nothing explaining them', () => {
    renderWithProviders(<EventForm submitLabel="Save" onSubmit={vi.fn()} />)
    const choice = screen.getByTestId('kind')
    const options = choice.querySelectorAll('[data-kind-option]')
    expect(options).toHaveLength(2)
    for (const option of options) {
      expect(option.textContent?.trim()).toMatch(/^(Hackathon|Meetup)$/)
    }
  })

  it('keeps no kind caption in either dictionary', () => {
    for (const locale of ['ru', 'en'] as const) {
      expect(branch(locale, 'event', 'form').kindHint).toBeUndefined()
    }
  })
})
