import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { SessionPolicyCard } from '@/features/device-list/session-policy-card'
import { i18n } from '@/shared/i18n/config'

const POLICY = { idle_days: 180, min_days: 1, max_days: 365, default_days: 180 }

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderCard(policy: Record<string, unknown> = POLICY) {
  const result = renderWithProviders(<SessionPolicyCard />)
  result.queryClient.setQueryData(['session-policy'], policy)
  return result
}

describe('the idle cutoff is the reader own setting', () => {
  it('asks for the period with a plain number, not a stepper', async () => {
    renderCard()

    const field = await screen.findByRole('spinbutton')

    expect(
      field.className,
      'the up and down arrows add nothing to a field measured in days',
    ).toMatch(/appearance:textfield/)
  })

  it('takes the bounds from the server rather than spelling them out itself', async () => {
    renderCard({ idle_days: 30, min_days: 7, max_days: 90, default_days: 60 })

    const field = await screen.findByRole('spinbutton')
    expect(field).toHaveAttribute('min', '7')
    expect(field).toHaveAttribute('max', '90')
  })

  it('sets the unit beside the field on the field own centre line', async () => {
    renderCard()

    const field = await screen.findByRole('spinbutton')
    const unit = field.nextElementSibling

    if (!(unit instanceof HTMLElement)) throw new Error('the unit label is missing')
    expect(unit.textContent?.trim()).toBe(i18n.t('common:devices.policyDaysLabel'))
    expect(
      unit.className,
      'a label left at the top of the row rides above the middle of the field it names',
    ).toMatch(/items-center/)

    const row = unit.parentElement
    if (!(row instanceof HTMLElement)) throw new Error('the row is missing')
    expect(
      row.className,
      'the row itself must centre its children, or the label drifts off the field centre line',
    ).toMatch(/items-center/)
  })

  it('keeps the unit on one line in every language it is written in', async () => {
    for (const language of ['en', 'ru']) {
      await i18n.changeLanguage(language)
      const word = i18n.t('common:devices.policyDaysLabel')
      expect(word.trim(), `${language} leaves the unit empty`).not.toBe('')
      expect(
        word.trim().split(/\s+/),
        `${language} spells the unit in several words, which wraps beside a narrow field`,
      ).toHaveLength(1)
    }
    await i18n.changeLanguage('en')
  })

  it('shows the period the account currently keeps', async () => {
    renderCard()

    await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(180))
  })
})
