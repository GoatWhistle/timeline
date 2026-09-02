import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryItem } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

let items: HistoryItem[] = []

vi.mock('@/entities/personal/history.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    historyQuery: (params: Record<string, unknown>) =>
      queryOptions({
        queryKey: ['personal-history', params],
        queryFn: () => ({
          items,
          meta: { page: 1, page_size: 20, total: items.length, has_next: false },
        }),
        retry: false,
      }),
  }
})

const { HistoryPage } = await import('@/features/personal-history/history')

function entry(over: Partial<HistoryItem> = {}): HistoryItem {
  return {
    event_id: 'ev_gma9hq8a96q5',
    title: 'National event',
    kind: 'HACKATHON',
    start_at: '2026-03-01T09:00:00Z',
    end_at: '2026-03-03T18:00:00Z',
    joined: true,
    team_role: 'Backend developer',
    tasks_done: 9,
    tasks_total: 12,
    artifacts: [],
    ...over,
  } as HistoryItem
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  items = []
})

describe('the history screen', () => {
  it('explains the emptiness in the same language as the rest', async () => {
    renderWithProviders(<HistoryPage />)

    expect(await screen.findByText(i18n.t('event:personal.history.empty'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:personal.history.emptyHint'))).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: i18n.t('event:personal.history.empty') }),
    ).toBeInTheDocument()
  })

  it('lists the events taken part in with their task counts', async () => {
    items = [entry()]
    renderWithProviders(<HistoryPage />)

    expect(await screen.findByRole('link', { name: 'National event' })).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('event:personal.history.tasks', { done: 9, total: 12 })),
    ).toBeInTheDocument()
  })

  it('says plainly that no outcome is recorded rather than inventing one', async () => {
    items = [entry()]
    renderWithProviders(<HistoryPage />)

    expect(await screen.findByText(i18n.t('event:personal.history.noOutcome'))).toBeInTheDocument()
  })

  it('names the recorded outcome when there is one', async () => {
    items = [
      entry({
        outcome: {
          event_id: 'ev_gma9hq8a96q5',
          outcome: 'WINNER',
          place: 1,
          prize: 'Jury award',
          track: '',
          note: '',
          created_at: '2026-03-04T00:00:00Z',
          updated_at: '2026-03-04T00:00:00Z',
        },
      }),
    ]
    renderWithProviders(<HistoryPage />)

    expect(
      await screen.findByText(i18n.t('event:personal.outcome.value.WINNER')),
    ).toBeInTheDocument()
    expect(screen.getByText('Jury award')).toBeInTheDocument()
  })

  it('links the submissions it carries', async () => {
    items = [
      entry({
        artifacts: [
          {
            id: 'ar_1',
            event_id: 'ev_gma9hq8a96q5',
            kind: 'REPOSITORY',
            url: 'https://github.com/me/thing',
            title: 'Our repo',
            submitted_at: '',
            sort_order: 0,
            created_at: '2026-03-04T00:00:00Z',
            updated_at: '2026-03-04T00:00:00Z',
          },
        ],
      }),
    ]
    renderWithProviders(<HistoryPage />)

    expect(await screen.findByRole('link', { name: /Our repo/ })).toHaveAttribute(
      'href',
      'https://github.com/me/thing',
    )
  })
})
