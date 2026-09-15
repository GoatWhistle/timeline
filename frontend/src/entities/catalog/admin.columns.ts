import { useCallback, useState } from 'react'
import { type AdminColumn, DEFAULT_ADMIN_COLUMNS, resolveAdminColumns } from './catalog.views'

export const ADMIN_COLUMNS_STORAGE_KEY = 'timeline-admin-event-columns'

export function readStoredAdminColumns(): AdminColumn[] {
  try {
    const raw = localStorage.getItem(ADMIN_COLUMNS_STORAGE_KEY)
    if (raw === null) return DEFAULT_ADMIN_COLUMNS
    return resolveAdminColumns(JSON.parse(raw))
  } catch {
    return DEFAULT_ADMIN_COLUMNS
  }
}

export function writeStoredAdminColumns(columns: AdminColumn[]): void {
  try {
    localStorage.setItem(ADMIN_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    return
  }
}

export function toggleAdminColumn(columns: AdminColumn[], column: AdminColumn): AdminColumn[] {
  if (column === 'title') return columns
  const next = columns.includes(column)
    ? columns.filter((item) => item !== column)
    : [...columns, column]
  return resolveAdminColumns(next)
}

export function useAdminColumns() {
  const [columns, setColumns] = useState<AdminColumn[]>(readStoredAdminColumns)

  const toggle = useCallback((column: AdminColumn) => {
    setColumns((current) => {
      const next = toggleAdminColumn(current, column)
      writeStoredAdminColumns(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(ADMIN_COLUMNS_STORAGE_KEY)
    } catch {
      setColumns(DEFAULT_ADMIN_COLUMNS)
      return
    }
    setColumns(DEFAULT_ADMIN_COLUMNS)
  }, [])

  return { columns, toggle, reset }
}
