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

function urlFields() {
  return screen.getAllByLabelText(i18n.t('profile.links.url'))
}

describe('the address and its caption share a row instead of stacking', () => {
  it('puts both fields in one flex row rather than one under the other', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const caption = screen.getByLabelText(i18n.t('profile.links.label'))

    const urlField = url.closest('div.flex.flex-col') as HTMLElement
    const captionField = caption.closest('div.flex.flex-col') as HTMLElement
    expect(urlField.parentElement).toBe(captionField.parentElement)

    const row = urlField.parentElement as HTMLElement
    expect(row.className).toContain('sm:flex-row')
  })

  it('gives the address more of the row than the caption', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const caption = screen.getByLabelText(i18n.t('profile.links.label'))

    expect((url.closest('div.flex.flex-col') as HTMLElement).className).toContain('sm:flex-2')
    expect((caption.closest('div.flex.flex-col') as HTMLElement).className).toContain('sm:flex-1')
  })

  it('never lets either field push the row wider than the card', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const caption = screen.getByLabelText(i18n.t('profile.links.label'))

    expect((url.closest('div.flex.flex-col') as HTMLElement).className).toContain('min-w-0')
    expect((caption.closest('div.flex.flex-col') as HTMLElement).className).toContain('min-w-0')
  })
})

describe('the service glyph follows the address it describes', () => {
  it('sits after the input in document order, not before it', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const glyph = (url.parentElement as HTMLElement).querySelector('svg') as SVGElement

    expect(glyph).not.toBeNull()
    const position = url.compareDocumentPosition(glyph)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('is pinned to the trailing edge, and the padding it needs is on that side', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const glyph = (url.parentElement as HTMLElement).querySelector('svg') as SVGElement

    expect(glyph.getAttribute('class') ?? '').toContain('right-3')
    expect(glyph.getAttribute('class') ?? '').not.toContain('left-3')
    expect(url.className).toContain('pr-9')
    expect(url.className).not.toContain('pl-9')
  })
})

describe('the form spends no height on nothing', () => {
  it('keeps no permanently reserved line under the address', () => {
    renderWithProviders(<ProfileLinksCard />)
    const detected = document.getElementById('new-link-detected') as HTMLElement

    expect(detected.className).not.toContain('min-h-5')
    expect(detected.className).toContain('empty:hidden')
    expect(detected.textContent).toBe('')
  })

  it('shows that line only once a service is actually recognised', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    const detected = document.getElementById('new-link-detected') as HTMLElement
    expect(detected.textContent).toBe('')

    await user.type(urlFields()[0] as HTMLElement, 'https://gitlab.com/ivan')

    await waitFor(() =>
      expect(detected).toHaveTextContent(i18n.t('profile.links.detected', { name: 'GitLab' })),
    )
  })

  it('still announces the recognised service to a screen reader', () => {
    renderWithProviders(<ProfileLinksCard />)
    const url = urlFields()[0] as HTMLElement
    const detected = document.getElementById('new-link-detected') as HTMLElement

    expect(detected).toHaveAttribute('aria-live', 'polite')
    expect(url).toHaveAttribute('aria-describedby', detected.id)
  })
})
