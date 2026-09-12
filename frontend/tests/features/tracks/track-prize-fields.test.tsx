import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  draftTotal,
  nextPlace,
  type PrizeDraft,
  TrackPrizeFields,
} from '@/features/tracks/track-prize-fields'
import { i18n } from '@/shared/i18n/config'

describe('places are numbered and totalled', () => {
  it('the next place follows the highest one taken, not the count', () => {
    expect(nextPlace([])).toBe(1)
    expect(nextPlace([{ place: 1, amount: '1' }])).toBe(2)
    expect(nextPlace([{ place: 3, amount: '1' }])).toBe(4)
  })

  it('the total ignores places left blank', () => {
    expect(
      draftTotal([
        { place: 1, amount: '200000' },
        { place: 2, amount: '' },
        { place: 3, amount: '50000' },
      ]),
    ).toBe(250000)
  })
})

function Harness() {
  const [prizes, setPrizes] = useState<PrizeDraft[]>([{ place: 1, amount: '' }])
  return <TrackPrizeFields prizes={prizes} currency="RUB" idPrefix="probe" onChange={setPrizes} />
}

describe('the field itself refuses a fractional amount as it is typed', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('a typed dot never reaches the value, and digits are grouped as they are typed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    const input = screen.getByLabelText(i18n.t('event:place.rankGold'))
    await user.type(input, '1500.50')
    expect((input as HTMLInputElement).value).toBe('150,050')
    expect(input).toHaveAttribute('data-value', '150050')
  })

  it('the running total is shown in whole money, with no kopecks', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    await user.type(screen.getByLabelText(i18n.t('event:place.rankGold')), '150000')
    expect(screen.getByText('150,000 ₽')).toBeTruthy()
  })
})
