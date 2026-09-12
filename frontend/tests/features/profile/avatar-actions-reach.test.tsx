import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarField } from '@/features/profile/avatar-field/avatar-field'
import { i18n } from '@/shared/i18n/config'

const removeAvatar = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/entities/user/avatar.queries', () => ({
  useUploadAvatar: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveAvatar: () => ({ mutateAsync: removeAvatar, isPending: false }),
}))

const SEED = '5f0d2b7a-0000-4000-8000-000000000001'

function renderField(avatarUrl: string | null = 'https://example.com/a.png') {
  return renderWithProviders(
    <AvatarField seed={SEED} firstName="Ivan" lastName="Petrov" avatarUrl={avatarUrl} />,
  )
}

function actions(): HTMLElement {
  const node = document.querySelector<HTMLElement>('fieldset[aria-label]')
  if (!node) throw new Error('no avatar action group')
  return node
}

beforeEach(() => {
  removeAvatar.mockClear()
})

describe('the avatar actions sit on the avatar without becoming mouse-only', () => {
  it('reveals them on focus as well as on hover, so a keyboard reaches them', () => {
    renderField()
    expect(actions().className).toContain('focus-within:opacity-100')
    expect(actions().className).toContain('group-hover:opacity-100')
  })

  it('names every action, so an icon alone never stands for the whole meaning', () => {
    renderField()
    expect(screen.getByRole('button', { name: i18n.t('profile.avatarEdit') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('profile.avatarRemove') })).toBeInTheDocument()
    expect(screen.getByText(i18n.t('profile.avatarReplace'))).toBeInTheDocument()
  })

  it('offers only uploading while there is no avatar to edit or remove', () => {
    renderField(null)
    expect(screen.queryByRole('button', { name: i18n.t('profile.avatarEdit') })).toBeNull()
    expect(screen.queryByRole('button', { name: i18n.t('profile.avatarRemove') })).toBeNull()
    expect(screen.getByText(i18n.t('profile.avatarUpload'))).toBeInTheDocument()
  })
})

describe('removing an avatar cannot happen by a single stray click', () => {
  it('asks before removing, because the picture cannot be brought back', async () => {
    const { user } = renderField()
    await user.click(screen.getByRole('button', { name: i18n.t('profile.avatarRemove') }))

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    expect(removeAvatar).not.toHaveBeenCalled()
  })

  it('removes it only once the question has been answered', async () => {
    const { user } = renderField()
    await user.click(screen.getByRole('button', { name: i18n.t('profile.avatarRemove') }))
    const dialog = await screen.findByRole('alertdialog')

    await user.click(within(dialog).getByRole('button', { name: i18n.t('profile.avatarRemove') }))

    await waitFor(() => expect(removeAvatar).toHaveBeenCalledOnce())
  })
})
