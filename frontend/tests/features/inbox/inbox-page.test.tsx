import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InboxPage } from '@/features/inbox/inbox-page'
import type { InboxItemResponse, InboxPage as InboxPageResponse } from '@/shared/api/types.gen'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

const { toastFn } = vi.hoisted(() => ({
  toastFn: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: toastFn }))

const markReadMutate = vi.fn()
const deleteItemMutate = vi.fn((_id: string, options?: { onSuccess?: () => void }) => {
  options?.onSuccess?.()
})
const restoreItemMutate = vi.fn()
const deleteInboxMutate = vi.fn()
const markRegisteredMutate = vi.fn(
  (_id: string, options?: { onSuccess?: () => void; onError?: () => void }) => {
    options?.onSuccess?.()
  },
)

let queryData: InboxPageResponse | undefined

vi.mock('@/entities/inbox/inbox.queries', () => ({
  inboxQueryOptions: () => ({
    queryKey: ['inbox-test'],
    queryFn: () => Promise.resolve(queryData),
  }),
  useMarkInboxRead: () => ({ mutate: markReadMutate }),
  useDeleteInboxItem: () => ({ mutate: deleteItemMutate }),
  useRestoreInboxItem: () => ({ mutate: restoreItemMutate }),
  useDeleteInbox: () => ({ mutate: deleteInboxMutate }),
  useMarkInboxRegistered: () => ({ mutate: markRegisteredMutate }),
}))

function item(overrides: Partial<InboxItemResponse>): InboxItemResponse {
  return {
    id: 'ib_1',
    kind: 'notification.primary',
    title: 'Registration required for Timeline Hack',
    body_md: 'Deadline: **12.09.2026 18:00**',
    actions: [{ kind: 'OPEN', href: 'ev_1' }],
    logical_key: 'key-1',
    created_at: '2026-02-10T09:00:00Z',
    subject: { kind: 'event', id: 'ev_1' },
    ...overrides,
  } as unknown as InboxItemResponse
}

function renderPage() {
  return renderWithProviders(
    <ShortcutProvider>
      <InboxPage />
    </ShortcutProvider>,
  )
}

beforeEach(() => {
  queryData = { items: [], meta: { page: 1, page_size: 100, total: 0, has_next: false } }
  markReadMutate.mockClear()
  deleteItemMutate.mockClear()
  restoreItemMutate.mockClear()
  deleteInboxMutate.mockClear()
  markRegisteredMutate.mockClear()
  toastFn.mockClear()
  toastFn.success.mockClear()
  toastFn.error.mockClear()
})

describe('InboxPage', () => {
  it('shows the empty state when there is nothing', async () => {
    renderPage()
    expect(await screen.findByText(/nothing here yet/i)).toBeInTheDocument()
  })

  it('renders items grouped and lets the reader open one', async () => {
    queryData = {
      items: [item({})],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    renderPage()

    expect(await screen.findByText('Registration required for Timeline Hack')).toBeInTheDocument()
    expect(screen.getByText(/deadline: 12\.09\.2026 18:00/i)).toBeInTheDocument()
  })

  it('deletes an item and offers undo through the toast action', async () => {
    queryData = {
      items: [item({})],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    const { user } = renderPage()
    await screen.findByText('Registration required for Timeline Hack')

    const deleteButton = screen.getByRole('button', { name: /delete registration required/i })
    await user.click(deleteButton)

    expect(deleteItemMutate).toHaveBeenCalledWith('ib_1', expect.any(Object))
    expect(toastFn).toHaveBeenCalledWith(
      'Deleted',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }),
    )
    const call = toastFn.mock.calls[0]?.[1] as { action: { onClick: () => void } }
    call.action.onClick()
    expect(restoreItemMutate).toHaveBeenCalledWith('ib_1', expect.any(Object))
  })

  it('marks a registration done from its inbox action', async () => {
    queryData = {
      items: [
        item({
          actions: [{ kind: 'MARK_REGISTERED' } as InboxItemResponse['actions'][number]],
        }),
      ],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    const { user } = renderPage()
    const markButton = await screen.findByRole('button', { name: /i registered/i })
    await user.click(markButton)
    expect(markRegisteredMutate).toHaveBeenCalledWith('ib_1', expect.any(Object))
  })

  it('confirms before deleting everything', async () => {
    queryData = {
      items: [item({})],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    const { user } = renderPage()
    await screen.findByText('Registration required for Timeline Hack')

    await user.click(screen.getByRole('button', { name: /^delete all$/i }))
    const dialog = await screen.findByRole('alertdialog')
    expect(deleteInboxMutate).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(deleteInboxMutate).toHaveBeenCalledWith({ readOnly: false })
    })
  })

  it('selects a row with the x shortcut after arrowing onto it', async () => {
    queryData = {
      items: [item({})],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    const { user } = renderPage()
    await screen.findByText('Registration required for Timeline Hack')

    await user.keyboard('j')
    await user.keyboard('x')

    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('disables mark-all-read once nothing is unread', async () => {
    queryData = {
      items: [item({ read_at: '2026-02-10T10:00:00Z' })],
      meta: { page: 1, page_size: 100, total: 1, has_next: false },
    }
    renderPage()
    await screen.findByText('Registration required for Timeline Hack')
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDisabled()
  })
})
