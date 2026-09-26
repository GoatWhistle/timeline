import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { durationDays } from '@/entities/catalog/catalog.facts'
import { resolveAdminColumns } from '@/entities/catalog/catalog.views'
import { CatalogCard } from '@/entities/catalog/catalog-card'
import type { CatalogEvent } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const week = {
  id: 'ev_week',
  title: 'Northwind Agent Harness Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  effective_format: 'ONLINE',
  origin: 'WORLD',
  start_at: '2026-08-24T00:00:00Z',
  end_at: '2026-08-30T23:59:00Z',
  state: 'FINISHED',
  tracks: [],
  joined: false,
  offline_stages: [],
} as unknown as CatalogEvent

describe('an event lasts as many days as it touches, the same count the server exports', () => {
  it('counts every started day and never less than one', () => {
    expect(durationDays('2026-08-24T00:00:00Z', '2026-08-30T23:59:00Z')).toBe(7)
    expect(durationDays('2026-08-24T18:00:00Z', '2026-08-24T21:00:00Z')).toBe(1)
    expect(durationDays('2026-08-24T00:00:00Z', '2026-08-26T00:00:00Z')).toBe(2)
    expect(durationDays('2026-08-24T00:00:00Z', '2026-08-26T00:01:00Z')).toBe(3)
    expect(durationDays('2026-08-26T00:00:00Z', '2026-08-24T00:00:00Z')).toBe(1)
  })

  it('shows the length on a tile beside its dates', () => {
    renderWithProviders(<CatalogCard event={week} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('7 days')).toBeTruthy()
  })

  it('turns a saved admin period column into start, end and duration too', () => {
    const upgraded = resolveAdminColumns(['title', 'period', 'state'])
    expect(upgraded).toEqual(expect.arrayContaining(['start', 'end', 'duration', 'state']))
    expect(upgraded as string[]).not.toContain('period')
  })
})
