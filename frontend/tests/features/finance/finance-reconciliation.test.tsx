import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { FinanceReconciliation } from '@/features/finance/finance-reconciliation'
import type { EventFinanceResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

function summary(patch: Partial<EventFinanceResponse> = {}): EventFinanceResponse {
  return {
    event_id: 'ev_1',
    prize_pool: '10000',
    prize_currency: 'USD',
    tracks: [],
    cases: [],
    distributed_tracks: '6000',
    distributed_cases: '1000',
    distributed: '7000',
    nominations: '0',
    unallocated: '4000',
    discrepancy: '3000',
    discrepancy_known: true,
    ...patch,
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the reconciliation states the discrepancy as a fact', () => {
  it('names what tracks and what cases took, not only the total', () => {
    renderWithProviders(<FinanceReconciliation finance={summary()} />)
    expect(screen.getByText('$6,000')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
  })

  it('shows a surplus as a reserve', () => {
    const { container } = renderWithProviders(<FinanceReconciliation finance={summary()} />)
    expect(screen.getByText('$3,000')).toBeInTheDocument()
    expect(container.querySelector('[data-discrepancy-tone="reserve"]')).not.toBeNull()
    expect(screen.getByText('Reserve')).toBeInTheDocument()
  })

  it('shows a shortfall as an overspend rather than hiding it', () => {
    const { container } = renderWithProviders(
      <FinanceReconciliation
        finance={summary({ distributed: '12000', discrepancy: '-2000', unallocated: '-1000' })}
      />,
    )
    expect(container.querySelector('[data-discrepancy-tone="overspend"]')).not.toBeNull()
    expect(screen.getByText('Overspend')).toBeInTheDocument()
  })

  it('shows a zero discrepancy instead of dropping the line', () => {
    const { container } = renderWithProviders(
      <FinanceReconciliation finance={summary({ discrepancy: '0' })} />,
    )
    expect(container.querySelector('[data-discrepancy-tone="balanced"]')).not.toBeNull()
    expect(screen.getByText('Balanced')).toBeInTheDocument()
  })

  it('says there is nothing to reconcile when the event declares no pool', () => {
    renderWithProviders(
      <FinanceReconciliation
        finance={summary({
          prize_pool: undefined,
          unallocated: undefined,
          discrepancy: undefined,
          discrepancy_known: false,
        })}
      />,
    )
    expect(screen.queryByText('Reserve')).toBeNull()
    expect(screen.queryByText('Overspend')).toBeNull()
    expect(
      screen.getByText(/declares no prize pool, so there is nothing to reconcile/),
    ).toBeInTheDocument()
  })
})
