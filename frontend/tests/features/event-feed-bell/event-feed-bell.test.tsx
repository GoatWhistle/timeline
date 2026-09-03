import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, waitFor, within } from '@testing-library/react'
import { assertMatchesContract } from '@tests/support/contract'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  eventFeedQueryOptions,
  unreadCountQueryOptions,
} from '@/entities/event-feed/event-feed.queries'
import { EventFeedBell } from '@/features/event-feed-bell/event-feed-bell'
import type { SystemEventResponse } from '@/shared/api/types.gen'
import { setTimeZone } from '@/shared/datetime/datetime'
import { i18n } from '@/shared/i18n/config'

const QUEUE: SystemEventResponse = {
  id: 'sy_qyq5juf5gfy5',
  type: 'QUEUE_AGE_NORMAL',
  subject_type: 'WORKER',
  severity: 'INFO',
  payload: {},
  read: true,
  created_at: '2026-09-03T11:43:49Z',
}

const WORKER: SystemEventResponse = {
  id: 'sy_na59ed9yqxtr',
  type: 'WORKER_RECOVERED',
  subject_type: 'WORKER',
  severity: 'INFO',
  payload: {},
  read: false,
  created_at: '2026-09-03T11:40:00Z',
}

function page(items: SystemEventResponse[]) {
  return { items, meta: { page: 1, page_size: 50, total: items.length, has_next: false } }
}

function renderBell({
  unread = 0,
  items = [QUEUE],
}: {
  unread?: number
  items?: SystemEventResponse[]
} = {}) {
  const rendered = renderWithProviders(<EventFeedBell />)
  rendered.queryClient.setQueryData(unreadCountQueryOptions.queryKey, { unread })
  rendered.queryClient.setQueryData(eventFeedQueryOptions(false).queryKey, page(items))
  return rendered
}

async function openPanel(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: i18n.t('notification:feed.open') }))
  await waitFor(() =>
    expect(screen.getByText(i18n.t('notification:feed.title'))).toBeInTheDocument(),
  )
}

function markAll() {
  return document.querySelector('[data-feed-mark-all]') as HTMLElement
}

const COLLISION_PADDING = 12

const STYLESHEET = readFileSync(
  resolve(process.cwd(), 'src/features/event-feed-bell/event-feed-bell.module.css'),
  'utf8',
)

function listHeightRule(): string {
  return STYLESHEET.slice(STYLESHEET.indexOf('.list {'), STYLESHEET.indexOf('.item {'))
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
  setTimeZone('Europe/Moscow')
})

describe('the feed the bell renders', () => {
  it('uses fixtures that the contract accepts', () => {
    assertMatchesContract('/me/events-feed', 'get', 200, page([QUEUE, WORKER]))
  })
})

describe('marking everything read is an icon, not a sentence', () => {
  it('never prints the wording as visible body text beside the title', async () => {
    const { user } = renderBell({ unread: 3 })
    await openPanel(user)

    const label = i18n.t('notification:feed.markAllRead')
    const visible = screen
      .queryAllByText(label)
      .filter((node) => node.closest('[data-feed-mark-all]') === null)
    expect(visible).toEqual([])
  })

  it('keeps an accessible name on the icon-only control', async () => {
    const { user } = renderBell({ unread: 3 })
    await openPanel(user)

    expect(markAll()).toHaveAttribute('aria-label', i18n.t('notification:feed.markAllRead'))
    expect(markAll()).toHaveAttribute('title', i18n.t('notification:feed.markAllRead'))
  })

  it('reveals the wording on hover', async () => {
    const { user } = renderBell({ unread: 3 })
    await openPanel(user)
    await user.hover(markAll())

    await waitFor(() => {
      expect(screen.getAllByText(i18n.t('notification:feed.markAllRead')).length).toBeGreaterThan(0)
    })
  })

  it('carries no text node of its own, so the label cannot creep back on screen', async () => {
    const { user } = renderBell({ unread: 3 })
    await openPanel(user)

    expect(markAll().textContent).toBe('')
  })

  it('sits in the menu keyboard order, not stranded outside it', async () => {
    const { user } = renderBell({ unread: 3 })
    await openPanel(user)

    expect(markAll()).toHaveAttribute('role', 'menuitem')

    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(markAll()).toHaveFocus())
  })

  it('stays out of the panel while nothing is unread', async () => {
    const { user } = renderBell({ unread: 0 })
    await openPanel(user)

    expect(markAll()).toBeNull()
  })
})

describe('timestamps follow the rest of the app', () => {
  it('prints no seconds and no machine-looking date', async () => {
    const { user } = renderBell({ items: [QUEUE] })
    await openPanel(user)

    const stamp = document.querySelector('time') as HTMLElement
    expect(stamp.textContent ?? '').not.toMatch(/\d{1,2}:\d{2}:\d{2}/)
    expect(stamp.textContent ?? '').not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(stamp.textContent ?? '').not.toBe(new Date(QUEUE.created_at).toLocaleString())
  })

  it('reads as a relative distance in the active language', async () => {
    const { user } = renderBell({ items: [QUEUE] })
    await openPanel(user)

    const stamp = document.querySelector('time') as HTMLElement
    expect(stamp.textContent ?? '').toMatch(/назад|через/)
  })

  it('keeps the exact moment reachable through the title, in the profile zone', async () => {
    const { user } = renderBell({ items: [QUEUE] })
    await openPanel(user)

    const stamp = document.querySelector('time') as HTMLElement
    expect(stamp).toHaveAttribute('title', '3 сентября 2026, 14:43')
    expect(stamp).toHaveAttribute('dateTime', QUEUE.created_at)
  })

  it('follows the profile zone rather than the machine one', async () => {
    setTimeZone('Asia/Tokyo')
    const { user } = renderBell({ items: [QUEUE] })
    await openPanel(user)

    const stamp = document.querySelector('time') as HTMLElement
    expect(stamp).toHaveAttribute('title', '3 сентября 2026, 20:43')
    setTimeZone('Europe/Moscow')
  })
})

describe('unread entries are told apart from read ones', () => {
  it('marks only the unread row, so the distinction is not carried by colour alone', async () => {
    const { user } = renderBell({ items: [WORKER, QUEUE] })
    await openPanel(user)

    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows[0]?.className).toContain('itemUnread')
    expect(rows[1]?.className).not.toContain('itemUnread')
  })

  it('gives the unread marker a rule of its own in the stylesheet', () => {
    expect(STYLESHEET).toContain('.itemUnread::before')
  })
})

describe('the panel constrains itself to the window', () => {
  it('opens upward, away from the sidebar foot it is anchored to', async () => {
    const { user } = renderBell()
    await openPanel(user)

    const content = document.querySelector('[data-radix-menu-content]') as HTMLElement
    expect(content).toHaveAttribute('data-side', 'top')
  })

  it('reserves a gap on every side instead of sitting flush against the frame', async () => {
    const { user } = renderBell()
    await openPanel(user)

    const wrapper = document.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement
    expect(wrapper.style.getPropertyValue('--radix-popper-available-height')).toBe(
      `${-2 * COLLISION_PADDING}px`,
    )
    expect(wrapper.style.getPropertyValue('--radix-popper-available-width')).toBe(
      `${-2 * COLLISION_PADDING}px`,
    )
  })

  it('caps the scrolling list by the height the popper says is available', async () => {
    const { user } = renderBell({ items: [QUEUE, WORKER] })
    await openPanel(user)

    expect(screen.getByRole('list')).toBeInTheDocument()
    const rule = listHeightRule()
    expect(rule).toContain('--radix-popper-available-height')
    expect(rule).toContain('overflow-y: auto')
  })

  it('lists every item it was given', async () => {
    const { user } = renderBell({ items: [QUEUE, WORKER] })
    await openPanel(user)

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })
})
