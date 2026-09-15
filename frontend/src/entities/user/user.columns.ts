import { useCallback, useState } from 'react'
import {
  DEFAULT_USER_COLUMNS,
  resolveUserColumns,
  USER_LOCKED_COLUMN,
  type UserColumn,
} from './user.views'

export const USER_COLUMNS_STORAGE_KEY = 'timeline-admin-user-columns'

export function readStoredUserColumns(): UserColumn[] {
  try {
    const raw = localStorage.getItem(USER_COLUMNS_STORAGE_KEY)
    if (raw === null) return DEFAULT_USER_COLUMNS
    return resolveUserColumns(JSON.parse(raw))
  } catch {
    return DEFAULT_USER_COLUMNS
  }
}

export function writeStoredUserColumns(columns: UserColumn[]): void {
  try {
    localStorage.setItem(USER_COLUMNS_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    return
  }
}

export function toggleUserColumn(columns: UserColumn[], column: UserColumn): UserColumn[] {
  if (column === USER_LOCKED_COLUMN) return columns
  const next = columns.includes(column)
    ? columns.filter((item) => item !== column)
    : [...columns, column]
  return resolveUserColumns(next)
}

export function useUserColumns() {
  const [columns, setColumns] = useState<UserColumn[]>(readStoredUserColumns)

  const toggle = useCallback((column: UserColumn) => {
    setColumns((current) => {
      const next = toggleUserColumn(current, column)
      writeStoredUserColumns(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(USER_COLUMNS_STORAGE_KEY)
    } catch {
      setColumns(DEFAULT_USER_COLUMNS)
      return
    }
    setColumns(DEFAULT_USER_COLUMNS)
  }, [])

  return { columns, toggle, reset }
}
