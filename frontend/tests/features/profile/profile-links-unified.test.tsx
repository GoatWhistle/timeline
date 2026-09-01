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
  return screen.getAllByLabelText(i18n.t('profile.links.url'))
}

describe('the links card holds one editor at a time', () => {
  it('shows the add form, and only that form, before anything is edited', () => {
    renderWithProviders(<ProfileLinksCard />)

    expect(urlFields()).toHaveLength(1)
    expect(screen.getAllByLabelText(i18n.t('profile.links.label'))).toHaveLength(1)
    expect(screen.getByRole('button', { name: i18n.t('profile.links.add') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('action.save') })).toBeNull()
  })

  it('replaces the add form when a link is opened for editing, never stacks the two', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))

    expect(urlFields()).toHaveLength(1)
    expect(screen.getAllByLabelText(i18n.t('profile.links.label'))).toHaveLength(1)
    expect(screen.queryByRole('button', { name: i18n.t('profile.links.add') })).toBeNull()
    expect(screen.getByRole('button', { name: i18n.t('action.save') })).toBeInTheDocument()
  })

  it('loads the edited link into that one form', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))

    expect(urlFields()[0]).toHaveValue('https://github.com/ivan')
    expect(screen.getByLabelText(i18n.t('profile.links.label'))).toHaveValue('My code')
  })

  it('switches between two links without ever showing two forms', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))
    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'Telegram' })))

    expect(urlFields()).toHaveLength(1)
    expect(urlFields()[0]).toHaveValue('https://t.me/ivan')
  })

  it('returns to the add form when editing is cancelled', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))
    await user.click(screen.getByRole('button', { name: i18n.t('action.cancel') }))

    expect(urlFields()).toHaveLength(1)
    expect(urlFields()[0]).toHaveValue('')
    expect(screen.getByRole('button', { name: i18n.t('profile.links.add') })).toBeInTheDocument()
  })

  it('names the editor so the user can tell which mode they are in', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    expect(screen.getByText(i18n.t('profile.links.addTitle'))).toBeInTheDocument()

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))

    expect(screen.getByText(i18n.t('profile.links.editTitle'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('profile.links.addTitle'))).toBeNull()
  })

  it('marks the row being edited, so the form is tied to a link', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    const pencil = screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' }))
    expect(pencil).toHaveAttribute('aria-pressed', 'false')

    await user.click(pencil)

    await waitFor(() =>
      expect(
        screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
    expect(
      screen.getByLabelText(i18n.t('profile.links.edit', { name: 'Telegram' })),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps every row on screen while one of them is edited', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    await user.click(screen.getByLabelText(i18n.t('profile.links.edit', { name: 'My code' })))

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('the card tells the user what it recognised, and never scolds', () => {
  it('names the service once the address is recognised', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.type(urlFields()[0] as HTMLElement, 'https://gitlab.com/ivan')

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t('profile.links.detected', { name: 'GitLab' })),
      ).toBeInTheDocument(),
    )
  })

  it('says nothing at all about an address it does not recognise', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.type(urlFields()[0] as HTMLElement, 'https://example.org/me')

    await waitFor(() => expect(urlFields()[0]).toHaveValue('https://example.org/me'))
    expect(screen.queryByText(/Recognised/)).toBeNull()
    expect(screen.queryByText(/not recognised/i)).toBeNull()
  })

  it('recognises a newly added service, and its mark reaches the field', async () => {
    const { user } = renderWithProviders(<ProfileLinksCard />)

    await user.type(urlFields()[0] as HTMLElement, 'https://kaggle.com/ivan')

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t('profile.links.detected', { name: 'Kaggle' })),
      ).toBeInTheDocument(),
    )
  })
})
