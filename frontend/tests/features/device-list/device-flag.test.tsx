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

const IN_AMSTERDAM: SessionResponse = {
  ...PLACELESS,
  id: '8c2b0d31-1a44-4f21-a0e7-5b8d3c9f7a12',
  current: false,
  ip: '203.0.113.7',
  country_code: 'NL',
  city: 'Amsterdam',
}

function listBody(items: SessionResponse[]) {
  return { items, total: items.length }
}

async function firstRow(items: SessionResponse[]): Promise<HTMLElement> {
  const { queryClient } = renderWithProviders(<DeviceList />)
  queryClient.setQueryData(deviceSessionsQueryKey, listBody(items))

  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(items.length))

  const row = screen.getAllByRole('listitem')[0]
  if (!row) throw new Error('the session row is missing')
  return row
}

function flagIn(row: HTMLElement): HTMLImageElement | null {
  return row.querySelector<HTMLImageElement>('img[data-country-flag]')
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('the flag beside the place of a session', () => {
  it('uses fixtures that the contract accepts', () => {
    assertMatchesContract('/me/sessions', 'get', 200, listBody([PLACELESS, IN_AMSTERDAM]))
  })

  it('draws the flag of the very country the session reports, not merely some flag', async () => {
    const row = await firstRow([IN_AMSTERDAM])
    const flag = flagIn(row)

    expect(flag, 'a session in a known country carries a flag').not.toBeNull()
    expect(flag?.getAttribute('data-country-flag')).toBe('nl')
    expect(flag?.getAttribute('src')).toBe('/flags/nl.svg')
  })

  it('draws a different country a different flag, so the mark is never a constant', async () => {
    const row = await firstRow([{ ...IN_AMSTERDAM, country_code: 'FR', city: 'Paris' }])
    const flag = flagIn(row)

    expect(flag?.getAttribute('data-country-flag')).toBe('fr')
    expect(flag?.getAttribute('src')).toBe('/flags/fr.svg')
  })

  it('leaves the row whole and flagless when the session reports no country', async () => {
    const row = await firstRow([PLACELESS])

    expect(flagIn(row), 'a placeless session must carry no flag').toBeNull()
    expect(row.querySelectorAll('img[data-country-flag]')).toHaveLength(0)
    expect(
      within(row).getByText(PLACELESS.ip ?? ''),
      'the rest of the row survives a missing flag',
    ).toBeInTheDocument()
  })

  it('shows the place but no flag when the session knows a city and no country', async () => {
    const row = await firstRow([{ ...IN_AMSTERDAM, country_code: undefined, city: 'Amsterdam' }])

    expect(
      within(row).getByText('Amsterdam'),
      'the place the session does know is still spelled out',
    ).toBeInTheDocument()
    expect(
      flagIn(row),
      'a session with no country code must not borrow some other country flag',
    ).toBeNull()
  })

  it('shows no flag for a country code the vendored set does not carry', async () => {
    const row = await firstRow([{ ...IN_AMSTERDAM, country_code: 'ZZ', city: 'Nowhere' }])

    expect(flagIn(row), 'an unknown code must not invent a flag').toBeNull()
    expect(within(row).getByText(/Nowhere/)).toBeInTheDocument()
  })

  it('keeps the flag out of the accessible name, since the country is already spelled out', async () => {
    const row = await firstRow([IN_AMSTERDAM])
    const flag = flagIn(row)

    expect(flag?.getAttribute('alt')).toBe('')
    expect(flag?.getAttribute('aria-hidden')).toBe('true')
  })
})
