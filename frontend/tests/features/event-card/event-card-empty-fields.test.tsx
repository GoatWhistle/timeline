import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { ParticipationFigures } from '@/features/event-card/event-card'
import type { EventCard } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const source = readFileSync(
  resolve(process.cwd(), 'src/features/event-card/event-card.tsx'),
  'utf8',
)

const base: EventCard = {
  event: {
    id: 'ev_1',
    title: 'Northwind Voice Agents Sprint',
    kind: 'HACKATHON',
    format: 'ONLINE',
    origin: 'RU',
    effective_format: 'ONLINE',
    start_at: '2026-09-01T00:00:00Z',
    end_at: '2026-10-01T00:00:00Z',
    state: 'ACTIVE',
    tracks: [],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  stages: [],
  can_mark_done: false,
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('a field the event does not fill is not drawn at all', () => {
  it('draws nothing when neither the role nor the next stage is known', () => {
    const { container } = renderWithProviders(<ParticipationFigures card={base} />)
    expect(container.firstChild).toBeNull()
  })

  it('never leaves a caption standing over a dash', () => {
    const { container } = renderWithProviders(<ParticipationFigures card={base} />)
    expect(container.textContent).not.toContain('—')
    expect(screen.queryByText(i18n.t('event:card.teamRole'))).toBeNull()
    expect(screen.queryByText(i18n.t('event:card.nextStage'))).toBeNull()
  })

  it('draws the role alone when only the role is known', () => {
    renderWithProviders(<ParticipationFigures card={{ ...base, team_role: 'Backend' }} />)
    expect(screen.getByText(i18n.t('event:card.teamRole'))).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:card.nextStage'))).toBeNull()
  })

  it('draws the next stage alone when only the next stage is known', () => {
    renderWithProviders(
      <ParticipationFigures
        card={{
          ...base,
          next_stage: {
            id: 'st_1',
            name: 'Call for applications',
            type: 'REGISTRATION',
            start_at: '2026-09-01T09:00:00Z',
            end_at: '2026-09-25T18:00:00Z',
          },
        }}
      />,
    )
    expect(screen.getByText(i18n.t('event:card.nextStage'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:card.teamRole'))).toBeNull()
  })
})

describe('the header of the page names the event and nothing else', () => {
  it('gives the page header no subtitle to carry the organizer and the dates', () => {
    const header = source.slice(source.indexOf('<PageHeader'), source.indexOf('<EventCover'))
    expect(header).not.toContain('description=')
    expect(header).not.toContain('event.organizer')
    expect(header).not.toContain('formatDate(event.start_at)')
  })
})

describe('the description reads as description, not as a field called description', () => {
  it('prints the description without repeating the word over it', () => {
    const body = source.slice(source.indexOf('{event.description &&'))
    expect(body).toContain('{event.description}')
    expect(body).not.toContain("t('card.description')")
  })
})
