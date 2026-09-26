import type { AdminColumn, CatalogColumn } from './catalog.views'

export const EVENT_COLUMN_WIDTH: Record<CatalogColumn | AdminColumn, number> = {
  title: 240,
  kind: 110,
  format: 120,
  place: 170,
  start: 130,
  end: 130,
  duration: 110,
  prize: 120,
  organizer: 170,
  track: 170,
  tracks: 130,
  teamMin: 110,
  teamMax: 110,
  origin: 100,
  state: 110,
  participation: 150,
  created: 170,
  updated: 170,
  published: 170,
  cover: 120,
}

export const CATALOG_WIDTHS_STORAGE_KEY = 'timeline-catalog-widths'
export const ADMIN_WIDTHS_STORAGE_KEY = 'timeline-admin-widths'
export const MODERATE_COLUMN_WIDTH = 48
