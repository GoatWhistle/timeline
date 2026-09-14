import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
import type { ProfileLink } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const LINKS = [
  {
    id: 'pf_0000000000a1',
    url: 'https://github.com/ivan',
    label: 'My code',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
] as unknown as ProfileLink[]

vi.mock('@/entities/user/profile.queries', () => ({
  useProfileLinks: () => ({ data: LINKS }),
  useCreateProfileLink: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateProfileLink: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useDeleteProfileLink: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderProfileLinks: () => ({ mutate: vi.fn(), isPending: false }),
}))

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

async function openAddForm() {
  const rendered = renderWithProviders(<ProfileLinksCard />)
  await rendered.user.click(screen.getByRole('button', { name: i18n.t('profile.links.add') }))
  await screen.findByLabelText(i18n.t('profile.links.url'))
  return rendered
}

function urlField() {
  return screen.getByLabelText(i18n.t('profile.links.url')) as HTMLElement
}

describe('adding a link happens in a dialog, not inline in the card', () => {
  it('shows no form until the reader asks for one', () => {
    renderWithProviders(<ProfileLinksCard />)
    expect(
      screen.queryByLabelText(i18n.t('profile.links.url')),
      'an unopened form must not occupy the card',
    ).toBeNull()
  })

  it('opens the form in a dialog when the add button is pressed', async () => {
    await openAddForm()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(urlField().closest('[role=dialog]'), 'the form belongs to the dialog').not.toBeNull()
  })

  it('never lets either field push the dialog wider than itself', async () => {
    await openAddForm()
    const url = urlField()
    const caption = screen.getByLabelText(i18n.t('profile.links.label'))

    expect((url.closest('div.flex.flex-col') as HTMLElement).className).toContain('min-w-0')
    expect((caption.closest('div.flex.flex-col') as HTMLElement).className).toContain('min-w-0')
  })
})

describe('the service glyph follows the address it describes', () => {
  it('sits after the input in document order, not before it', async () => {
    await openAddForm()
    const url = urlField()
    const glyph = (url.parentElement as HTMLElement).querySelector('svg') as SVGElement

    expect(glyph).not.toBeNull()
    const position = url.compareDocumentPosition(glyph)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('is pinned to the trailing edge, and the padding it needs is on that side', async () => {
    await openAddForm()
    const url = urlField()
    const glyph = (url.parentElement as HTMLElement).querySelector('svg') as SVGElement

    expect(glyph.getAttribute('class') ?? '').toContain('right-3')
    expect(glyph.getAttribute('class') ?? '').not.toContain('left-3')
    expect(url.className).toContain('pr-9')
    expect(url.className).not.toContain('pl-9')
  })
})

describe('the form names the service without spending a visible line on it', () => {
  it('shows the reader no written verdict about the address', async () => {
    const { user } = await openAddForm()

    await user.type(urlField(), 'https://gitlab.com/ivan')

    await waitFor(() => expect(urlField()).toHaveValue('https://gitlab.com/ivan'))
    const detected = document.getElementById('new-link-detected') as HTMLElement
    expect(
      detected.className,
      'the verdict belongs to assistive technology, not to the visible form',
    ).toContain('sr-only')
  })

  it('still announces the recognised service to a screen reader', async () => {
    const { user } = await openAddForm()
    const url = urlField()
    const detected = document.getElementById('new-link-detected') as HTMLElement

    expect(detected).toHaveAttribute('aria-live', 'polite')
    expect(url).toHaveAttribute('aria-describedby', detected.id)

    await user.type(url, 'https://gitlab.com/ivan')

    await waitFor(() =>
      expect(detected).toHaveTextContent(i18n.t('profile.links.detected', { name: 'GitLab' })),
    )
  })
})
