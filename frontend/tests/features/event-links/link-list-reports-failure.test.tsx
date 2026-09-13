import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkList } from '@/features/event-links/ui/link-list/link-list'
import { i18n } from '@/shared/i18n/config'

let linksFail = true

vi.mock('@/entities/link/link.queries', () => ({
  eventLinksQuery: (eventId: string) => ({
    queryKey: ['event-links-test', eventId, linksFail],
    queryFn: () => (linksFail ? Promise.reject(new Error('boom')) : Promise.resolve({ items: [] })),
    retry: false,
  }),
}))

beforeEach(() => {
  linksFail = true
})

describe('the event link list never passes a failure off as an empty list', () => {
  it('says the links could not be loaded when the request fails', async () => {
    renderWithProviders(<LinkList eventId="ev_gma9hq8a96q5" />)

    await waitFor(() =>
      expect(screen.getByText(i18n.t('event:links.loadFailed'))).toBeInTheDocument(),
    )
    expect(screen.queryByText(i18n.t('event:links.empty'))).toBeNull()
  })

  it('still says there are no links when the event genuinely has none', async () => {
    linksFail = false
    renderWithProviders(<LinkList eventId="ev_gma9hq8a96q5" />)

    await waitFor(() => expect(screen.getByText(i18n.t('event:links.empty'))).toBeInTheDocument())
    expect(screen.queryByText(i18n.t('event:links.loadFailed'))).toBeNull()
  })
})
