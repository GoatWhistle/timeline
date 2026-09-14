import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegistrationTab } from '@/features/registration/registration-tab'
import type { EventResponse, RegistrationResponse } from '@/shared/api/types.gen'
import { setTimeZone } from '@/shared/datetime/datetime'
import { i18n } from '@/shared/i18n/config'

let loaded: RegistrationResponse | undefined

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: (options: { queryKey: unknown[] }) =>
      options.queryKey[0] === 'registration'
        ? {
            data: loaded,
            isPending: loaded === undefined,
            isFetching: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
          }
        : { data: undefined, isPending: false, isFetching: false, isError: false, error: null },
  }
})

vi.mock('@/entities/registration/registration.queries', async () => {
  const actual = await vi.importActual<
    typeof import('@/entities/registration/registration.queries')
  >('@/entities/registration/registration.queries')
  const idle = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })
  return {
    ...actual,
    useCreateRegistration: idle,
    useUpdateRegistration: idle,
    useToggleRegistration: idle,
  }
})

const EVENT = {
  id: 'ev_1',
  title: 'Existing',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'RU',
  start_at: '2026-09-01T15:00:00Z',
  end_at: '2026-09-30T23:00:00Z',
  state: 'UPCOMING',
} as EventResponse

const REGISTRATION = {
  id: 'rg_1',
  url: 'https://example.org/register',
  deadline_at: '2026-09-25T15:00:00Z',
  state: 'ACTIVE',
  schedule_version: 1,
  activation_version: 1,
  notification_content_version: 1,
} as RegistrationResponse

function deadlineDate(): HTMLInputElement {
  const input = document.getElementById('reg-deadline')
  if (!(input instanceof HTMLInputElement)) throw new Error('no deadline date input')
  return input
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  setTimeZone('Europe/Moscow')
  loaded = undefined
})

afterEach(() => {
  setTimeZone(undefined)
})

describe('the saved deadline survives arriving after the first render', () => {
  it('fills the deadline once the registration has loaded, not only when it was there first', () => {
    const { rerender } = renderWithProviders(<RegistrationTab event={EVENT} />)
    expect(document.getElementById('reg-deadline')).toBeNull()

    loaded = REGISTRATION
    rerender(<RegistrationTab event={EVENT} />)

    expect(deadlineDate().value).toBe('25.09.2026')
  })

  it('leaves the deadline empty when the event has no registration yet', () => {
    loaded = { ...REGISTRATION, deadline_at: '' } as RegistrationResponse
    renderWithProviders(<RegistrationTab event={EVENT} />)

    expect(deadlineDate().value).toBe('')
  })
})
