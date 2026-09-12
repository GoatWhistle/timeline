import { useCallback, useEffect, useMemo, useRef } from 'react'
import { catalogEntry } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function step(ids: string[], current: string | null, delta: number): string | null {
  if (ids.length === 0) return null
  const first = ids[0] ?? null
  if (current === null) return delta > 0 ? first : (ids[ids.length - 1] ?? null)
  const index = ids.indexOf(current)
  if (index === -1) return first
  const next = index + delta
  if (next < 0 || next >= ids.length) return current
  return ids[next] ?? current
}

const FOCUSABLE = 'button, a[href], [tabindex]:not([tabindex="-1"])'

function focusTargetOf(row: HTMLElement): HTMLElement | null {
  if (row.tabIndex >= 0) return row
  return row.querySelector<HTMLElement>(FOCUSABLE)
}

export function useListNavigation({
  ids,
  selected,
  onSelect,
  onClear,
  scopeId = 'list',
  rowAttr = 'data-event-row',
}: {
  ids: string[]
  selected: string | null
  onSelect: (id: string) => void
  onClear?: () => void
  scopeId?: string
  rowAttr?: string
}) {
  const keyboardMove = useRef(false)

  const move = useCallback(
    (delta: number) => {
      const next = step(ids, selected, delta)
      if (!next) return
      keyboardMove.current = true
      onSelect(next)
    },
    [ids, selected, onSelect],
  )

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      { ...catalogEntry('list-next'), run: () => move(1) },
      { ...catalogEntry('list-previous'), run: () => move(-1) },
      {
        ...catalogEntry('list-clear'),
        when: () => selected !== null,
        run: () => onClear?.(),
      },
    ],
    [move, selected, onClear],
  )

  useShortcutScope(scopeId, shortcuts)

  useEffect(() => {
    const fromKeyboard = keyboardMove.current
    keyboardMove.current = false
    if (!selected) return
    const row = document.querySelector<HTMLElement>(`[${rowAttr}="${selected}"]`)
    if (!row) return
    row.scrollIntoView({ block: 'nearest' })
    const active = document.activeElement
    const inList = active instanceof HTMLElement && active.closest(`[${rowAttr}]`) !== null
    if (!fromKeyboard && !inList) return
    const target = focusTargetOf(row)
    if (target && target !== active) target.focus({ preventScroll: true })
  }, [selected, rowAttr])
}
