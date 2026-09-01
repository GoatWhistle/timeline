import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarField } from '@/features/profile/avatar-field/avatar-field'
import { resetCsrfToken } from '@/shared/api/client'
import { i18n } from '@/shared/i18n/config'

const STORED = '/api/v1/avatars/abc123.png'

let uploads = 0
let deletes = 0

function stubApi() {
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
    if (url.includes('/me/avatar') && method === 'POST') uploads += 1
    if (url.includes('/me/avatar') && method === 'DELETE') deletes += 1

    return new Response(JSON.stringify({ id: 'us_1', avatar_url: STORED }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}

describe('the avatar field', () => {
  beforeEach(() => {
    resetCsrfToken()
    uploads = 0
    deletes = 0
    stubApi()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers upload and no removal when nothing is stored', () => {
    renderWithProviders(<AvatarField seed="us_1" firstName="Ivan" lastName="Petrov" />)

    expect(screen.getByRole('button', { name: i18n.t('profile.avatarUpload') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: i18n.t('profile.avatarRemove') })).toBeNull()
  })

  it('offers replace, download and removal once a file is stored', () => {
    renderWithProviders(
      <AvatarField seed="us_1" firstName="Ivan" lastName="Petrov" avatarUrl={STORED} />,
    )

    expect(
      screen.getByRole('button', { name: i18n.t('profile.avatarReplace') }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('profile.avatarRemove') })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: i18n.t('profile.avatarDownload') })).toHaveAttribute(
      'href',
      STORED,
    )
  })

  it('renders initials rather than an image when no file is stored', () => {
    const { container } = renderWithProviders(
      <AvatarField seed="us_1" firstName="Ivan" lastName="Petrov" />,
    )

    expect(container.querySelector('[data-avatar] img')).toBeNull()
    expect(container.querySelector('[data-avatar]')?.textContent).toContain('IP')
  })

  it('deletes the stored file when removal is confirmed', async () => {
    const { user } = renderWithProviders(
      <AvatarField seed="us_1" firstName="Ivan" lastName="Petrov" avatarUrl={STORED} />,
    )

    await user.click(screen.getByRole('button', { name: i18n.t('profile.avatarRemove') }))
    await waitFor(() => expect(deletes).toBe(1))
    expect(uploads).toBe(0)
  })

  it('opens the editor only after a file is chosen', async () => {
    const { container } = renderWithProviders(
      <AvatarField seed="us_1" firstName="Ivan" lastName="Petrov" />,
    )

    expect(screen.queryByRole('region', { name: i18n.t('imageEditor.title') })).toBeNull()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('image/png,image/jpeg,image/webp')
  })
})
