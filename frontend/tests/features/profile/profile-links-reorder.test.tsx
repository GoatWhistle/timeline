import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileLinksList } from '@/features/profile/profile-links-card/profile-links-list'
import { moveItem } from '@/features/profile/profile-links-card/reorder'
import { resetCsrfToken } from '@/shared/api/client'
import type { ProfileLink } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const LINKS = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    url: 'https://github.com/ivan',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    url: 'https://t.me/ivan',
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    url: 'https://example.org/me',
    sort_order: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
] as unknown as ProfileLink[]

function names() {
  return screen.getAllByRole('listitem').map((item) => item.getAttribute('aria-label') ?? '')
}

describe('moveItem', () => {
  it('moves an element towards the start', () => {
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
  })

  it('moves an element towards the end', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1])
  })

  it('swaps neighbours', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
  })

  it('leaves the list alone for an out-of-range or identical position', () => {
    expect(moveItem([1, 2, 3], 0, 0)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], -1, 1)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 0, 3)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 5, 1)).toEqual([1, 2, 3])
  })

  it('never mutates the list it was given', () => {
    const original = [1, 2, 3]
    moveItem(original, 0, 2)
    expect(original).toEqual([1, 2, 3])
  })
})

let sentOrders: { ids: string[] }[] = []

describe('profile links reordering from the keyboard', () => {
  beforeEach(() => {
    resetCsrfToken()
    sentOrders = []
    let stored = LINKS
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const request = input instanceof Request ? input : null
      const url = String(request?.url ?? input)
      const method = String(init?.method ?? request?.method ?? 'GET').toUpperCase()

      if (url.includes('/auth/csrf')) {
        return new Response(JSON.stringify({ csrf_token: 'test-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.includes('/me/profile-links/order') && method === 'PUT') {
        const raw = init?.body !== undefined ? String(init.body) : await request?.clone().text()
        sentOrders.push(JSON.parse(String(raw ?? '{}')) as { ids: string[] })
        const body = sentOrders[sentOrders.length - 1] as { ids: string[] }
        stored = body.ids.map((id) => LINKS.find((link) => link.id === id) as ProfileLink)
      }
      return new Response(JSON.stringify({ items: stored }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers a button alternative to dragging for every row', () => {
    renderWithProviders(<ProfileLinksList links={LINKS} />)
    expect(
      screen.getByLabelText(i18n.t('profile.links.moveDown', { name: 'GitHub' })),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(i18n.t('profile.links.moveUp', { name: 'Telegram' })),
    ).toBeInTheDocument()
  })

  it('moves a link down with the keyboard alone', async () => {
    const { user } = renderWithProviders(<ProfileLinksList links={LINKS} />)
    expect(names()[0]).toContain('GitHub')

    await user.click(screen.getByLabelText(i18n.t('profile.links.moveDown', { name: 'GitHub' })))
    await waitFor(() => expect(names()[1]).toContain('GitHub'))
    expect(names()[0]).toContain('Telegram')
  })

  it('moves a link up with the keyboard alone', async () => {
    const { user } = renderWithProviders(<ProfileLinksList links={LINKS} />)
    await user.click(screen.getByLabelText(i18n.t('profile.links.moveUp', { name: 'Telegram' })))
    await waitFor(() => expect(names()[0]).toContain('Telegram'))
  })

  it('cannot move the first link up or the last one down', () => {
    renderWithProviders(<ProfileLinksList links={LINKS} />)
    expect(screen.getByLabelText(i18n.t('profile.links.moveUp', { name: 'GitHub' }))).toBeDisabled()
    const last = screen.getAllByRole('listitem').at(-1) as HTMLElement
    const down = last.querySelectorAll('button')[1] as HTMLButtonElement
    expect(down).toBeDisabled()
  })

  it('announces the position of every row', () => {
    renderWithProviders(<ProfileLinksList links={LINKS} />)
    expect(names()[0]).toContain(i18n.t('profile.links.position', { current: 1, total: 3 }))
    expect(names()[2]).toContain(i18n.t('profile.links.position', { current: 3, total: 3 }))
  })

  it('sends the new order to the server', async () => {
    const { user } = renderWithProviders(<ProfileLinksList links={LINKS} />)
    await user.click(screen.getByLabelText(i18n.t('profile.links.moveDown', { name: 'GitHub' })))

    await waitFor(() => {
      expect(sentOrders).toHaveLength(1)
      expect(sentOrders[0]).toEqual({
        ids: [LINKS[1]?.id, LINKS[0]?.id, LINKS[2]?.id],
      })
    })
  })
})

describe('profile links rendering', () => {
  it('renders every link through a safe anchor', () => {
    renderWithProviders(<ProfileLinksList links={LINKS} />)
    for (const anchor of screen.getAllByRole('link')) {
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
      expect(anchor.getAttribute('target')).toBe('_blank')
    }
  })

  it('names a link by its recognised service, and by its host when unknown', () => {
    renderWithProviders(<ProfileLinksList links={LINKS} />)
    expect(names()[0]).toContain('GitHub')
    expect(names()[2]).toContain('example.org')
  })

  it('prefers the caption the user gave over the service name', () => {
    const labelled = [{ ...LINKS[0], label: 'My code' } as ProfileLink]
    renderWithProviders(<ProfileLinksList links={labelled} />)
    expect(screen.getAllByRole('listitem')[0]?.getAttribute('aria-label')).toContain('My code')
  })

  it('shows an empty state when there are no links', () => {
    renderWithProviders(<ProfileLinksList links={[]} />)
    expect(screen.getByText(i18n.t('profile.links.empty'))).toBeInTheDocument()
  })
})
