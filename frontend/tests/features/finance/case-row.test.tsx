import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { CaseRow } from '@/features/finance/case-row'
import type { EventCaseResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

function item(patch: Partial<EventCaseResponse> = {}): EventCaseResponse {
  const base = {
    id: 'cs_1',
    event_id: 'ev_1',
    case_no: 1,
    name: 'Traffic light scheduling',
    partner: 'City transport authority',
    track_id: 'tr_1',
    track_name: 'Smart city',
    prize_amount: '50000',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  }
  return { ...base, ...patch } as EventCaseResponse
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('a case carries its partner, its track and its prize', () => {
  it('names the partner, the track and the prize when it has all three', () => {
    const { container } = renderWithProviders(<CaseRow item={item()} currency="RUB" />)
    const row = container.querySelector('[data-case-row]') as HTMLElement
    expect(within(row).getByText('Traffic light scheduling')).toBeInTheDocument()
    expect(within(row).getByText('City transport authority')).toBeInTheDocument()
    expect(within(row).getByText('Smart city')).toBeInTheDocument()
    expect(within(row).getByText('50,000 ₽')).toBeInTheDocument()
  })

  it('says a case without a track belongs to no track rather than leaving a gap', () => {
    renderWithProviders(
      <CaseRow item={item({ track_id: undefined, track_name: undefined })} currency="RUB" />,
    )
    expect(screen.getByText('No track')).toBeInTheDocument()
  })

  it('says a case without a prize has none rather than showing a zero', () => {
    renderWithProviders(<CaseRow item={item({ prize_amount: undefined })} currency="RUB" />)
    expect(screen.getByText('No prize')).toBeInTheDocument()
    expect(screen.queryByText('0 ₽')).toBeNull()
  })

  it('offers edit and delete only when the reader may change the case', () => {
    const { container, rerender } = renderWithProviders(<CaseRow item={item()} currency="RUB" />)
    expect(container.querySelectorAll('button')).toHaveLength(0)

    rerender(<CaseRow item={item()} currency="RUB" onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByLabelText('Edit the case Traffic light scheduling')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete the case Traffic light scheduling')).toBeInTheDocument()
  })
})
