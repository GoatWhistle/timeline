import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { EVENT_STATE_TEXT } from '@/entities/event/event-state-mark/event-state-sign'
import { CatalogTable } from '@/features/catalog/catalog-table'
import { AdminTable } from '@/features/event-list/admin/admin-table'
import type { CatalogEvent, EventResponse } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

const active = {
  id: 'e1',
  title: 'Live Hackathon',
  kind: 'HACKATHON',
  format: 'ONLINE',
  origin: 'RU',
  effective_format: 'ONLINE',
  offline_stages: [],
  start_at: '2026-09-01T00:00:00Z',
  end_at: '2026-10-01T00:00:00Z',
  state: 'ACTIVE',
  tracks: [],
  joined: false,
} as CatalogEvent

function expectPlainActive(container: HTMLElement) {
  const cell = container.querySelector('tbody [data-state-cell]') as HTMLElement
  expect(cell.textContent).toBe(i18n.t('event:state.ACTIVE'))
  expect(cell.className, 'the active state lost its green').toContain(EVENT_STATE_TEXT.ACTIVE)
  expect(container.querySelector('tbody [data-event-state-sign]'), 'a dot came back').toBeNull()
  expect(cell.closest('td')?.querySelector('svg')).toBeNull()
}

describe('the state column is a coloured word and nothing more', () => {
  it('writes an active event in green without a dot in the catalog', () => {
    const { container } = renderWithProviders(
      <CatalogTable
        items={[active]}
        columns={['title', 'state']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={vi.fn()}
        onSort={vi.fn()}
      />,
    )
    expect(screen.getByText(i18n.t('event:state.ACTIVE'))).toBeTruthy()
    expectPlainActive(container)
  })

  it('writes it the same way in the admin table', () => {
    const { container } = renderWithProviders(
      <AdminTable
        items={[active as unknown as EventResponse]}
        columns={['title', 'state']}
        selected={null}
        sort="start_at"
        order="asc"
        onSelect={vi.fn()}
        onSort={vi.fn()}
      />,
    )
    expectPlainActive(container)
  })
})
