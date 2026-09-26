import { type CSSProperties, useCallback, useState } from 'react'

export const MIN_COLUMN_WIDTH = 64

type Widths = Record<string, number>

function readWidths(storageKey: string): Widths {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= MIN_COLUMN_WIDTH,
      ),
    )
  } catch {
    return {}
  }
}

function writeWidths(storageKey: string, widths: Widths): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths))
  } catch {
    return
  }
}

export function useColumnWidths<C extends string>({
  storageKey,
  columns,
  base,
  flexible,
  trailing = 0,
}: {
  storageKey: string
  columns: readonly C[]
  base: Record<C, number>
  flexible: C
  trailing?: number
}) {
  const [saved, setSaved] = useState<Widths>(() => readWidths(storageKey))

  const widthOf = (column: C): number => saved[column] ?? base[column]
  const total = columns.reduce((sum, column) => sum + widthOf(column), trailing)

  const resize = useCallback(
    (column: C, width: number) => {
      setSaved((current) => {
        const next = { ...current, [column]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) }
        writeWidths(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const reset = useCallback(
    (column: C) => {
      setSaved((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([key]) => key !== column))
        writeWidths(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const tableStyle: CSSProperties = { width: '100%', minWidth: total }

  return {
    widthOf,
    colWidth: (column: C) => (column === flexible ? undefined : widthOf(column)),
    tableStyle,
    resize,
    reset,
  }
}
