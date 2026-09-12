import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  inboxPreviewQueryOptions,
  inboxUnreadCountQueryOptions,
} from '@/entities/inbox/inbox.queries'
import { InboxBell } from '@/features/inbox-bell/inbox-bell'
import type { InboxItemResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const ITEM: InboxItemResponse = {
  id: 'ib_42ej2s5gh7e8',
  kind: 'notification.primary',
  title: 'Registration required for Timeline Hack',
  body_md: 'Deadline: **12.09.2026 18:00** (Europe/Moscow)',
  actions: [{ kind: 'OPEN', href: 'ev_gma9hq8a96q5' }],
  logical_key: 'required:9f1c:av1:rv1:cv1:chEMAIL',
  created_at: '2026-09-03T11:40:00Z',
  subject: { kind: 'event', id: 'ev_gma9hq8a96q5' },
} as unknown as InboxItemResponse

function page(items: InboxItemResponse[]) {
  return { items, meta: { page: 1, page_size: 5, total: items.length, has_next: false } }
}

function renderBell({
  unread = 0,
  items = [ITEM],
}: {
  unread?: number
  items?: InboxItemResponse[]
} = {}) {
  const rendered = renderWithProviders(<InboxBell />)
  rendered.queryClient.setQueryData(inboxUnreadCountQueryOptions.queryKey, { unread })
  rendered.queryClient.setQueryData(inboxPreviewQueryOptions().queryKey, page(items))
  return rendered
}

async function openPanel(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: i18n.t('notification:inbox.bell.open') }))
  await waitFor(() =>
    expect(screen.getByText(i18n.t('notification:inbox.bell.title'))).toBeInTheDocument(),
  )
}

describe('InboxBell', () => {
  it('shows the unread count as a badge', async () => {
    renderBell({ unread: 3 })
    expect(await screen.findByText('3')).toBeInTheDocument()
  })

  it('shows no badge when everything is read', async () => {
    renderBell({ unread: 0 })
    await waitFor(() => expect(screen.queryByText('0')).not.toBeInTheDocument())
  })

  it('caps the badge at 99+', async () => {
    renderBell({ unread: 240 })
    expect(await screen.findByText('99+')).toBeInTheDocument()
  })

  it('shows the title and a body preview for each item', async () => {
    const { user } = renderBell()
    await openPanel(user)
    expect(screen.getByText('Registration required for Timeline Hack')).toBeInTheDocument()
    expect(screen.getByText(/deadline: 12\.09\.2026 18:00/i)).toBeInTheDocument()
  })

  it('shows the empty state with no items', async () => {
    const { user } = renderBell({ items: [] })
    await openPanel(user)
    expect(screen.getByText(i18n.t('notification:inbox.bell.empty'))).toBeInTheDocument()
  })

  it('links to the full inbox page', async () => {
    const { user } = renderBell()
    await openPanel(user)
    const viewAll = screen.getByRole('menuitem', {
      name: i18n.t('notification:inbox.bell.viewAll'),
    })
    expect(viewAll).toHaveAttribute('href', '/inbox')
  })

  it('links each item to its event', async () => {
    const { user } = renderBell()
    await openPanel(user)
    const link = screen.getByRole('menuitem', {
      name: /registration required for timeline hack/i,
    })
    expect(link).toHaveAttribute('href', '/events/ev_gma9hq8a96q5')
  })
})
