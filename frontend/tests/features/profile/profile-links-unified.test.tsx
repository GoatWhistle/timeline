import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
  {
    id: 'pf_0000000000a2',
    url: 'https://t.me/ivan',
    sort_order: 1,
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

beforeEach(() => {
  vi.clearAllMocks()
})

function urlFields() {
  return screen.queryAllByLabelText(i18n.t('profile.links.url'))
}

function editPencil(name: string) {
  return screen.getByLabelText(i18n.t('profile.links.edit', { name }))
}

describe('the links card holds one editor at a time', () => {
  it('shows no form at all until the reader opens one', () => {
    renderWithProviders(<ProfileLinksCard />)

    expect(urlFields(), 'the card must not carry a form it was not asked for').toHaveLength(0)
    expect(screen.getByRole('button', { name: i18n.t('profile.links.add') })).toBeInTheDocument()
  })

  it('loads the edited link into the one form it opens', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(editPencil('My code'))

    expect(urlFields()).toHaveLength(1)
    expect(urlFields()[0]).toHaveValue('https://github.com/ivan')
    expect(screen.getByLabelText(i18n.t('profile.links.label'))).toHaveValue('My code')
  })

  it('switches between two links without ever showing two forms', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(editPencil('My code'))
    await user.click(screen.getByRole('button', { name: i18n.t('action.cancel') }))
    await waitFor(() => expect(urlFields()).toHaveLength(0))
    await user.click(editPencil('Telegram'))

    expect(urlFields()).toHaveLength(1)
    expect(urlFields()[0]).toHaveValue('https://t.me/ivan')
  })

  it('closes the editor when editing is cancelled, leaving no form behind', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(editPencil('My code'))
    await user.click(screen.getByRole('button', { name: i18n.t('action.cancel') }))

    await waitFor(() => expect(urlFields()).toHaveLength(0))
    expect(screen.getByRole('button', { name: i18n.t('profile.links.add') })).toBeInTheDocument()
  })

  it('names the editor so the user can tell which mode they are in', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(screen.getByRole('button', { name: i18n.t('profile.links.add') }))
    expect(screen.getByText(i18n.t('profile.links.addTitle'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('action.cancel') }))
    await waitFor(() => expect(urlFields()).toHaveLength(0))

    await user.click(editPencil('My code'))

    expect(screen.getByText(i18n.t('profile.links.editTitle'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('profile.links.addTitle'))).toBeNull()
  })

  it('marks the row being edited, so the form is tied to a link', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    const pencil = editPencil('My code')
    expect(pencil).toHaveAttribute('aria-pressed', 'false')

    await user.click(pencil)

    await waitFor(() => expect(editPencil('My code')).toHaveAttribute('aria-pressed', 'true'))
    expect(editPencil('Telegram')).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps every row in place while one of them is edited', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    expect(document.querySelectorAll('li')).toHaveLength(2)

    await user.click(editPencil('My code'))

    expect(
      document.querySelectorAll('li'),
      'opening the editor must not drop the rows behind it',
    ).toHaveLength(2)
  })
})

describe('the card tells the user what it recognised, and never scolds', () => {
  async function openAdd() {
    const rendered = renderWithProviders(<ProfileLinksCard />)
    await rendered.user.click(screen.getByRole('button', { name: i18n.t('profile.links.add') }))
    await screen.findByLabelText(i18n.t('profile.links.url'))
    return rendered
  }

  it('announces the service once the address is recognised', async () => {
    const { user } = await openAdd()

    await user.type(urlFields()[0] as HTMLElement, 'https://gitlab.com/ivan')

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t('profile.links.detected', { name: 'GitLab' })),
      ).toBeInTheDocument(),
    )
  })

  it('says nothing at all about an address it does not recognise', async () => {
    const { user } = await openAdd()

    await user.type(urlFields()[0] as HTMLElement, 'https://example.org/me')

    await waitFor(() => expect(urlFields()[0]).toHaveValue('https://example.org/me'))
    expect(screen.queryByText(/Recognised/)).toBeNull()
    expect(screen.queryByText(/not recognised/i)).toBeNull()
  })

  it('announces a newly added service too, so the list is not hardcoded', async () => {
    const { user } = await openAdd()

    await user.type(urlFields()[0] as HTMLElement, 'https://kaggle.com/ivan')

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t('profile.links.detected', { name: 'Kaggle' })),
      ).toBeInTheDocument(),
    )
  })
})
