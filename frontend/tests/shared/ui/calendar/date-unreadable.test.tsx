import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { type Civil, EMPTY_CIVIL } from '@/shared/datetime/civil'
import { i18n } from '@/shared/i18n/config'
import { MomentField } from '@/shared/ui/forms/calendar/moment-field'

function Harness({ initial = EMPTY_CIVIL }: { initial?: Civil }) {
  const [value, setValue] = useState<Civil>(initial)
  return (
    <div>
      <MomentField id="when" label="When" value={value} required onChange={setValue} />
      <button type="button">elsewhere</button>
    </div>
  )
}

function dateBox(): HTMLInputElement {
  const input = document.getElementById('when')
  if (!(input instanceof HTMLInputElement)) throw new Error('no date field')
  return input
}

async function typeThenLeave(text: string) {
  const { user } = renderWithProviders(<Harness />)
  await user.click(dateBox())
  await user.keyboard(text)
  await user.click(screen.getByRole('button', { name: 'elsewhere' }))
  return user
}

describe('a date that cannot exist is named, not silently swallowed', () => {
  it('says the date could not be read instead of blanking the field without a word', async () => {
    await typeThenLeave('31.02.2026')

    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('errors:field.invalid_format'))
  })

  it('keeps what was typed on screen so the correction is an edit, not a retype', async () => {
    await typeThenLeave('31.02.2026')

    expect(dateBox()).toHaveValue('31.02.2026')
  })

  it('marks the date box as invalid so the failure is not colour alone', async () => {
    await typeThenLeave('31.02.2026')

    expect(dateBox()).toHaveAttribute('aria-invalid', 'true')
  })

  it('ties the message to the box it blames', async () => {
    await typeThenLeave('31.02.2026')

    const describedBy = dateBox().getAttribute('aria-describedby')
    expect(describedBy).toBe('when-error')
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('could not be read')
  })

  it.each([
    ['the thirtieth of February', '30.02.2026'],
    ['the thirty-first of April', '31.04.2026'],
    ['a leap day in a common year', '29.02.2026'],
  ])('refuses %s', async (_name, typed) => {
    await typeThenLeave(typed)

    expect(screen.getByRole('alert')).toHaveTextContent('could not be read')
  })

  it('accepts the leap day of a year that has one', async () => {
    await typeThenLeave('29.02.2028')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(dateBox()).toHaveValue('29.02.2028')
  })

  it('withdraws the complaint once the date is corrected', async () => {
    const user = await typeThenLeave('31.02.2026')
    expect(screen.getByRole('alert')).toBeTruthy()

    await user.tripleClick(dateBox())
    await user.keyboard('28.02.2026')

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says nothing when the field is simply left empty', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(dateBox())
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
