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

  it('shows the period the account currently keeps', async () => {
    renderCard()

    await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(180))
  })
})
