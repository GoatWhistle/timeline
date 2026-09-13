import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InboxBell } from '@/features/inbox-bell/inbox-bell'
import { i18n } from '@/shared/i18n/config'

let previewFails = true

vi.mock('@/entities/inbox/inbox.queries', () => ({
  inboxUnreadCountQueryOptions: {
    queryKey: ['inbox-unread-bell-test'],
    queryFn: () => Promise.resolve({ unread: 0 }),
    retry: false,
  },
  inboxPreviewQueryOptions: () => ({
    queryKey: ['inbox-preview-bell-test', previewFails],
    queryFn: () =>
      previewFails
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({
            items: [],
            meta: { page: 1, page_size: 5, total: 0, has_next: false },
          }),
    retry: false,
  }),
}))

async function openPanel(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: i18n.t('notification:inbox.bell.open') }))
  await waitFor(() =>
    expect(screen.getByText(i18n.t('notification:inbox.bell.title'))).toBeInTheDocument(),
  )
}

beforeEach(() => {
  previewFails = true
})

describe('the notification bell never passes a failure off as an empty inbox', () => {
  it('says the notifications could not be loaded when the request fails', async () => {
    const rendered = renderWithProviders(<InboxBell />)
    await openPanel(rendered.user)

    await waitFor(() =>
      expect(screen.getByText(i18n.t('notification:inbox.bell.loadFailed'))).toBeInTheDocument(),
    )
    expect(screen.queryByText(i18n.t('notification:inbox.bell.empty'))).toBeNull()
  })

  it('still says the inbox is empty when the request genuinely returns nothing', async () => {
    previewFails = false
    const rendered = renderWithProviders(<InboxBell />)
    await openPanel(rendered.user)

    await waitFor(() =>
      expect(screen.getByText(i18n.t('notification:inbox.bell.empty'))).toBeInTheDocument(),
    )
    expect(screen.queryByText(i18n.t('notification:inbox.bell.loadFailed'))).toBeNull()
  })
})
