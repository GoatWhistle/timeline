import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReminderChip } from '@/features/profile/reminder-schedule-card/reminder-chip'

function chip(day: number) {
  render(
    <ReminderChip
      id={`d${day}`}
      label={`day ${day}`}
      checked={false}
      disabled={false}
      onChange={() => {}}
    >
      {day}
    </ReminderChip>,
  )
  return screen.getByRole('button', { name: `day ${day}` })
}

function tokens(element: HTMLElement) {
  return element.className.split(/\s+/)
}

describe('a reminder day is a circle whatever number it holds', () => {
  it('gives every day one fixed square box, so the round corners close into a circle', () => {
    for (const day of [1, 14]) {
      const classes = tokens(chip(day))
      expect(classes, `day ${day} must fix both sides at once`).toContain('size-9')
      expect(classes, `day ${day} must round fully`).toContain('rounded-pill')
    }
  })

  it('lets no padding or minimum width stretch a wider number into an oval', () => {
    for (const day of [1, 14]) {
      const stretching = tokens(chip(day)).filter((c) => /^(px|py|p|min-w|min-h|w|h)-/.test(c))
      expect(stretching, `day ${day} is sized by its content again`).toEqual([])
    }
  })
})
