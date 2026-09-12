import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { StagesSection } from '@/features/event-card/event-sections'
import type { EventCard } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const stage: EventCard['stages'][number] = {
  id: 'st_1',
  event_id: 'ev_1',
  name: 'Call for applications',
  type: 'SELECTION',
  start_at: '2026-09-01T00:00:00Z',
  end_at: '2026-09-10T00:00:00Z',
  place: { format: 'ONLINE', inherited: false },
  sort_order: 0,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

const registration: EventCard['registration'] = {
  url: 'https://example.com/register',
  state: 'ACTIVE',
  deadline_at: '2026-09-05T00:00:00Z',
}

describe('registration is drawn as a row among the stages', () => {
  it('draws a registration row with its deadline when registration exists', () => {
    renderWithProviders(<StagesSection stages={[]} registration={registration} />)
    expect(screen.getByText(i18n.t('event:stageType.REGISTRATION'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:card.deadline'))).toBeInTheDocument()
  })

  it('says registration is not required when the event has none', () => {
    renderWithProviders(<StagesSection stages={[stage]} registration={undefined} />)
    expect(screen.getByText(i18n.t('event:stageType.REGISTRATION'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:card.noRegistration'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:card.noStages'))).not.toBeInTheDocument()
  })

  it('lists the registration row alongside real stages, not instead of them', () => {
    renderWithProviders(<StagesSection stages={[stage]} registration={registration} />)
    expect(screen.getByText(i18n.t('event:stageType.REGISTRATION'))).toBeInTheDocument()
    expect(screen.getByText('Call for applications')).toBeInTheDocument()
  })

  it('keeps the empty-stages message when there is truly nothing to show', () => {
    renderWithProviders(<StagesSection stages={[]} />)
    expect(screen.getByText(i18n.t('event:card.noStages'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:card.noRegistration'))).toBeInTheDocument()
  })

  it('shows the disabled note only when registration is disabled', () => {
    renderWithProviders(
      <StagesSection stages={[]} registration={{ ...registration, state: 'DISABLED' }} />,
    )
    expect(screen.getByText(i18n.t('event:card.disabled'))).toBeInTheDocument()
  })
})
