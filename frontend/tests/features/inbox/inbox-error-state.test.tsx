import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InboxPage } from '@/features/inbox/inbox-page'
import { ShortcutProvider } from '@/shared/keyboard/shortcut-registry'

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

let failing = true

vi.mock('@/entities/inbox/inbox.queries', () => ({
  inboxQueryOptions: () => ({
    queryKey: ['inbox-error-test'],
    queryFn: () => (failing ? Promise.reject(new Error('boom')) : Promise.resolve(undefined)),
    retry: false,
  }),
  useMarkInboxRead: () => ({ mutate: vi.fn() }),
  useDeleteInboxItem: () => ({ mutate: vi.fn() }),
  useRestoreInboxItem: () => ({ mutate: vi.fn() }),
  useDeleteInbox: () => ({ mutate: vi.fn() }),
  useMarkInboxRegistered: () => ({ mutate: vi.fn() }),
}))

function renderPage() {
  return renderWithProviders(
    <ShortcutProvider>
      <InboxPage />
    </ShortcutProvider>,
  )
}

beforeEach(() => {
  failing = true
})

describe('the inbox tells the truth when the server fails', () => {
  it('never claims the inbox is empty while the request is failing', async () => {
    renderPage()

    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: /retry|again/i })).not.toBeNull()
      },
      { timeout: 3000 },
    )
    expect(screen.queryByText('inbox.page.emptyTitle')).toBeNull()
    expect(screen.queryByText('inbox.page.emptyHint')).toBeNull()
  })

  it('offers a way to try again instead of a dead end', async () => {
    renderPage()

    await waitFor(
      () => {
        const retry = screen.queryByRole('button', { name: /retry|again/i })
        expect(retry).not.toBeNull()
      },
      { timeout: 3000 },
    )
  })
})
