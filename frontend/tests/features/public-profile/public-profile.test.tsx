import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicProfilePage } from '@/features/public-profile/public-profile'
import type { MeResponse, PublicProfileResponse } from '@/shared/api/types.gen'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { writeStoredLocale } from '@/shared/i18n/locale'

function renderPage(route: string) {
  return renderWithProviders(
    <I18nProvider>
      <PublicProfilePage />
    </I18nProvider>,
    { route },
  )
}

const mutateAsync = vi.fn().mockResolvedValue(undefined)

vi.mock('@/entities/user/profile.queries', () => ({
  useUpdateProfile: () => ({ mutateAsync }),
}))

let sessionUser: MeResponse | undefined
vi.mock('@/shared/api/session', () => ({
  useSession: () => ({
    user: sessionUser,
    isLoading: false,
    isAuthenticated: sessionUser !== undefined,
    isAdmin: false,
  }),
}))

let profileData: PublicProfileResponse | undefined
let profileError: Error | undefined
vi.mock('@/entities/user/public-profile.queries', () => ({
  usePublicProfile: () => ({
    data: profileData,
    isPending: false,
    isError: profileError !== undefined,
  }),
}))

const BASE_PROFILE = {
  nickname: 'jsmith',
  first_name: 'John',
  last_name: 'Smith',
  display_name: 'John Smith',
  bio: 'Backend developer',
  member_since: '2025-01-10T00:00:00Z',
  links: [],
  events: [],
  pinned_events: [],
  monthly_activity: [
    { month: '2026-01', count: 0 },
    { month: '2026-02', count: 3 },
  ],
} as unknown as PublicProfileResponse

function user(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 'u1',
    email: 'john@example.com',
    email_verified: true,
    first_name: 'John',
    last_name: 'Smith',
    display_name: 'Smith John',
    profile_public: true,
    profile_visibility: 'public',
    pinned_event_ids: [],
    theme: 'system',
    is_active: true,
    is_admin: false,
    locale: 'en',
    telegram_linked: false,
    notification_channels: [],
    shortcuts: {},
    timezone: 'Europe/Moscow',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as MeResponse
}

beforeEach(() => {
  writeStoredLocale('en')
  sessionUser = undefined
  profileData = undefined
  profileError = undefined
  mutateAsync.mockClear()
})

describe('PublicProfilePage', () => {
  it('shows the not-found page state when the profile errors', async () => {
    profileError = new Error('404')
    renderPage('/@jsmith')
    expect(await screen.findByText(/no such profile/i)).toBeInTheDocument()
  })

  it('renders a visitor view without the edit or unpin controls', async () => {
    profileData = { ...BASE_PROFILE, summary: undefined } as unknown as PublicProfileResponse
    sessionUser = user({ nickname: 'someone-else' })
    renderPage('/@jsmith')

    expect(await screen.findByText('@jsmith')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /edit profile/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unpin/i })).not.toBeInTheDocument()
  })

  it('shows the edit control and pinned unpin action to the owner', async () => {
    profileData = {
      ...BASE_PROFILE,
      nickname: 'owner',
      pinned_events: [
        {
          id: 'ev_1',
          title: 'Timeline Hack',
          kind: 'HACKATHON',
          role: 'participant',
          start_at: '2026-02-01T00:00:00Z',
          end_at: '2026-02-02T00:00:00Z',
        },
      ],
      events: [
        {
          id: 'ev_1',
          title: 'Timeline Hack',
          kind: 'HACKATHON',
          role: 'participant',
          start_at: '2026-02-01T00:00:00Z',
          end_at: '2026-02-02T00:00:00Z',
        },
      ],
    } as unknown as PublicProfileResponse
    sessionUser = user({ nickname: 'owner', pinned_event_ids: ['ev_1'] })
    const { user: interact } = renderPage('/@owner')

    expect(await screen.findByRole('link', { name: /edit profile/i })).toBeInTheDocument()
    const unpinButton = await screen.findByRole('button', { name: /unpin timeline hack/i })
    await interact.click(unpinButton)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ pinned_event_ids: [] })
    })
  })

  it('shows the honest empty state instead of an invented timeline', async () => {
    profileData = { ...BASE_PROFILE, monthly_activity: [] }
    sessionUser = user({ nickname: 'someone-else' })
    renderPage('/@jsmith')

    expect(await screen.findByText(/no events yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/participation history/i)).not.toBeInTheDocument()
  })

  it('does not show a private summary field to a visitor', async () => {
    profileData = { ...BASE_PROFILE, summary: undefined } as unknown as PublicProfileResponse
    sessionUser = user({ nickname: 'someone-else' })
    renderPage('/@jsmith')

    await screen.findByText('@jsmith')
    expect(screen.queryByText(/on-time registrations/i)).not.toBeInTheDocument()
  })

  it("shows the owner's summary when the server sends one", async () => {
    profileData = {
      ...BASE_PROFILE,
      nickname: 'owner',
      summary: { event_count: 5, team_count: 2, on_time_registration_rate: 0.8 },
    }
    sessionUser = user({ nickname: 'owner' })
    renderPage('/@owner')

    expect(await screen.findByText(/on-time registrations/i)).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })
})
