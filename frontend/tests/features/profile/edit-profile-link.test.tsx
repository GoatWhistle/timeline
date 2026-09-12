import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditProfileLink } from '@/features/profile/profile-links-card/edit-profile-link'
import type { ProfileLink } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const update = vi.fn()

vi.mock('@/entities/user/profile.queries', () => ({
  useUpdateProfileLink: () => ({ mutateAsync: update, isPending: false }),
}))

const LINK: ProfileLink = {
  id: 'pf_42ej2s5gh7e8',
  url: 'https://github.com/ivan',
  kind: 'github',
  label: 'My code',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  update.mockReset()
  update.mockResolvedValue({})
})

describe('editing a profile link', () => {
  it('opens with the values the link already holds', () => {
    renderWithProviders(<EditProfileLink link={LINK} onDone={() => {}} />)

    expect(screen.getByLabelText(i18n.t('profile.links.url'))).toHaveValue(LINK.url)
    expect(screen.getByLabelText(i18n.t('profile.links.label'))).toHaveValue('My code')
  })

  it('sends the changed address', async () => {
    const { user } = renderWithProviders(<EditProfileLink link={LINK} onDone={() => {}} />)

    const url = screen.getByLabelText(i18n.t('profile.links.url'))
    await user.clear(url)
    await user.type(url, 'https://gitlab.com/ivan')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(update).toHaveBeenCalledWith({
      id: LINK.id,
      body: { url: 'https://gitlab.com/ivan', label: 'My code' },
    })
  })

  it('asks the server to drop the caption when it is emptied', async () => {
    const { user } = renderWithProviders(<EditProfileLink link={LINK} onDone={() => {}} />)

    await user.click(screen.getByRole('button', { name: i18n.t('profile.links.clearLabel') }))
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(update).toHaveBeenCalledWith({
      id: LINK.id,
      body: { url: LINK.url, clear_label: true },
    })
  })

  it('offers no clear control for a link that never had a caption', () => {
    renderWithProviders(<EditProfileLink link={{ ...LINK, label: '' }} onDone={() => {}} />)

    expect(screen.queryByRole('button', { name: i18n.t('profile.links.clearLabel') })).toBeNull()
  })

  it('refuses an address the browser must not follow', async () => {
    const { user } = renderWithProviders(<EditProfileLink link={LINK} onDone={() => {}} />)

    const url = screen.getByLabelText(i18n.t('profile.links.url'))
    await user.clear(url)
    await user.type(url, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(update).not.toHaveBeenCalled()
  })
})
