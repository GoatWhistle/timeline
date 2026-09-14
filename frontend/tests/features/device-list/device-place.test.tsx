import { screen, waitFor, within } from '@testing-library/react'
import { assertMatchesContract } from '@tests/support/contract'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { deviceSessionsQueryKey } from '@/entities/session/device-sessions.queries'
import { DeviceList } from '@/features/device-list/device-list'
import type { SessionResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const PLACELESS: SessionResponse = {
  id: '3f1d5d4e-6a02-4d1c-9a2b-8f9c0c1d2e30',
  current: true,
  created_at: '2026-08-20T09:00:00Z',
  last_used_at: '2026-08-29T08:30:00Z',
  expires_at: '2026-09-19T09:00:00Z',
  ip: '192.168.1.14',
  label: '',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36',
}

const PLACED: SessionResponse = {
  ...PLACELESS,
  id: '8c2b0d31-1a44-4f21-a0e7-5b8d3c9f7a12',
  current: false,
  ip: '203.0.113.7',
  country_code: 'NL',
  city: 'Amsterdam',
  user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Mobile/15E148 Safari/604.1',
}

function listBody(items: SessionResponse[]) {
  return { items, total: items.length }
}

const NETHERLANDS = 'Netherlands'

function termsOf(row: HTMLElement): string[] {
  return [...row.querySelectorAll('dt')].map((node) => node.textContent ?? '')
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('the place of a session', () => {
  it('uses fixtures that the contract accepts', () => {
    assertMatchesContract('/me/sessions', 'get', 200, listBody([PLACELESS, PLACED]))
  })

  it('draws no place row at all when the session carries no place', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACELESS]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    expect(
      termsOf(row),
      'a session without a place must look exactly as it did before',
    ).not.toContain(i18n.t('common:devices.placeTerm'))
    expect(screen.queryByText(i18n.t('common:devices.placeTerm'))).toBeNull()
  })

  it('spells no stand-in for a place it does not know', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACELESS]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    const values = [...row.querySelectorAll('dd')].map((node) => node.textContent ?? '')
    for (const value of values) {
      expect(value.trim(), 'no dash and no blank stands in for an unknown place').not.toBe('')
      expect(value).not.toMatch(/^[—–-]$/)
    }
  })

  it('names the city and the country when the session carries them', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACED]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    expect(termsOf(row)).toContain(i18n.t('common:devices.placeTerm'))
    expect(within(row).getByText(`Amsterdam, ${NETHERLANDS}`)).toBeInTheDocument()
  })

  it('sets the flag after the place it belongs to, not before it', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACED]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    const cell = within(row).getByText(`Amsterdam, ${NETHERLANDS}`).parentElement
    const parts = [...(cell?.children ?? [])]
    const text = parts.findIndex((node) => (node.textContent ?? '').includes('Amsterdam'))
    const flag = parts.findIndex(
      (node) => node.querySelector('img') !== null || node.tagName === 'IMG',
    )

    expect(text, 'the place text is missing').toBeGreaterThanOrEqual(0)
    expect(flag, 'the flag is missing').toBeGreaterThanOrEqual(0)
    expect(flag, 'the flag trails the place it marks').toBeGreaterThan(text)
  })

  it('spells the country as a name, never as the bare two letters', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACED]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    const values = [...row.querySelectorAll('dd')].map((node) => node.textContent ?? '')
    expect(values).not.toContain('Amsterdam, NL')
    expect(values.some((value) => value.includes(NETHERLANDS))).toBe(true)
  })

  it('puts the place immediately above the address it explains', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(deviceSessionsQueryKey, listBody([PLACED]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    const terms = termsOf(row)
    const place = terms.indexOf(i18n.t('common:devices.placeTerm'))
    const ip = terms.indexOf(i18n.t('common:devices.ipTerm'))

    expect(place, 'the place row is missing').toBeGreaterThanOrEqual(0)
    expect(ip, 'the address row is missing').toBeGreaterThanOrEqual(0)
    expect(place, 'the place belongs directly above the address').toBe(ip - 1)
  })

  it('shows a place that knows only the country', async () => {
    const { queryClient } = renderWithProviders(<DeviceList />)
    queryClient.setQueryData(
      deviceSessionsQueryKey,
      listBody([{ ...PLACED, city: undefined, country_code: 'NL' }]),
    )

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const row = screen.getAllByRole('listitem')[0]
    if (!row) throw new Error('the session row is missing')

    expect(termsOf(row)).toContain(i18n.t('common:devices.placeTerm'))
    expect(within(row).getByText(NETHERLANDS)).toBeInTheDocument()
  })
})
