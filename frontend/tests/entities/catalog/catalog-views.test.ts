import { describe, expect, it } from 'vitest'
import {
  CATALOG_SCOPES,
  CATALOG_VIEW_KEYS,
  CATALOG_VIEWS,
  resolveLayout,
} from '@/entities/catalog/catalog.views'
import { activeView, isViewActive, viewSearch } from '@/shared/navigation/saved-view'

describe('catalog scope', () => {
  it('offers exactly the All, Russia and World views', () => {
    expect(CATALOG_SCOPES).toEqual(['', 'RU', 'WORLD'])
  })

  it('sends no origin parameter for the All view', () => {
    const all = CATALOG_VIEWS.find((view) => view.id === 'catalog-all')
    expect(all?.params.origin).toBeUndefined()
  })
})

describe('catalog layout', () => {
  it('falls back to the list for anything but grid', () => {
    expect(resolveLayout('grid')).toBe('grid')
    expect(resolveLayout('list')).toBe('list')
    expect(resolveLayout('')).toBe('list')
    expect(resolveLayout('nonsense')).toBe('list')
  })
})

describe('catalog views in the URL', () => {
  it('activates the view whose parameters match the search string', () => {
    const offline = CATALOG_VIEWS.find((view) => view.id === 'catalog-offline')
    if (!offline) throw new Error('the offline view is missing')

    expect(isViewActive(offline, '?format=OFFLINE', CATALOG_VIEW_KEYS)).toBe(true)
    expect(isViewActive(offline, '?format=ONLINE', CATALOG_VIEW_KEYS)).toBe(false)
    expect(isViewActive(offline, '', CATALOG_VIEW_KEYS)).toBe(false)
  })

  it('ignores parameters that are not part of the view, such as the layout', () => {
    const upcoming = CATALOG_VIEWS.find((view) => view.id === 'catalog-upcoming')
    if (!upcoming) throw new Error('the upcoming view is missing')

    expect(isViewActive(upcoming, '?state=UPCOMING&layout=grid&page=3', CATALOG_VIEW_KEYS)).toBe(
      true,
    )
  })

  it('resolves the All view only when no view parameter is set', () => {
    expect(activeView(CATALOG_VIEWS, '?layout=grid', CATALOG_VIEW_KEYS)?.id).toBe('catalog-all')
    expect(activeView(CATALOG_VIEWS, '?kind=MEETUP', CATALOG_VIEW_KEYS)?.id).toBe('catalog-meetups')
  })

  it('builds the search string of a view', () => {
    const meetups = CATALOG_VIEWS.find((view) => view.id === 'catalog-meetups')
    if (!meetups) throw new Error('the meetups view is missing')

    expect(viewSearch(meetups)).toBe('?kind=MEETUP')
  })
})
