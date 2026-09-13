import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventFeedBell } from '@/features/event-feed-bell/event-feed-bell'
import { i18n } from '@/shared/i18n/config'

let feedFails = true

vi.mock('@/entities/event-feed/event-feed.queries', () => ({
  unreadCountQueryOptions: {
    queryKey: ['feed-unread-test'],
    queryFn: () => Promise.resolve({ unread: 0 }),
    retry: false,
  },
  eventFeedQueryOptions: () => ({
    queryKey: ['feed-items-test', feedFails],
    queryFn: () =>
      feedFails
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({
            items: [],
            meta: { page: 1, page_size: 10, total: 0, has_next: false },
          }),
    retry: false,
  }),
  useMarkFeedRead: () => ({ mutate: vi.fn() }),
}))

async function openPanel(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: i18n.t('notification:feed.open') }))
  await waitFor(() =>
    expect(screen.getByText(i18n.t('notification:feed.title'))).toBeInTheDocument(),
  )
}

beforeEach(() => {
  feedFails = true
})

describe('the event feed bell never passes a failure off as a quiet feed', () => {
  it('says the feed could not be loaded when the request fails', async () => {
    const rendered = renderWithProviders(<EventFeedBell />)
    await openPanel(rendered.user)

    await waitFor(() =>
      expect(screen.getByText(i18n.t('notification:feed.loadFailed'))).toBeInTheDocument(),
    )
    expect(screen.queryByText(i18n.t('notification:feed.empty'))).toBeNull()
  })

  it('still says nothing has happened when the feed is genuinely empty', async () => {
    feedFails = false
    const rendered = renderWithProviders(<EventFeedBell />)
    await openPanel(rendered.user)

    await waitFor(() =>
      expect(screen.getByText(i18n.t('notification:feed.empty'))).toBeInTheDocument(),
    )
    expect(screen.queryByText(i18n.t('notification:feed.loadFailed'))).toBeNull()
  })
})
