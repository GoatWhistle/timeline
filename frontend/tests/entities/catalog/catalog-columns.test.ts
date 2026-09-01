import { beforeEach, describe, expect, it } from 'vitest'
import {
  CATALOG_COLUMNS_STORAGE_KEY,
  readStoredColumns,
  toggleColumn,
  writeStoredColumns,
} from '@/entities/catalog/catalog.columns'
import {
  CATALOG_LOCKED_COLUMN,
  DEFAULT_CATALOG_COLUMNS,
  resolveColumns,
} from '@/entities/catalog/catalog.views'

describe('resolveColumns', () => {
  it('keeps only known columns, in the canonical order', () => {
    expect(resolveColumns(['state', 'title', 'prize'])).toEqual(['title', 'prize', 'state'])
  })

  it('drops unknown columns rather than rendering blank ones', () => {
    expect(resolveColumns(['title', 'participants', 'venue'])).toEqual(['title'])
  })

  it('falls back to the default for anything unusable', () => {
    expect(resolveColumns(null)).toEqual(DEFAULT_CATALOG_COLUMNS)
    expect(resolveColumns([])).toEqual(DEFAULT_CATALOG_COLUMNS)
    expect(resolveColumns('title')).toEqual(DEFAULT_CATALOG_COLUMNS)
  })

  it('always keeps the locked title column', () => {
    expect(resolveColumns(['prize'])).toContain(CATALOG_LOCKED_COLUMN)
  })
})

describe('toggleColumn', () => {
  it('adds and removes an optional column', () => {
    const added = toggleColumn(['title', 'period'], 'prize')
    expect(added).toContain('prize')
    expect(toggleColumn(added, 'prize')).not.toContain('prize')
  })

  it('refuses to remove the locked title column', () => {
    const columns = ['title', 'period'] as const
    expect(toggleColumn([...columns], CATALOG_LOCKED_COLUMN)).toEqual([...columns])
  })
})

describe('stored columns', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved choice', () => {
    writeStoredColumns(['title', 'prize'])
    expect(readStoredColumns()).toEqual(['title', 'prize'])
  })

  it('falls back to the default when nothing is stored', () => {
    expect(readStoredColumns()).toEqual(DEFAULT_CATALOG_COLUMNS)
  })

  it('survives corrupted storage', () => {
    localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, '{not json')
    expect(readStoredColumns()).toEqual(DEFAULT_CATALOG_COLUMNS)
  })
})
