import { screen, waitFor } from '@testing-library/react'
import { assertMatchesContract } from '@tests/support/contract'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { deviceSessionsQueryKey } from '@/entities/session/device-sessions.queries'
import { DeviceList } from '@/features/device-list/device-list'
import type { SessionResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const CURRENT: SessionResponse = {
  id: '3f1d5d4e-6a02-4d1c-9a2b-8f9c0c1d2e30',
  current: true,
  created_at: '2026-08-20T09:00:00Z',
  last_used_at: '2026-08-29T08:30:00Z',
  expires_at: '2026-09-19T09:00:00Z',
  ip: '203.0.113.7',
  label: '',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36',
}

const PHONE: SessionResponse = {
  id: '8c2b0d31-1a44-4f21-a0e7-5b8d3c9f7a12',
  current: false,
  created_at: '2026-08-11T14:20:00Z',
  last_used_at: '2026-08-27T19:05:00Z',
  expires_at: '2026-09-10T14:20:00Z',
  ip: '198.51.100.42',
  label: '',
  user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Mobile/15E148 Safari/604.1',
}

function listBody(items: SessionResponse[]) {
  return { items, total: items.length }
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('device list', () => {
  it('uses fixtures that the contract accepts', () => {
    assertMatchesContract('/me/sessions', 'get', 200, listBody([CURRENT, PHONE]))
  })

  it('renders every session held in the cache, current one first', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PHONE, CURRENT]))

    await waitFor(() => expect(screen.getAllByText(/Chrome/).length).toBeGreaterThan(0))

    const titles = screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
    expect(titles[0]).toContain('Chrome')
    expect(titles[1]).toContain('Safari')
  })

  it('drops the revoked session from the list once the cache no longer holds it', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    expect(screen.queryByText(/Safari · iOS/)).not.toBeInTheDocument()
  })

  it('shows the empty state when the last other session is gone', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([]))

    await waitFor(() =>
      expect(screen.getByText(i18n.t('common:devices.emptyTitle'))).toBeInTheDocument(),
    )
  })

  it('marks the current session by its own outline, not by a word', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    const [mine, theirs] = screen.getAllByRole('listitem')

    expect(mine?.className, 'the current device needs an outline of its own').not.toEqual(
      theirs?.className,
    )
    expect(mine?.className).toMatch(/border-primary|ring-/)
  })

  it('names no device as the current one in words', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    expect(screen.queryByText(i18n.t('common:devices.current'))).toBeNull()
    expect(screen.queryByText(i18n.t('common:devices.groupCurrent'))).toBeNull()
  })

  it('renames a device in place rather than replacing the row with a form', async () => {
    const { queryClient, user } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    const [edit] = screen.getAllByRole('button', { name: /Chrome/ })
    if (!edit) throw new Error('the rename button is missing')
    await user.click(edit)

    expect(screen.getAllByRole('listitem'), 'the row must stay in the list').toHaveLength(2)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows nothing but the field while the name is being typed', async () => {
    const { queryClient, user } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const [edit] = screen.getAllByRole('button', { name: /Chrome/ })
    if (!edit) throw new Error('the rename button is missing')
    await user.click(edit)

    const row = screen.getAllByRole('listitem')[0]
    const spelled = [...(row?.querySelectorAll('p') ?? [])].map((node) => node.textContent)

    expect(spelled, 'the hardware line has no business under the field').not.toContain(
      'Chrome, Windows',
    )
  })

  it('carries no card title above the devices', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    expect(screen.queryByText(i18n.t('common:devices.title'))).toBeNull()
  })

  it('leaves the card without a lead-in line or a session tally', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    expect(screen.queryByText(i18n.t('common:devices.hint'))).toBeNull()
    expect(screen.queryByText(i18n.t('common:devices.count', { count: 2 }))).toBeNull()
  })
})
