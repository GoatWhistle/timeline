import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { InboxBell } from '@/features/inbox-bell/inbox-bell'
import { i18n } from '@/shared/i18n/config'

const styleSource = readFileSync(
  resolve(process.cwd(), 'src/features/inbox-bell/inbox-bell.module.css'),
  'utf8',
)

const ITEM = {
  id: 'ib_1',
  kind: 'notification.primary',
  title: 'Registration required for Audit Wave E',
  body_md: 'Registration closes 12.09.2026 21:43',
  actions: [{ kind: 'OPEN', href: 'ev_gma9hq8a96q5' }],
  logical_key: 'k1',
  created_at: '2026-09-13T09:00:00Z',
  subject: { kind: 'event', id: 'ev_gma9hq8a96q5' },
}

vi.mock('@/entities/inbox/inbox.queries', () => ({
  inboxUnreadCountQueryOptions: {
    queryKey: ['bell-unread-legible'],
    queryFn: () => Promise.resolve({ unread: 1 }),
  },
  inboxPreviewQueryOptions: () => ({
    queryKey: ['bell-preview-legible'],
    queryFn: () =>
      Promise.resolve({
        items: [ITEM],
        meta: { page: 1, page_size: 5, total: 1, has_next: false },
      }),
  }),
}))

async function openBell(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: i18n.t('notification:inbox.bell.open') }))
  await waitFor(() =>
    expect(screen.getByText(i18n.t('notification:inbox.bell.title'))).toBeInTheDocument(),
  )
}

describe('a notification row reads as one item, not a wall of text', () => {
  it('puts the time beside the title instead of on its own line', () => {
    expect(styleSource).toContain('.itemHead')
    expect(styleSource).toMatch(/\.itemHead\s*\{[^}]*justify-content:\s*space-between/)
  })

  it('separates one notification from the next', () => {
    expect(styleSource).toMatch(/\.list\s*>\s*li\s*\+\s*li\s*\.item\s*\{[^}]*border-top/)
  })

  it('no longer stacks title, body and time in a three-row grid', () => {
    expect(styleSource).not.toContain('grid-template-areas')
  })

  it('lets the notification text wrap instead of cutting it off mid-sentence', () => {
    const body = styleSource.match(/\.itemBody\s*\{[^}]*\}/)?.[0] ?? ''

    expect(body, 'the body rule is missing').not.toBe('')
    expect(body, 'a single-line body hides most of the notification').not.toMatch(
      /white-space:\s*nowrap/,
    )
    expect(body, 'the body needs a line budget so a long text stays bounded').toMatch(
      /line-clamp:\s*2/,
    )
  })

  it('links the row to the event the action points at', async () => {
    const rendered = renderWithProviders(<InboxBell />)
    await openBell(rendered.user)

    const link = await screen.findByRole('menuitem', { name: /Registration required/ })
    expect(link).toHaveAttribute('href', '/events/ev_gma9hq8a96q5')
  })
})
