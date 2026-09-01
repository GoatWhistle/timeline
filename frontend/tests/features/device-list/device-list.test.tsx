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

    await waitFor(() => expect(screen.getByText(/Chrome/)).toBeInTheDocument())

    const titles = screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
    expect(titles[0]).toContain('Chrome')
    expect(titles[1]).toContain('Safari')
    expect(screen.getByText(i18n.t('common:devices.current'))).toBeInTheDocument()
    expect(screen.getByText('2 активные сессии')).toBeInTheDocument()
  })

  it('drops the revoked session from the list once the cache no longer holds it', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT, PHONE]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    expect(screen.queryByText(/Safari · iOS/)).not.toBeInTheDocument()
    expect(screen.getByText('1 активная сессия')).toBeInTheDocument()
  })

  it('shows the empty state when the last other session is gone', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([]))

    await waitFor(() =>
      expect(screen.getByText(i18n.t('common:devices.emptyTitle'))).toBeInTheDocument(),
    )
  })

  it('marks the current session with an icon as well as a colour', async () => {
    const { container, queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([CURRENT]))

    await waitFor(() =>
      expect(screen.getByText(i18n.t('common:devices.current'))).toBeInTheDocument(),
    )

    const badge = screen.getByText(i18n.t('common:devices.current')).closest('span')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(1)
  })
})
