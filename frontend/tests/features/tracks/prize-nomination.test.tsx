import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrizeMark } from '@/entities/prize/prize-mark'
import {
  draftKey,
  draftTotal,
  isNomination,
  nextPlace,
  type PrizeDraft,
} from '@/features/tracks/track-prize-fields'

describe('a special nomination is a prize without a place', () => {
  it('a prize carrying a place is not read as a nomination', () => {
    expect(isNomination({ place: 1, amount: '100' })).toBe(false)
  })

  it('a prize carrying only a title is read as a nomination', () => {
    expect(isNomination({ title: 'Best design', amount: '100' })).toBe(true)
  })

  it('a nomination never takes a place number, so numbering stays with the ranked prizes', () => {
    const prizes: PrizeDraft[] = [
      { place: 1, amount: '300' },
      { title: 'Best design', amount: '100' },
      { place: 2, amount: '200' },
    ]

    expect(nextPlace(prizes)).toBe(3)
  })

  it('a nomination is keyed apart from a place, so two of them never collide', () => {
    const first = draftKey({ title: '', amount: '' }, 0)
    const second = draftKey({ title: '', amount: '' }, 1)

    expect(first).not.toBe(second)
    expect(draftKey({ place: 1, amount: '' }, 5)).toBe('place-1')
  })

  it('a nomination counts toward the track total, or the reconciliation would lie', () => {
    const total = draftTotal([
      { place: 1, amount: '300' },
      { title: 'Best design', amount: '100' },
    ])

    expect(total).toBe(400)
  })
})

describe('a nomination is marked as itself, not as a place', () => {
  it('a placed prize keeps its medal rank', () => {
    const { container } = render(<PrizeMark place={1} />)

    expect(container.querySelector('[data-prize-rank="GOLD"]')).not.toBeNull()
  })

  it('a nomination shows its title under its own mark, never a place number', () => {
    const { container } = render(<PrizeMark title="Best design" />)

    expect(container.querySelector('[data-prize-rank="NOMINATION"]')).not.toBeNull()
    expect(screen.getByText('Best design')).toBeInTheDocument()
  })
})
