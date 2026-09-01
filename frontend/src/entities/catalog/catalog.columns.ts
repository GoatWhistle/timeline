import { useCallback, useState } from 'react'
import {
  CATALOG_LOCKED_COLUMN,
  type CatalogColumn,
  DEFAULT_CATALOG_COLUMNS,
  resolveColumns,
} from './catalog.views'

export const CATALOG_COLUMNS_STORAGE_KEY = 'timeline-catalog-columns'

export function readStoredColumns(): CatalogColumn[] {
  try {
    const raw = localStorage.getItem(CATALOG_COLUMNS_STORAGE_KEY)
    if (raw === null) return DEFAULT_CATALOG_COLUMNS
    return resolveColumns(JSON.parse(raw))
  } catch {
    return DEFAULT_CATALOG_COLUMNS
  }
}

export function writeStoredColumns(columns: CatalogColumn[]): void {
  try {
    localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    return
  }
}

export function clearStoredColumns(): void {
  try {
    localStorage.removeItem(CATALOG_COLUMNS_STORAGE_KEY)
  } catch {
    return
  }
}

export function toggleColumn(columns: CatalogColumn[], column: CatalogColumn): CatalogColumn[] {
  if (column === CATALOG_LOCKED_COLUMN) return columns
  const next = columns.includes(column)
    ? columns.filter((item) => item !== column)
    : [...columns, column]
  return resolveColumns(next)
}

export function useCatalogColumns() {
  const [columns, setColumns] = useState<CatalogColumn[]>(readStoredColumns)

  const toggle = useCallback((column: CatalogColumn) => {
    setColumns((current) => {
      const next = toggleColumn(current, column)
      writeStoredColumns(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    clearStoredColumns()
    setColumns(DEFAULT_CATALOG_COLUMNS)
  }, [])

  return { columns, toggle, reset }
}
