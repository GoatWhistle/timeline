import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { LOCALE_STORAGE_KEY } from '@/shared/i18n/locale'

const PERSON = {
  id: 'us_42ej2s5gh7e8',
  first_name: 'Oleg',
  last_name: 'Kuznetsov',
  display_name: 'Kuznetsov Oleg',
  nickname: 'oleg',
  email: 'oleg@example.com',
  is_active: true,
}

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({
      data: { items: [PERSON], meta: { page: 1, page_size: 50, total: 1, has_next: false } },
      isPending: false,
      isFetching: false,
      isError: false,
    }),
  }
})

vi.mock('@/shared/api/directory', () => ({ usersQuery: () => ({ queryKey: ['users'] }) }))

vi.mock('@/entities/participant/participant.queries', () => ({
  useAddParticipants: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const { AddParticipantsDialog } = await import('@/features/participants/add-participants-dialog')

describe('a person is named the same way everywhere the interface names them', () => {
  it('writes the name in English order while the interface is English', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    await i18n.changeLanguage('en')
    renderWithProviders(
      <I18nProvider>
        <AddParticipantsDialog eventId="ev_gma9hq8a96q5" open onOpenChange={vi.fn()} />
      </I18nProvider>,
    )
    expect(await screen.findByText('Oleg Kuznetsov')).toBeTruthy()
    expect(screen.queryByText('Kuznetsov Oleg')).toBeNull()
  })

  it('writes the name in Russian order while the interface is Russian', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ru')
    await i18n.changeLanguage('ru')
    renderWithProviders(
      <I18nProvider>
        <AddParticipantsDialog eventId="ev_gma9hq8a96q5" open onOpenChange={vi.fn()} />
      </I18nProvider>,
    )
    expect(await screen.findByText('Kuznetsov Oleg')).toBeTruthy()
  })

  it('writes the same name in the same order in the roster of a hackathon', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    await i18n.changeLanguage('en')
    const { ParticipantsTable } = await import(
      '@/features/participants/participants-table/participants-table'
    )
    renderWithProviders(
      <I18nProvider>
        <ParticipantsTable
          items={[
            {
              id: 'pa_42ej2s5gh7e8',
              event_id: 'ev_gma9hq8a96q5',
              user: PERSON,
              team_role: 'Developer',
              participation_status: 'ASSIGNED',
              assignment_version: 1,
              assigned_at: '2026-01-01T00:00:00Z',
            },
          ]}
          selected={new Set()}
          allSelected={false}
          reactivatePending={false}
          onToggleAll={vi.fn()}
          onToggleOne={vi.fn()}
          onEdit={vi.fn()}
          onReactivate={vi.fn()}
        />
      </I18nProvider>,
    )
    expect(await screen.findByText('Oleg Kuznetsov')).toBeTruthy()
    expect(screen.queryByText('Kuznetsov Oleg')).toBeNull()
  })
})
