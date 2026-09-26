import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CARD_CORNER, CatalogCard } from '@/entities/catalog/catalog-card'
import { AdminCards } from '@/features/event-list/admin/admin-cards'
import type { CatalogEvent, EventResponse } from '@/shared/api/types.gen'
import { i18n, i18nReady } from '@/shared/i18n/config'

const shared = {
  id: 'ev_one',
  title: 'Northwind Agent Harness Hackathon',
  kind: 'HACKATHON' as const,
  format: 'ONLINE' as const,
  effective_format: 'ONLINE' as const,
  origin: 'WORLD' as const,
  start_at: '2026-10-01T00:00:00Z',
  end_at: '2026-10-03T00:00:00Z',
  tracks: [],
  organizer: 'Northwind Labs',
}

const published = {
  ...shared,
  state: 'UPCOMING',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-05T17:25:00Z',
  published_at: '2026-09-05T12:00:00Z',
} as unknown as EventResponse

const draft = {
  ...published,
  id: 'ev_two',
  state: 'UNPUBLISHED',
  published_at: undefined,
} as unknown as EventResponse

const doomed = {
  ...published,
  id: 'ev_three',
  state: 'ARCHIVED',
  archived_at: '2026-09-10T00:00:00Z',
  purge_scheduled_at: '2026-10-10T00:00:00Z',
} as unknown as EventResponse

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

function adminTile(event: EventResponse) {
  renderWithProviders(<AdminCards items={[event]} selected={null} onSelect={vi.fn()} />)
  return screen.getByRole('option')
}

function titleOf(tile: HTMLElement) {
  return within(tile).getByText(shared.title)
}

describe('an admin tile is the catalog tile with the admin facts added', () => {
  it('sets the title in exactly the type the reader sees in the catalog', () => {
    const catalogTitle = (() => {
      const { unmount } = renderWithProviders(
        <CatalogCard
          event={
            { ...shared, state: 'UPCOMING', joined: false, offline_stages: [] } as CatalogEvent
          }
          selected={false}
          onSelect={vi.fn()}
        />,
      )
      const classes = titleOf(screen.getByRole('option')).className
      unmount()
      return classes
    })()

    expect(titleOf(adminTile(published)).className).toBe(catalogTitle)
  })

  it('keeps the organizer line the catalog shows', () => {
    expect(within(adminTile(published)).getByText('Northwind Labs')).toBeTruthy()
  })

  it('adds the state, when it went out and when it last changed', () => {
    const facts = adminTile(published).querySelector('[data-admin-facts]') as HTMLElement
    expect(facts).not.toBeNull()
    expect(facts.textContent).toMatch(/Published /)
    expect(facts.textContent).toMatch(/Updated /)
  })

  it('calls an unpublished event a draft instead of inventing a date', () => {
    const facts = adminTile(draft).querySelector('[data-admin-facts]') as HTMLElement
    expect(facts.textContent).toContain('Draft')
    expect(facts.textContent).not.toMatch(/Published /)
  })

  it('warns when an archived event is due to be deleted, and only then', () => {
    const doomedFacts = adminTile(doomed).querySelector('[data-admin-facts]') as HTMLElement
    expect(doomedFacts.textContent).toMatch(/Deleted on /)
  })

  it('stays quiet about deletion for an event nobody scheduled for it', () => {
    const facts = adminTile(published).querySelector('[data-admin-facts]') as HTMLElement
    expect(facts.textContent).not.toMatch(/Deleted on /)
  })

  it('puts the moderation menu in the same corner chip the catalog uses for the website', () => {
    renderWithProviders(<AdminCards items={[published]} selected={null} onSelect={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: /moderat/i })
    for (const token of CARD_CORNER.split(' ')) expect(trigger.className).toContain(token)
  })
})
